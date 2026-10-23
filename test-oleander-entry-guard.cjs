const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('oleander-balance-policy.js','utf8')+'\n'+fs.readFileSync('oleander-entry-guard.js','utf8');
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const decision=(extra={})=>ctx.oleanderRejectGroundEntry({next:'Boss_6A',control:0,magic:0,magicUnit:1,hp:1000,...extra});
test('zero or fractional magic rejects ground 6A before state entry; one full level allows it',()=>{
 assert.equal(decision(),true);assert.equal(decision({magic:.5}),true);
 for(const magic of [1,2,3])assert.equal(decision({magic}),false);
 assert.equal(decision({magic:1,magicUnit:2}),true);
});
test('ordinary A, motions and unrelated states are not intercepted',()=>{
 for(const next of ['s.Jab','c.Jab','j.Jab','Fireball','Flight_Start','Flight_End','Stand'])assert.equal(decision({next}),false);
});
test('ordinary jump at insufficient magic rejects air 6A; paid flight exits remain free',()=>{
 for(const magic of [0,.5])assert.equal(decision({next:'Boss_6A_Air',magic}),true);
 assert.equal(decision({next:'Boss_6A_Air',magic:1}),false);
 for(const control of [1,180*8+1,2,3])assert.equal(decision({next:'Boss_6A_Air',control}),false);
 assert.equal(decision({next:'Boss_6A_Air',control:4}),true,'another start is not an already-running action');
});
test('free flight and background exits survive at zero magic, but repeat entry does not',()=>{
 for(const mode of [1,2,3])assert.equal(decision({control:mode}),false);
 assert.equal(decision({control:4}),true);
 assert.equal(decision({control:30*8+5}),true);assert.equal(decision({hp:0}),false);
 assert.throws(()=>decision({magic:NaN}));assert.throws(()=>decision({control:7}));
});
function harness({armed=true,initialized=true,name='Uni',tag=0x4f4c05,hp=1000,badSignature=false,state='Boss_6A',side=1}={}){
 const values=new Map(),events=[];let callback,gateSource,installed=false;
 class P{constructor(n){this.n=n;}add(n){return new P(this.n+n);}isNull(){return this.n===0;}equals(p){return this.n===p.n;}compare(p){return Math.sign(this.n-p.n);}readFloat(){return values.get(this.n)||0;}readU8(){return values.get(this.n)||0;}writeFloat(v){values.set(this.n,v);}}
 const base=new P(0x1000),profile={entryGuard:0x100},scene=new P(0x2000),actor=new P(0x3000),next=new P(0x5000);
 [0x48,0x85,0xd2,0x0f,0x84,0x18,0x01,0,0].forEach((v,i)=>values.set(0x1100+i,v));if(badSignature)values.set(0x1100,0);
 values.set(actor.n+0x540,tag);values.set(actor.n+0x13c,1);
 const env={Process:{findRangeByAddress:p=>({base:p,size:4,protection:'rw-'})},NativeCallback:function(fn){callback=fn;return fn;},CModule:function(code){gateSource=code;return {onEnter:new P(0x6000)};},Interceptor:{attach(){installed=true;return {detach(){}};}}};
 vm.createContext(env);vm.runInContext(source,env);
 const api={active:()=>armed,initialized:()=>initialized,current:()=>scene,inspect:()=>({players:[{actor,name,hp,side}]}),str:()=>state,emit:(...args)=>events.push(args),fail:e=>{throw e;}};
 return {get gateSource(){return gateSource;},get installed(){return installed;},get magic(){return values.get(actor.n+0x134);},get control(){return values.get(actor.n+0x544);},events,start(){const a=env.createNativeDualOleanderEntryGuard(base,profile,api);a.install();},tick(){return env.oleanderBalanceStep({control:values.get(actor.n+0x544),remainder:0,state,input:[8,10,10,4,4,4,4,4],meter:100,magic:values.get(actor.n+0x134),magicUnit:1,hp});},tryEntry(magic=0,control=0,unknown=false){values.set(actor.n+0x134,magic);values.set(actor.n+0x544,control);return callback(unknown?new P(0x9000):actor,next);}};
}
test('native entry callback only rejects initialized controlled Uni actor with insufficient magic',()=>{
 const h=harness();h.start();assert.equal(h.tryEntry(),1);assert.equal(h.tryEntry(1),0);assert.equal(h.tryEntry(0,1),0);assert.equal(h.tryEntry(0,0,true),0);assert.equal(h.events.filter(e=>e[0]==='oleander_6a_entry_blocked').length,1);
 assert.match(h.gateSource,/c->rdx=0/);assert.match(h.gateSource,/c->rsp\+0xb8/);assert.match(h.gateSource,/actor\+0x540/);
 assert.doesNotMatch(h.gateSource,/writeFloat|0xc58|0xc60/);
});
test('disabled, uninitialized, unrelated or dead actors bypass the guard',()=>{
 for(const options of [{armed:false},{initialized:false},{name:'Velvet'},{tag:0},{hp:0}]){const h=harness(options);h.start();assert.equal(h.tryEntry(),0);}
});
test('bad pre-transition native signature refuses without installing a hook',()=>{
 const h=harness({badSignature:true});assert.throws(()=>h.start(),/signature mismatch/);assert.equal(h.installed,false);
});
test('each accepted Homing Spark transition pays one magic on BOTH sides, including foreground/background',()=>{
 for(const side of [1,2])for(const control of [0,1,2]){
  const h=harness({state:'HomingSparkCast',side});h.start();let magic=3;
  for(let i=0;i<3;i++){assert.equal(h.tryEntry(magic,control),0);assert.equal(h.magic,magic-1);magic=h.magic;}
  assert.equal(h.tryEntry(magic,control),1);assert.equal(h.magic,0);
  assert.equal(h.events.filter(e=>e[0]==='oleander_homing_payment').length,3);
  assert.match(h.gateSource,/HomingSparkCast/);
 }
});
test('fractional magic cannot start a Homing Spark; unrelated and disabled actors never pay',()=>{
 const h=harness({state:'HomingSparkCast'});h.start();assert.equal(h.tryEntry(.5,2),1);assert.equal(h.magic,.5);
 for(const options of [{state:'s.Jab'},{state:'HomingSparkCast',armed:false},{state:'HomingSparkCast',name:'Velvet'}]){
  const p=harness(options);p.start();assert.equal(p.tryEntry(3),0);assert.equal(p.magic,3);
 }
});
test('repeated same-state 6A entries each pay once, updates do not pay again, and zero magic stops the chain',()=>{
 for(const state of ['Boss_6A','Boss_6A_Air'])for(const side of [1,2]){
  const h=harness({state,side});h.start();let magic=3,control=0;
  for(let i=0;i<3;i++){
   assert.equal(h.tryEntry(magic,control),0);assert.equal(h.magic,magic-1);assert.equal(h.control,4);
   magic=h.magic;control=h.control;
   for(let j=0;j<30;j++){const p=h.tick();assert.equal(p.magic,null);assert.equal(p.control,4);}
  }
  for(let i=0;i<5;i++){assert.equal(h.tryEntry(magic,control),1);assert.equal(h.magic,0);}
  assert.equal(h.events.filter(e=>e[0]==='oleander_6a_entry').length,3);
 }
});
test('flight grants only one free 6A start, not unlimited same-state recancels',()=>{
 for(const control of [1,180*8+1,2,3]){
  const h=harness({state:'Boss_6A_Air'});h.start();assert.equal(h.tryEntry(0,control),0);assert.equal(h.magic,0);assert.equal(h.control,4);
  assert.equal(h.tick().magic,null,'let the current free action continue');
  assert.equal(h.tryEntry(0,h.control),1,'block a NEW start with no magic');
 }
});
test('entry decisions replay from restored native resources, not process-local counters',()=>{
 const info={next:'Boss_6A_Air',control:4,magic:2,magicUnit:1,hp:1000};
 const a=ctx.oleanderEntryPlan(info);ctx.oleanderEntryPlan({...info,magic:0});assert.deepEqual(ctx.oleanderEntryPlan(info),a);
});
