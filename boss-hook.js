'use strict';
const base=ptr('__BASE__'),profile=__PROFILE__;
let enabled=false,faulted=false,initialized=null,changes=0,updates=0,resets=0,resetDepth=0,hooks=[];
function emit(event,extra={}){send({event,pid:Process.id,...extra});}
function str(p){const n=p.add(16).readU64().toNumber(),cap=p.add(24).readU64().toNumber();
 if(!Number.isSafeInteger(n)||n<0||n>128||cap<n)throw Error('Invalid string');
 return(cap>=16?p.readPointer():p).readUtf8String(n);}
function verify(){for(const [rva,bytes]of [[profile.reset,[0x4c,0x89,0x44,0x24,0x18,0x88,0x54,0x24,0x10,0x55,0x56,0x57,0x41,0x54,0x41,0x55]],
 [profile.update,[0x48,0x8b,0xc4,0x55,0x56,0x57,0x41,0x54,0x41,0x55,0x41,0x56,0x41,0x57]],
 [profile.flag,[0x8b,0xc2,0x4c,0x8b,0xd1,0x99,0x83,0xe2,0x1f,0x03,0xc2,0x44,0x8b,0xc8,0x83,0xe0]]])
 for(let i=0;i<bytes.length;i++)if(base.add(rva+i).readU8()!==bytes[i])throw Error('Signature mismatch/another tool: '+rva.toString(16));}
function current(){return base.add(profile.scene).readPointer();}
function inspect(scene){
 if(scene.isNull()||!scene.equals(current()))return null;
 const kind=scene.add(0x9e4).readU32(),mode=scene.add(0x2028).readPointer();
 const training=mode.isNull()?0:mode.add(0x1e8).readU8();
 if(!dualBossMode(kind,training))return {kind,training,players:[]};
 const rows=[];
 for(const [side,off]of [[1,0xaa8],[2,0xab4]]){
  const slot=scene.add(off).readS32();if(slot<(side===1?0:3)||slot>(side===1?2:5))throw Error('Invalid side slot '+side+':'+slot);
  const actor=scene.add(0xae0+slot*8).readPointer();if(actor.isNull())continue;
  const data=actor.add(0xc50).readPointer(),state=actor.add(0xc58).readPointer();if(data.isNull()||state.isNull())continue;
  const team=actor.add(0x88).readFloat();if(team!==side)throw Error('Side/team mismatch');
  rows.push({side,slot,actor,data,team,name:str(data.add(0xb40)),stateReady:true,hp:actor.add(0x120).readFloat(),flags:actor.add(0x590).readU32()});
 }
 return {kind,training,players:rows};
}
function apply(scene,stage){
 if(!enabled||faulted||initialized!==scene.toString())return;
 const snap=inspect(scene);if(!snap)return;
 // No host keyboard, timers, or external gameplay counters determine this rule.
 // Reapply at update entry, including resimulation entry; actual network rollback
 // coverage is an experimental hypothesis to be tested, not a compatibility claim.
 for(const row of snap.players){if(!dualBossEligible(row))continue;
  const after=dualBossFlags(row.flags);if(after===row.flags)continue;
  const field=row.actor.add(0x590),r=Process.findRangeByAddress(field);
  if(!r||!r.protection.includes('w')||field.add(4).compare(r.base.add(r.size))>0)throw Error('Unwritable flags');
  field.writeU32(after);if(field.readU32()!==after)throw Error('Flag27 readback mismatch');changes++;
  if(changes<=12||changes%100===0)emit('boss_applied',{stage,mode:snap.kind,side:row.side,slot:row.slot,name:row.name,before:row.flags,after,changes});
 }
}
function fail(error){enabled=false;faulted=true;emit('fault',{message:String(error),restartBoth:true});}
verify(); // No hooks are installed before all native signatures pass.
const oleander=createNativeDualOleander(base,profile,{str,current,inspect,fail,emit,
 active:()=>enabled&&!faulted&&resetDepth===0,initialized:s=>initialized===s.toString()});
