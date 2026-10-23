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
 for(const control of [1,180*8+1,2,3,4])assert.equal(decision({next:'Boss_6A_Air',control}),false);
});
test('free flight and background exit, pending exit and already paid action survive at zero magic',()=>{
 for(const mode of [1,2,3,4])assert.equal(decision({control:mode}),false);
 assert.equal(decision({control:30*8+5}),true);assert.equal(decision({hp:0}),false);
 assert.throws(()=>decision({magic:NaN}));assert.throws(()=>decision({control:7}));
});
function harness({armed=true,initialized=true,name='Uni',tag=0x4f4c05,hp=1000,badSignature=false}={}){
 const values=new Map(),events=[];let callback,gateSource,installed=false;
 class P{constructor(n){this.n=n;}add(n){return new P(this.n+n);}isNull(){return this.n===0;}equals(p){return this.n===p.n;}readFloat(){return values.get(this.n)||0;}readU8(){return values.get(this.n)||0;}}
 const base=new P(0x1000),profile={entryGuard:0x100},scene=new P(0x2000),actor=new P(0x3000),next=new P(0x5000);
 [0x48,0x85,0xd2,0x0f,0x84,0x18,0x01,0,0].forEach((v,i)=>values.set(0x1100+i,v));if(badSignature)values.set(0x1100,0);
 values.set(actor.n+0x540,tag);values.set(actor.n+0x13c,1);
 const env={NativeCallback:function(fn){callback=fn;return fn;},CModule:function(code){gateSource=code;return {onEnter:new P(0x6000)};},Interceptor:{attach(){installed=true;return {detach(){}};}}};
 vm.createContext(env);vm.runInContext(source,env);
 const api={active:()=>armed,initialized:()=>initialized,current:()=>scene,inspect:()=>({players:[{actor,name,hp,side:1}]}),str:()=> 'Boss_6A',emit:(...args)=>events.push(args),fail:e=>{throw e;}};
 return {get gateSource(){return gateSource;},get installed(){return installed;},events,start(){const a=env.createNativeDualOleanderEntryGuard(base,profile,api);a.install();},tryEntry(magic=0,control=0,unknown=false){values.set(actor.n+0x134,magic);values.set(actor.n+0x544,control);return callback(unknown?new P(0x9000):actor,next);}};
}
test('native entry callback only rejects initialized controlled Uni actor with insufficient magic',()=>{
 const h=harness();h.start();assert.equal(h.tryEntry(),1);assert.equal(h.tryEntry(1),0);assert.equal(h.tryEntry(0,1),0);assert.equal(h.tryEntry(0,0,true),0);assert.equal(h.events.length,1);
 assert.match(h.gateSource,/c->rdx=0/);assert.match(h.gateSource,/c->rsp\+0xb8/);assert.match(h.gateSource,/actor\+0x540/);
 assert.doesNotMatch(h.gateSource,/writeFloat|0xc58|0xc60/);
});
test('disabled, uninitialized, unrelated or dead actors bypass the guard',()=>{
 for(const options of [{armed:false},{initialized:false},{name:'Velvet'},{tag:0},{hp:0}]){const h=harness(options);h.start();assert.equal(h.tryEntry(),0);}
});
test('bad pre-transition native signature refuses without installing a hook',()=>{
 const h=harness({badSignature:true});assert.throws(()=>h.start(),/signature mismatch/);assert.equal(h.installed,false);
});
