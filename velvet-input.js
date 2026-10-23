'use strict';
function createNativeDualVelvet(base,profile,api){
 const sigs=[[profile.input,[0x48,0x8b,0xc4,0x44,0x88,0x48,0x20,0x55,0x56,0x57,0x41,0x54,0x41,0x55,0x41,0x56]],
 [profile.make,[0x40,0x57,0x48,0x83,0xec,0x30,0x48,0xc7,0x44,0x24,0x20,0xfe]],
 [profile.enqueue,[0x4c,0x89,0x4c,0x24,0x20,0x44,0x89,0x44,0x24,0x18,0x55,0x53]]];
 function verify(){
  for(const[rva,bytes]of sigs)for(let i=0;i<bytes.length;i++)if(base.add(rva+i).readU8()!==bytes[i])throw Error('Unsupported Velvet input/command '+rva.toString(16));
  const expected={slot87:328,slot88:329,slot89:330,superbar:66,supermeterperlevel:68,alpha:204,slot11:252},seen=new Set();
  const head=base.add(profile.registry+8).readPointer();if(head.isNull())throw Error('Missing slot registry');
  let node=head.readPointer();
  for(let i=0;i<2048&&!node.equals(head);i++){
   const name=api.str(node.add(0x10)).toLowerCase();
   if(Object.prototype.hasOwnProperty.call(expected,name)){
    if(node.add(0x30).readU8()!==1||node.add(0x34).readU16()!==expected[name])throw Error('Slot layout mismatch: '+name);
    seen.add(name);
   }node=node.readPointer();
  }
  if(seen.size!==7)throw Error('Cannot verify native meter/control/alpha/level2 slots');
 }
 verify();
 const make=new NativeFunction(base.add(profile.make),'pointer',['pointer'],{scheduling:'exclusive'});
 const enqueue=new NativeFunction(base.add(profile.enqueue),'void',['pointer','pointer','int','pointer'],{scheduling:'exclusive'});
 const commands=new Map();let count=0;
 for(const name of ['Boss_Install','Boss_IceL','Boss_IceM','Boss_IceH','IcePrison']){
  const text=Memory.alloc(32);text.writeByteArray(new Uint8Array(32));text.writeUtf8String(name);text.add(16).writeU64(name.length);text.add(24).writeU64(15);commands.set(name,text);
 }
 function validateStates(data){
  const begin=data.add(0xd88).readPointer(),end=data.add(0xd90).readPointer(),n=end.sub(begin).toInt32()/8;
  if(!Number.isInteger(n)||n<1||n>4096)throw Error('Invalid Velvet state table');
  const found=new Set();for(let i=0;i<n;i++){const p=begin.add(i*8).readPointer();if(!p.isNull())found.add(api.str(p.add(0x10)));}
  for(const name of [...commands.keys(),'Boss_Wind_Idle'])if(!found.has(name))throw Error('Missing Velvet state '+name);
 }
 function writable(p,n){
  const range=Process.findRangeByAddress(p);
  if(!range||!range.protection.includes('w')||p.add(n).compare(range.base.add(range.size))>0)throw Error('Unwritable Velvet control');
 }
 function rows(scene){const snap=api.inspect(scene);return snap?snap.players.filter(r=>r.name==='Velvet'):[];}
 function nativeState(row){return api.str(row.actor.add(0xc58).readPointer().add(0x10));}
 function checkClaim(row){
  if(row.actor.add(0x540).readFloat()!==VELVET_SLOT_MAGIC)throw Error('Velvet reserved slot overwritten; restart both games');
 }
 function reset(scene){
  const players=rows(scene);
  // Test-only reservation. Reject pre-existing use instead of silently clobbering it.
  for(const row of players){
   const p=row.actor.add(0x540),tag=p.readFloat(),c=p.add(4).readFloat(),m=p.add(8).readFloat();
   if(tag!==0&&tag!==VELVET_SLOT_MAGIC)throw Error('Velvet slot87 already in use');
   if(tag===0&&(c!==0||m!==0))throw Error('Velvet slot88/89 already in use');
   writable(p,12);validateStates(row.data);
  }
  for(const row of players){row.actor.add(0x540).writeFloat(VELVET_SLOT_MAGIC);row.actor.add(0x544).writeFloat(0);row.actor.add(0x548).writeFloat(0);}
 }
 function finishTick(scene){
  if(!api.active()||!api.initialized(scene))return;
  for(const row of rows(scene)){
   checkClaim(row);const c=velvetControlDecode(row.actor.add(0x544).readFloat()),state=nativeState(row);
   if(c.exiting&&!/^Boss_/.test(state)){
    // One native bar was staged only to pay IcePrison's native cost. Drain all
    // remaining/staged energy at the simulation boundary, including a zero-bar exit.
    if(!c.awaitingStart){row.actor.add(0x128).writeFloat(0);c.awaitingStart=true;c.remaining=0;row.actor.add(0x544).writeFloat(velvetControlEncode(c));}
    // Do not fight native fade animation during the super. Restore once after
    // the exit animation has finished (or been interrupted), never every frame.
    if(state!=='IcePrison'){
     writable(row.actor.add(0x350),4);row.actor.add(0x350).writeFloat(1);row.actor.add(0x544).writeFloat(0);
     api.emit('velvet_exit_settled',{side:row.side,state,meter:0,alpha:row.actor.add(0x350).readFloat()});
    }
   }
  }
 }
 return {verify,reset,finishTick,status(){return {velvetCommands:count};},install(){verify();return Interceptor.attach(base.add(profile.input),{
  onEnter(args){this.command=null;this.modeTimer=null;this.oleander=null;try{
   if(!api.active()||this.returnAddress.sub(base).toString()!=='0x'+profile.inputReturn.toString(16)||args[1].isNull())return;
   const scene=api.current();if(!api.initialized(scene))return;
   if(api.oleander){const snap=api.inspect(scene),uni=snap&&snap.players.find(r=>r.name==='Uni'&&r.actor.equals(args[0]));if(uni){api.oleander.evaluate(uni,scene,args,this);return;}}
   const row=rows(scene).find(r=>r.actor.equals(args[0]));if(!row)return;
   checkClaim(row);
   const input=Array.from(new Uint8Array(args[1].readByteArray(8))),state=nativeState(row);
   const plan=velvetBalanceStep({control:row.actor.add(0x544).readFloat(),tracker:row.actor.add(0x548).readFloat(),
    state,input,meter:row.actor.add(0x128).readFloat(),unit:row.actor.add(0x130).readFloat(),hp:row.hp});
   let manager=null;
   if(plan.action){manager=scene.add(0x2f8).readPointer();if(manager.isNull())throw Error('Missing command manager');validateStates(row.data);}
   row.actor.add(0x544).writeFloat(plan.control);row.actor.add(0x548).writeFloat(plan.tracker);
   if(plan.modeTimer!==null)this.modeTimer={scene,actor:row.actor,data:row.data,side:row.side,value:plan.modeTimer,state};
   if(plan.consume){
    const copy=Memory.alloc(0x50);Memory.copy(copy,args[1],0x50);
    for(let i=3;i<=30;i++)copy.add(i).writeU8(4);
    this.inputCopy=copy;args[1]=copy;
   }
   if(plan.action)this.command={scene,actor:row.actor,data:row.data,side:row.side,action:plan.action,manager,plan};
  }catch(e){api.fail(e);}},
  onLeave(){if(this.oleander){try{api.oleander.afterInput(this);}catch(e){api.fail(e);}return;}
   const c=this.command,f=this.modeTimer;if(!api.active()||(!c&&!f))return;try{
   if(f){
    if(!f.scene.equals(api.current())||!f.actor.add(0xc50).readPointer().equals(f.data))throw Error('Velvet generation changed before countdown initialization');
    writable(f.actor.add(0x410),4);f.actor.add(0x410).writeFloat(f.value);
    api.emit('velvet_countdown_initialized',{side:f.side,state:f.state,countdownFrames:f.value,source:'native_install_acknowledged'});
   }
   if(!c)return;
   if(!c.scene.equals(api.current())||!c.actor.add(0xc50).readPointer().equals(c.data))throw Error('Velvet generation changed during input');
   const closure=make(commands.get(c.action));if(closure.isNull())throw Error('Cannot create Velvet command');
   const fn=Memory.alloc(0x40);fn.writeByteArray(new Uint8Array(0x40));fn.add(0x38).writePointer(closure);
   if(c.plan.meter!==null)c.actor.add(0x128).writeFloat(c.plan.meter);
   // Retain the observed native countdown bar only. This is not a transplanted
   // level-2 freeze effect. Boss_Install clears SLOT11, so initialize after entry.
   // Never write opponent FRAMESKIP or hit state, and never spawn freeze effects.
   enqueue(c.manager,c.actor,0,fn);count++;
   if(count<=32||count%100===0)api.emit('velvet_command',{side:c.side,action:c.action,reason:c.plan.reason,count,
    meter:c.actor.add(0x128).readFloat(),control:c.actor.add(0x544).readFloat(),countdownFrames:c.actor.add(0x410).readFloat(),source:'synchronized_native_input'});
  }catch(e){api.fail(e);}}
 });}};
}
