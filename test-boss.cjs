'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {BOSS_FLAG,dualBossMode,dualBossEligible,dualBossFlags}=require('./boss-policy');
const source=['boss-policy.js','boss-hook.js'].map(n=>fs.readFileSync(path.join(__dirname,n),'utf8')).join('\n');
const profiles=[{name:'steam',reset:0x1773720,update:0x189b7e0,flag:0x1780f40,scene:0x2b0d1e8},
 {name:'second',reset:0x1773220,update:0x189b3f0,flag:0x1780a40,scene:0x2b0d208}];
function harness({profile=profiles[0],kind=1,p1='Uni',p2='Uni',bad=false,wrongTeam=false}={}){
 const base=0x10000000n,scene=0x20000000n,bytes=new Map(),values=new Map(),texts=new Map(),hooks=new Map(),writes=[],messages=[];
 class P{
  constructor(n){this.n=BigInt(n);}add(n){return new P(this.n+BigInt(n));}sub(p){return new P(this.n-p.n);}
  equals(p){return this.n===p.n;}isNull(){return this.n===0n;}toString(){return '0x'+this.n.toString(16);}toInt32(){return Number(this.n);}
  compare(p){return this.n<p.n?-1:this.n>p.n?1:0;}
  readU8(){if(!bytes.has(this.n))throw Error('unmapped byte');return bytes.get(this.n);}
  readU32(){if(!values.has(this.n))throw Error('unmapped u32');return values.get(this.n);}readS32(){return this.readU32();}readFloat(){return this.readU32();}
  readU64(){return {toNumber:()=>values.get(this.n)};}readPointer(){if(!values.has(this.n))throw Error('unmapped pointer');return new P(values.get(this.n));}
  readUtf8String(){return texts.get(this.n);}writeU32(n){writes.push({addr:this.n,value:n});values.set(this.n,n);}
 }
 function signature(rva,b){b.forEach((v,i)=>bytes.set(base+BigInt(rva+i),v));}
 signature(profile.reset,[0x4c,0x89,0x44,0x24,0x18,0x88,0x54,0x24,0x10,0x55,0x56,0x57,0x41,0x54,0x41,0x55]);
 signature(profile.update,[0x48,0x8b,0xc4,0x55,0x56,0x57,0x41,0x54,0x41,0x55,0x41,0x56,0x41,0x57]);
 signature(profile.flag,[0x8b,0xc2,0x4c,0x8b,0xd1,0x99,0x83,0xe2,0x1f,0x03,0xc2,0x44,0x8b,0xc8,0x83,0xe0]);
 if(bad)bytes.set(base+BigInt(profile.update),0);
 values.set(base+BigInt(profile.scene),scene);values.set(scene+0x9e4n,kind);values.set(scene+0x2028n,0n);
 const actors=[];
 for(const [i,name]of [p1,p2].entries()){
  const side=i+1,slot=i*3,a=0x30000000n+BigInt(i)*0x10000n,d=a+0x3000n,st=a+0x6000n;actors.push(a);
  values.set(scene+BigInt(i===0?0xaa8:0xab4),slot);values.set(scene+0xae0n+BigInt(slot*8),a);
  values.set(a+0xc50n,d);values.set(a+0xc58n,st);values.set(a+0x88n,wrongTeam&&side===2?1:side);values.set(a+0x120n,10000);values.set(a+0x590n,0x1234);
  for(const [p,s]of [[d+0xb40n,name],[st+0x10n,'Stand']]){texts.set(p,s);values.set(p+16n,s.length);values.set(p+24n,15);}
  values.set(a+0xc78n,side*100);values.set(a+0xc7cn,0);
 }
 const rpc={exports:{}},ctx={ptr:n=>new P(n),rpc,createNativeDualOleanderEntryGuard:()=>({verify(){},status(){return{};},install(){hooks.set(-3n,{});return{detach(){hooks.delete(-3n);}};}}),createNativeDualOleanderDamage:()=>({verify(){},status(){return{};},install(){hooks.set(-2n,{});return{detach(){hooks.delete(-2n);}};}}),createNativeDualOleander:()=>({verify(){},reset(){},status(){return{};}}),createNativeDualVelvet:()=>({verify(){},reset(){},finishTick(){},status(){return{};},install(){hooks.set(-1n,{});return{detach(){hooks.delete(-1n);}};}}),Process:{id:123,findRangeByAddress:p=>({base:new P(p.n-4n),size:16,protection:'rw-'})},
  Interceptor:{attach(p,h){hooks.set(p.n,h);return {detach(){hooks.delete(p.n);}};}},send:m=>messages.push(m)};
 vm.createContext(ctx);
 return {writes,messages,actors,values,hooks,
  start(){vm.runInContext(source.replace('__BASE__','0x10000000').replace('__PROFILE__',JSON.stringify(profile)),ctx);},
  setup(){rpc.exports.install();rpc.exports.enable();},
  reset(){const h=hooks.get(base+BigInt(profile.reset)),self={};h.onEnter.call(self,[new P(scene)]);h.onLeave.call(self);},
  tick(){hooks.get(base+BigInt(profile.update)).onEnter.call({},[new P(scene),new P(1)]);},
  rpc(){return rpc.exports;},setKind(k){values.set(scene+0x9e4n,k);},
  boss(i){return (values.get(actors[i]+0x590n)&BOSS_FLAG)!==0;}
 };
}
test('mode gate explicitly includes both investigated network branches, not arbitrary future modes',()=>{
 for(const k of [0,1,11])assert.ok(dualBossMode(k,0));assert.ok(dualBossMode(10,1));
 for(const k of [-1,2,9,15,16,999,NaN])assert.equal(dualBossMode(k,1),false);assert.equal(dualBossMode(10,0),false);
});
test('eligibility requires exact Oleander, side-slot/team consistency, live ready actor',()=>{
 const row={side:2,slot:3,team:2,name:'Uni',stateReady:true,hp:1};assert.ok(dualBossEligible(row));
 for(const patch of [{side:3},{slot:0},{team:1},{name:'Book'},{name:'uni'},{hp:0},{hp:NaN},{stateReady:false}])assert.equal(dualBossEligible({...row,...patch}),false);
});
test('only Flag27 changes; transformation is idempotent and preserves other bits',()=>{
 for(const f of [0,0x123456,0xffffffff,0x80000000]){const v=dualBossFlags(f);assert.equal(v^f,(f&BOSS_FLAG)?0:BOSS_FLAG);assert.equal(dualBossFlags(v),v);}
});
for(const profile of profiles)test(profile.name+': both sides receive the same rule regardless of local ownership',()=>{
 const h=harness({profile});h.start();assert.equal(h.writes.length,0);h.setup();h.tick();assert.equal(h.writes.length,0,'wait for round reset');
 h.reset();assert.ok(h.boss(0));assert.ok(h.boss(1));assert.equal(h.writes.length,2);h.tick();assert.equal(h.writes.length,2);
 for(const w of h.writes)assert.ok(h.actors.some(a=>w.addr===a+0x590n));
});
test('remote-side Oleander alone is enhanced, opposing non-Oleander untouched',()=>{
 const h=harness({p1:'cow'});h.start();h.setup();h.reset();assert.equal(h.boss(0),false);assert.ok(h.boss(1));assert.equal(h.writes.length,1);
});
test('reapplies idempotent flag after simulated restoration; does not use outside gameplay counters',()=>{
 const h=harness();h.start();h.setup();h.reset();h.values.set(h.actors[1]+0x590n,0x42);h.tick();assert.equal(h.values.get(h.actors[1]+0x590n),0x42|BOSS_FLAG);
});
test('invalid team rejects before writing either actor',()=>{
 const h=harness({wrongTeam:true});h.start();h.setup();h.reset();assert.equal(h.writes.length,0);assert.ok(h.rpc().preflight().faulted);
});
test('menu/unknown modes are untouched and shutdown prevents further writes',()=>{
 const h=harness({kind:15});h.start();h.setup();h.reset();assert.equal(h.writes.length,0);h.setKind(1);h.rpc().shutdown();assert.equal(h.hooks.size,0);assert.equal(h.writes.length,0);
});
test('all code signatures are checked before any attachment',()=>{
 const h=harness({bad:true});assert.throws(()=>h.start(),/Signature mismatch/);assert.equal(h.hooks.size,0);assert.equal(h.writes.length,0);
});
