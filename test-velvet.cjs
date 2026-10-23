'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function motion(button){const b=[8,10,10,4,4,4,4,4];if(button!==null)b[3+button]=0;return b;}
function nativeHarness(side=1,name='Velvet'){
 const base=0x10000000n,bytes=new Map(),vals=new Map(),texts=new Map(),events=[],calls=[];let hook,allocation=0x60000000n,state='Stand';
 const profile={input:0x17617a0,inputReturn:0x1775825,make:0x3e3170,enqueue:0x1795980,registry:0x2fa6850};
 class P{
  constructor(n){this.n=BigInt(n);}add(n){return new P(this.n+BigInt(n));}sub(p){return new P(this.n-p.n);}toInt32(){return Number(this.n);}toString(){return '0x'+this.n.toString(16);}equals(p){return this.n===p.n;}isNull(){return this.n===0n;}
  readU8(){return bytes.get(this.n)||0;}writeU8(v){bytes.set(this.n,v);}readU16(){return Number(vals.get(this.n)||0);}readFloat(){return Number(vals.get(this.n)||0);}writeFloat(n){vals.set(this.n,n);}compare(p){return this.n<p.n?-1:this.n>p.n?1:0;}
  readPointer(){return new P(vals.get(this.n)||0);}writePointer(p){vals.set(this.n,p.n);}writeU64(n){vals.set(this.n,BigInt(n));}
  readByteArray(n){return Uint8Array.from(Array.from({length:n},(_,i)=>bytes.get(this.n+BigInt(i))||0)).buffer;}
  writeByteArray(a){a.forEach((v,i)=>bytes.set(this.n+BigInt(i),v));}writeUtf8String(s){texts.set(this.n,s);}
 }
 const alloc=n=>{const p=new P(allocation);allocation+=BigInt(n+256);return p;};
 const actor=new P(0x30000000n),data=new P(0x40000000n),scene=new P(0x20000000n),manager=new P(0x50000000n),st=new P(0x40003000n);
 vals.set(scene.n+0x2f8n,manager.n);vals.set(actor.n+0xc50n,data.n);vals.set(actor.n+0xc58n,st.n);
 vals.set(actor.n+0x128n,375);vals.set(actor.n+0x130n,125);
 if(name==='Uni')vals.set(actor.n+0x128n,630);
 vals.set(actor.n+0x134n,3);vals.set(actor.n+0x13cn,1);
 const head=new P(0x41000000n),properties=[['slot87',328],['slot88',329],['slot89',330],['superbar',66],['supermeterperlevel',68],['alpha',204],['slot11',252],['magicmeter',69],['magicmeterperlevel',71]];
 vals.set(base+BigInt(profile.registry+8),head.n);vals.set(head.n,head.n+256n);
 properties.forEach(([name,index],i)=>{const p=head.n+BigInt((i+1)*256);texts.set(p+0x10n,name);bytes.set(p+0x30n,1);vals.set(p+0x34n,index);vals.set(p,i===properties.length-1?head.n:p+256n);});
 const names=['Boss_Install','Boss_Wind_Idle','Boss_IceL','Boss_IceM','Boss_IceH','IcePrison','Flight_Start','Flight_N','Flight_N_BG','Flight_End','Boss_6A','Boss_6A_Air','Stand'],begin=new P(0x40005000n);
 vals.set(data.n+0xd88n,begin.n);vals.set(data.n+0xd90n,begin.n+BigInt(names.length*8));
 names.forEach((n,i)=>{const p=new P(0x40007000n+BigInt(i)*0x100n);vals.set(begin.n+BigInt(i*8),p.n);texts.set(p.n+0x10n,n);});
 for(const[rva,b]of [[profile.input,[0x48,0x8b,0xc4,0x44,0x88,0x48,0x20,0x55,0x56,0x57,0x41,0x54,0x41,0x55,0x41,0x56]],
 [profile.make,[0x40,0x57,0x48,0x83,0xec,0x30,0x48,0xc7,0x44,0x24,0x20,0xfe]],
 [profile.enqueue,[0x4c,0x89,0x4c,0x24,0x20,0x44,0x89,0x44,0x24,0x18,0x55,0x53]]])b.forEach((v,i)=>bytes.set(base+BigInt(rva+i),v));
 const ctx={Process:{findRangeByAddress:p=>({base:p,size:128,protection:'rw-'})},Memory:{alloc,copy(to,from,n){to.writeByteArray(new Uint8Array(from.readByteArray(n)));}},
  NativeFunction:function(p){return p.n===base+BigInt(profile.make)?text=>{calls.push({make:texts.get(text.n)});return alloc(40);}:
   (...a)=>calls.push({enqueue:true,manager:a[0].toString(),actor:a[1].toString()});},
  Interceptor:{attach(p,h){hook=h;return{detach(){}};}}};
 vm.createContext(ctx);vm.runInContext(['boss-policy.js','velvet-balance-policy.js','oleander-balance-policy.js','oleander-input.js','velvet-input.js'].map(n=>fs.readFileSync(n,'utf8')).join('\n'),ctx);
 const row={actor,data,side,name,hp:5100};
 const api={active:()=>true,current:()=>scene,initialized:()=>true,
  inspect:()=>({players:[row]}),str:p=>p.n===st.n+0x10n?state:texts.get(p.n),fail:e=>{throw e;},emit:(event,value)=>events.push({event,...value})};
 api.oleander=ctx.createNativeDualOleander(new P(base),profile,api);
 const adapter=ctx.createNativeDualVelvet(new P(base),profile,api);adapter.install();adapter.reset(scene);api.oleander.reset(scene);
 return {calls,events,finish:()=>adapter.finishTick(scene),magic:()=>actor.add(0x134).readFloat(),setMagic:v=>actor.add(0x134).writeFloat(v),setMeter:v=>actor.add(0x128).writeFloat(v),level2Timer:()=>actor.add(0x410).readFloat(),meter:()=>actor.add(0x128).readFloat(),alpha:()=>actor.add(0x350).readFloat(),setAlpha:v=>actor.add(0x350).writeFloat(v),setState:s=>{state=s;},dispatch(button,caller=profile.inputReturn,dir=8){
  const original=alloc(0x50),initial=Uint8Array.from({length:0x50},(_,i)=>i+50);initial.set(motion(button));initial[0]=dir;original.writeByteArray(initial);
  const args=[actor,original],self={returnAddress:new P(base+BigInt(caller))};hook.onEnter.call(self,args);
  const evaluated=new Uint8Array(args[1].readByteArray(0x50));hook.onLeave.call(self);
  return {changed:!args[1].equals(original),evaluated,original:new Uint8Array(original.readByteArray(0x50)),initial};
 }};
}
for(const side of [1,2])test('native balanced dispatch side '+side+' consumes private copy, preserves synchronized history, queues same action',()=>{
 const h=nativeHarness(side);assert.equal(h.dispatch(3).changed,false);h.dispatch(null,0x1775825,2);h.dispatch(null);h.dispatch(null,0x1775825,2);
 const r=h.dispatch(3);assert.ok(r.changed);assert.deepEqual(r.original,r.initial);assert.deepEqual(Array.from(r.evaluated.slice(3,7)),[4,4,4,4]);
 assert.deepEqual(r.evaluated.slice(31),r.initial.slice(31));assert.equal(h.calls[0].make,'Boss_Install');assert.ok(h.calls[1].enqueue);assert.equal(h.events[0].side,side);assert.equal(h.meter(),125);
 assert.equal(h.level2Timer(),0,'do not initialize before Boss_Install clears native timer');
 h.setState('Boss_Wind_Idle');h.dispatch(1);assert.equal(h.calls[2].make,'Boss_IceM');
 assert.equal(h.level2Timer(),360,'initialize only once after native install acknowledgement');
 assert.equal(h.events.filter(e=>e.event==='velvet_countdown_initialized').length,1);
 h.setState('Boss_IceM');h.dispatch(null);h.setState('Boss_Wind_Idle');
 h.dispatch(1);assert.equal(h.calls.length,4,'used ice cannot repeat');h.dispatch(3);assert.equal(h.calls[4].make,'IcePrison');
 h.setAlpha(0.4);h.setState('IcePrison');h.finish();assert.equal(h.meter(),0);assert.equal(h.alpha(),0.4,'do not override native super fade');
 for(let i=0;i<40;i++)h.dispatch(null);
 h.setState('Stand');h.finish();assert.equal(h.alpha(),1,'restore visibility after super');
 h.setAlpha(0.7);h.finish();assert.equal(h.alpha(),0.7,'cleanup is once, not permanent opacity lock');
});
test('unrecognized input callers do not dispatch or consume input',()=>{
 const h=nativeHarness(),r=h.dispatch(3,0x123);assert.equal(r.changed,false);assert.equal(h.calls.length,0);assert.deepEqual(r.original,r.initial);
});
for(const side of [1,2])test('shared native hook Oleander side '+side+' charges once, drains 50 and queues exit once',()=>{
 const h=nativeHarness(side,'Uni');h.setState('Flight_Start');h.dispatch(null);assert.equal(h.magic(),2);
 h.setState('Flight_N_BG');for(let i=0;i<60;i++)h.dispatch(null);assert.equal(h.meter(),580);assert.equal(h.magic(),2);
 h.setMeter(0);const r=h.dispatch(null);assert.equal(h.calls[0].make,'Boss_6A_Air');assert.ok(r.changed);assert.deepEqual(r.original,r.initial);
 h.dispatch(null);assert.equal(h.calls.length,2);h.setState('Boss_6A_Air');h.dispatch(null);assert.equal(h.meter(),0);
});
test('shared native hook blocks zero-magic 8D without editing synchronized history',()=>{
 const h=nativeHarness(1,'Uni');h.setMagic(0);const r=h.dispatch(3,0x1775825,6);assert.ok(r.changed);assert.deepEqual(r.original,r.initial);assert.equal(h.calls.length,0);
});
