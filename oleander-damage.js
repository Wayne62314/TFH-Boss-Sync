'use strict';
// Semantic common-damage command: LIFEBAR = LIFEBAR - DAMAGE.
// No shared attack-data patch, post-hit HP refund, frame cache or combo-scale change.
const OLEANDER_HP_SUBTRACT='013fb2514000000001fba6c672000000010000004000000000038f05c60000000000000000000000';
// Native value records contain uninitialized padding. Only compare fields read
// by the reviewed evaluator: operand kind, uint16 variable index and operation.
const OLEANDER_HP_SUBTRACT_FIELDS=[[0,1],[4,64],[5,0],[8,1],[12,114],[13,0],[16,1],[20,64],[21,0],[25,3]];
function oleanderIsHpSubtract(bytes){return bytes.length===40&&OLEANDER_HP_SUBTRACT_FIELDS.every(([i,v])=>bytes[i]===v);}
function oleanderHalfFinalDamage(value){if(!Number.isFinite(value)||value<0||value>10000000)throw Error('Invalid final 6A damage');return value*0.5;}
function createNativeDualOleanderDamage(base,profile,api){
 const bytes=[0xf3,0x0f,0x10,0x45,0xc0,0xf3,0x0f,0x5c,0x45,0xc4,0xe9,0x81,0x05,0,0];
 function verify(){for(let i=0;i<bytes.length;i++)if(base.add(profile.subtract+i).readU8()!==bytes[i])throw Error('Final damage subtraction signature mismatch');}
 verify();let hits=0;
 function writable(p){const r=Process.findRangeByAddress(p);if(!r||!r.protection.includes('w')||p.add(4).compare(r.base.add(r.size))>0)throw Error('Unwritable 6A damage operand');}
 const match=new NativeCallback((victim,operand)=>{try{
  if(!api.active())return;const scene=api.current();if(!api.initialized(scene))return;
  const snap=api.inspect(scene);if(!snap)return;
  const target=snap.players.find(r=>r.actor.equals(victim));if(!target)return;
  const source=victim.add(0xb28).readPointer();if(source.isNull())return;
  const begin=scene.add(0xa68).readPointer(),end=scene.add(0xa70).readPointer();
  let root=source,owner=null;
  for(let i=0;i<16;i++){
   owner=snap.players.find(r=>r.actor.equals(root));if(owner)break;
   if(root.isNull()||root.compare(begin)<0||root.compare(end)>=0||root.sub(begin).toInt32()%0x14a0!==0)return;
   const parent=root.add(0xb30).readPointer();if(parent.equals(root))return;root=parent;
  }
  if(!owner||owner.name!=='Uni'||owner.side===target.side||owner.hp<=0||owner.actor.add(0x540).readFloat()!==OLEANDER_SLOT_MAGIC)return;
  if(!source.equals(root)&&(source.compare(begin)<0||source.compare(end)>=0||source.sub(begin).toInt32()%0x14a0!==0))return;
  const data=source.add(0xc50).readPointer(),state=source.add(0xc58).readPointer();if(data.isNull()||state.isNull())return;
  const name=api.str(data.add(0xb40)),action=api.str(state.add(0x10));
  const body=source.equals(root)&&name==='Uni'&&['Boss_6A','Boss_6A_Air'].includes(action);
  const pillar=!source.equals(root)&&name==='Boss_6A_Pillar_Impact'&&action==='6A_Pillar_Impact';
  if(!body&&!pillar)return;
  const before=operand.readFloat();if(before!==victim.add(0x1e8).readFloat())throw Error('Final damage operand differs from sampled DAMAGE variable');
  const after=oleanderHalfFinalDamage(before);writable(operand);writable(victim.add(0x1e8));
  // Operand has already been evaluated into this native stack frame. Change it
  // BEFORE subtraction; also keep DAMAGE consistent for following HUD/events.
  operand.writeFloat(after);victim.add(0x1e8).writeFloat(after);hits++;
  if(hits<=32||hits%100===0)api.emit('oleander_6a_half_damage',{side:owner.side,source:name,state:action,before,after,hits});
 }catch(e){api.fail(e);}},'void',['pointer','pointer']);
 // Hot branch: filter semantic fields in C, never process-dependent padding.
 const reject=OLEANDER_HP_SUBTRACT_FIELDS.map(([i,v])=>`p[${i}]!=${v}`).join(' || ');
 const nativeGate=new CModule(`#include <gum/guminterceptor.h>
extern void match(gpointer victim, gpointer operand);
void onEnter(GumInvocationContext *ic) {
 GumCpuContext *c=ic->cpu_context; const guint8 *p=(const guint8 *)c->rdi;
 if(${reject}) return;
 match((gpointer)c->r14,(gpointer)(c->rbp-0x3c));
}`,{match});
 return {verify,lifetime:{nativeGate,match},install(){verify();return Interceptor.attach(base.add(profile.subtract),nativeGate.onEnter);},status(){return {oleanderScaledHits:hits};}};
}
if(typeof module!=='undefined')module.exports={OLEANDER_HP_SUBTRACT,OLEANDER_HP_SUBTRACT_FIELDS,oleanderIsHpSubtract,oleanderHalfFinalDamage};