const damage=createNativeDualOleanderDamage(base,profile,{str,current,inspect,fail,emit,
 active:()=>enabled&&!faulted&&resetDepth===0,initialized:s=>initialized===s.toString()});
const entryGuard=createNativeDualOleanderEntryGuard(base,profile,{str,current,inspect,fail,emit,
 active:()=>enabled&&!faulted&&resetDepth===0,initialized:s=>initialized===s.toString()});
const velvet=createNativeDualVelvet(base,profile,{str,current,inspect,fail,emit,
 oleander,
 active:()=>enabled&&!faulted&&resetDepth===0,initialized:s=>initialized===s.toString()});
rpc.exports={
 preflight(){verify();velvet.verify();oleander.verify();damage.verify();entryGuard.verify();const s=current();return {pid:Process.id,profile:profile.name,mode:s.isNull()?null:s.add(0x9e4).readU32(),enabled,faulted};},
 install(){if(hooks.length)throw Error('Already installed');verify();velvet.verify();
  try{
   hooks.push(Interceptor.attach(base.add(profile.reset),{onEnter(args){this.scene=args[0];resetDepth++;},onLeave(){try{
    if(!enabled||faulted||!this.scene.equals(current()))return;
    initialized=this.scene.toString();resets++;velvet.reset(this.scene);oleander.reset(this.scene);apply(this.scene,'reset');emit('round_reset',{resets,mode:this.scene.add(0x9e4).readU32()});
   }catch(e){fail(e);}finally{resetDepth=Math.max(0,resetDepth-1);}}}));
   hooks.push(velvet.install());
   hooks.push(damage.install());
   hooks.push(entryGuard.install());
   hooks.push(Interceptor.attach(base.add(profile.update),{onEnter(args){this.step=false;try{
    if(!enabled||faulted||resetDepth>0||(args[1].toInt32()&255)!==1||!args[0].equals(current()))return;
    this.step=true;this.scene=args[0];updates++;apply(args[0],'update');
   }catch(e){fail(e);}},onLeave(){if(this.step)try{velvet.finishTick(this.scene);}catch(e){fail(e);}}}));
  }catch(e){for(const h of hooks)h.detach();hooks=[];throw e;}
  return {installed:true,enabled:false};
 },
 enable(){if(faulted||hooks.length!==5)throw Error('Not ready');enabled=true;return {enabled:true,requiresNewRound:true};},
 status(){const s=current(),snap=inspect(s);return {enabled,faulted,initialized:initialized===s.toString(),changes,updates,resets,...velvet.status(),...oleander.status(),...damage.status(),...entryGuard.status(),mode:snap&&snap.kind,
  players:snap?snap.players.map(r=>({side:r.side,slot:r.slot,name:r.name,hp:r.hp,boss:(r.flags&BOSS_FLAG)!==0,
   state:str(r.actor.add(0xc58).readPointer().add(0x10)),meter:r.actor.add(0x128).readFloat(),meterPerLevel:r.actor.add(0x130).readFloat(),
   velvetControl:r.name==='Velvet'?r.actor.add(0x544).readFloat():null,
   velvetTracker:r.name==='Velvet'?r.actor.add(0x548).readFloat():null,
   countdownFrames:r.name==='Velvet'?r.actor.add(0x410).readFloat():null,
   magic:r.name==='Uni'?r.actor.add(0x134).readFloat():null,oleanderControl:r.name==='Uni'?r.actor.add(0x544).readFloat():null,
   drainRemainder:r.name==='Uni'?r.actor.add(0x548).readFloat():null,
   x:r.actor.add(0xc78).readS32(),y:r.actor.add(0xc7c).readS32()})):[]};},
 shutdown(){enabled=false;for(const h of hooks)h.detach();hooks=[];return {stopped:true,restartBoth:true};}
};
emit('prepared',{version:'0.5.1',profile:profile.name,enabled:false});
