'use strict';
// Reject unaffordable ground/ordinary-jump 6A BEFORE native animation entry.
// Never edits synchronized input, shared move data, HP or current state.
function oleanderRejectGroundEntry({next,control,magic,magicUnit,hp}){
 if(!['Boss_6A','Boss_6A_Air'].includes(next)||hp<=0)return false;
 const {mode}=oleanderControlDecode(control);
 if(![magic,magicUnit].every(Number.isFinite)||magic<0||magicUnit<=0)throw Error('Invalid entry-guard magic');
 // Modes 1/2/3 own free flight exits; 4 owns an already paid native action.
 return (mode===0||mode===5)&&magic<magicUnit;
}
function createNativeDualOleanderEntryGuard(base,profile,api){
 const bytes=[0x48,0x85,0xd2,0x0f,0x84,0x18,0x01,0,0];
 function verify(){for(let i=0;i<bytes.length;i++)if(base.add(profile.entryGuard+i).readU8()!==bytes[i])throw Error('Oleander pre-transition signature mismatch');}
 verify();let blocked=0;
 const reject=new NativeCallback((actor,next)=>{try{
  if(!api.active()||next.isNull())return 0;
  const scene=api.current();if(!api.initialized(scene))return 0;
  const snap=api.inspect(scene),row=snap&&snap.players.find(r=>r.actor.equals(actor));
  if(!row||row.name!=='Uni'||actor.add(0x540).readFloat()!==OLEANDER_SLOT_MAGIC)return 0;
  if(!oleanderRejectGroundEntry({next:api.str(next.add(0x10)),control:actor.add(0x544).readFloat(),
   magic:actor.add(0x134).readFloat(),magicUnit:actor.add(0x13c).readFloat(),hp:row.hp}))return 0;
  blocked++;if(blocked<=16||blocked%100===0)api.emit('oleander_6a_entry_blocked',{side:row.side,state:api.str(next.add(0x10)),blocked});
  return 1;
 }catch(e){api.fail(e);return 0;}},'int',['pointer','pointer']);
 const nativeGate=new CModule(`#include <gum/guminterceptor.h>
extern int reject(gpointer actor, gpointer next);
void onEnter(GumInvocationContext *ic) {
 GumCpuContext *c=ic->cpu_context;
 if(c->rdx==0) return;
 const guint8 *actor=(const guint8 *)c->rbx;
 // Hot-path filtering: no JS for unrelated actors or sufficient magic.
 if(*(const float *)(actor+0x540)!=5196805.0f) return;
 if(*(const float *)(actor+0x134)>=*(const float *)(actor+0x13c)) return;
 if(!reject((gpointer)c->rbx,(gpointer)c->rdx)) return;
 // Both routes through the chooser converge here. Clear the resolved register
 // AND its stack slot so native code takes its ordinary no-transition path.
 c->rdx=0;
 *(gpointer *)(c->rsp+0xb8)=NULL;
}`,{reject});
 return {verify,lifetime:{nativeGate,reject},install(){verify();return Interceptor.attach(base.add(profile.entryGuard),nativeGate.onEnter);},status(){return {oleanderBlockedEntries:blocked};}};
}
if(typeof module!=='undefined')module.exports={oleanderRejectGroundEntry};
