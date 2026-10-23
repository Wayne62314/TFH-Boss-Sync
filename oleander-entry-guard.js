'use strict';
// Reject unaffordable ground/ordinary-jump 6A BEFORE native animation entry.
// Never edits synchronized input, shared move data, HP or current state.
function oleanderRejectGroundEntry({next,control,magic,magicUnit,hp}){
 if(!['Boss_6A','Boss_6A_Air'].includes(next)||hp<=0)return false;
 const {mode}=oleanderControlDecode(control);
 if(![magic,magicUnit].every(Number.isFinite)||magic<0||magicUnit<=0)throw Error('Invalid entry-guard magic');
 // Only 1/2/3 own a free flight exit. Mode 4 means the previous action was
 // accounted for, NOT permission to restart the same state for free.
 return ![1,2,3].includes(mode)&&magic<magicUnit;
}
function oleanderEntryPlan(info){
 const sixA=['Boss_6A','Boss_6A_Air'].includes(info.next),homing=info.next==='HomingSparkCast';
 const skip={reject:false,magic:null,control:null};
 if((!sixA&&!homing)||info.hp<=0)return skip;
 if(![info.magic,info.magicUnit].every(Number.isFinite)||info.magic<0||info.magicUnit<=0)throw Error('Invalid Oleander entry magic');
 const free=sixA&&[1,2,3].includes(oleanderControlDecode(info.control).mode);
 if(!free&&info.magic<info.magicUnit)return {...skip,reject:true};
 // All native 64+attack strengths share this resolved state. Pay per accepted
 // transition. Likewise EVERY 6A restart is new, even if its name is unchanged.
 // Consume a free-flight entitlement by recording mode 4 before state commit;
 // the ordinary input updater then knows not to pay for that SAME start again.
 return {reject:false,magic:free?null:info.magic-info.magicUnit,control:sixA?4:null,kind:sixA?'6a':'homing',free};
}
function createNativeDualOleanderEntryGuard(base,profile,api){
 const bytes=[0x48,0x85,0xd2,0x0f,0x84,0x18,0x01,0,0];
 function verify(){for(let i=0;i<bytes.length;i++)if(base.add(profile.entryGuard+i).readU8()!==bytes[i])throw Error('Oleander pre-transition signature mismatch');}
 verify();let blocked=0,casts=0,sixAStarts=0;
 function writable(field){const range=Process.findRangeByAddress(field);
  if(!range||!range.protection.includes('w')||field.add(4).compare(range.base.add(range.size))>0)throw Error('Unwritable Oleander entry field');}
 const reject=new NativeCallback((actor,next)=>{try{
  if(!api.active()||next.isNull())return 0;
  const scene=api.current();if(!api.initialized(scene))return 0;
  const snap=api.inspect(scene),row=snap&&snap.players.find(r=>r.actor.equals(actor));
  if(!row||row.name!=='Uni'||actor.add(0x540).readFloat()!==OLEANDER_SLOT_MAGIC)return 0;
  const state=api.str(next.add(0x10));
  const plan=oleanderEntryPlan({next:state,control:actor.add(0x544).readFloat(),
   magic:actor.add(0x134).readFloat(),magicUnit:actor.add(0x13c).readFloat(),hp:row.hp});
  if(plan.magic!==null)writable(actor.add(0x134));
  if(plan.control!==null)writable(actor.add(0x544));
  if(plan.magic!==null)actor.add(0x134).writeFloat(plan.magic);
  if(plan.control!==null)actor.add(0x544).writeFloat(plan.control);
  if(plan.kind==='homing'){
   casts++;
   if(casts<=24||casts%100===0)api.emit('oleander_homing_payment',{side:row.side,state,magic:plan.magic,casts});
  }
  if(plan.kind==='6a'){
   sixAStarts++;
   if(sixAStarts<=24||sixAStarts%100===0)api.emit('oleander_6a_entry',{side:row.side,state,free:plan.free,magic:actor.add(0x134).readFloat(),sixAStarts});
  }
  if(!plan.reject)return 0;
  blocked++;if(blocked<=16||blocked%100===0)api.emit('oleander_6a_entry_blocked',{side:row.side,state:api.str(next.add(0x10)),blocked});
  return 1;
 }catch(e){api.fail(e);return 0;}},'int',['pointer','pointer']);
 const nativeGate=new CModule(`#include <gum/guminterceptor.h>
extern int reject(gpointer actor, gpointer next);
static int named(const guint8 *state, const char *expected, guint64 length) {
 if(*(const guint64 *)(state+16)!=length) return 0;
 const char *name=*(const guint64 *)(state+24)>=16?*(const char * const *)state:(const char *)state;
 for(guint64 i=0;i<length;i++) if(name[i]!=expected[i]) return 0;
 return 1;
}
void onEnter(GumInvocationContext *ic) {
 GumCpuContext *c=ic->cpu_context;
 if(c->rdx==0) return;
 const guint8 *actor=(const guint8 *)c->rbx;
 // Only real 6A / Homing Spark entries reach JS. No per-frame JS dispatch for
 // unrelated native states, regardless of the actor's remaining magic.
 if(*(const float *)(actor+0x540)!=5196805.0f) return;
 const guint8 *state=(const guint8 *)c->rdx+0x10;
 if(!named(state,"Boss_6A",7) && !named(state,"Boss_6A_Air",11) && !named(state,"HomingSparkCast",15)) return;
 if(!reject((gpointer)c->rbx,(gpointer)c->rdx)) return;
 // Both routes through the chooser converge here. Clear the resolved register
 // AND its stack slot so native code takes its ordinary no-transition path.
 c->rdx=0;
 *(gpointer *)(c->rsp+0xb8)=NULL;
}`,{reject});
 return {verify,lifetime:{nativeGate,reject},install(){verify();return Interceptor.attach(base.add(profile.entryGuard),nativeGate.onEnter);},status(){return {oleanderBlockedEntries:blocked,oleanderHomingCasts:casts,oleander6AStarts:sixAStarts};}};
}
if(typeof module!=='undefined')module.exports={oleanderRejectGroundEntry,oleanderEntryPlan};
