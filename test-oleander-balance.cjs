const test=require('node:test'),assert=require('node:assert/strict');
const {oleanderBalanceStep,oleanderControlDecode}=require('./oleander-balance-policy');
const input=(dir=8,d=false)=>[dir,10,10,4,4,4,d?0:4,4];
function game(magic=3,meter=630){let control=0,remainder=0;return {
 step(state,keys=input()){const p=oleanderBalanceStep({control,remainder,state,input:keys,meter,magic,magicUnit:1});control=p.control;remainder=p.remainder;if(p.magic!==null)magic=p.magic;if(p.meter!==null)meter=p.meter;return p;},
 get snapshot(){return {control,remainder,magic,meter};},restore(s){({control,remainder,magic,meter}=s);}
};}
test('one magic per flight, not per held D or per frame; no native meter charge',()=>{
 const g=game();assert.equal(g.step('Stand',input(6,true)).magic,null);
 assert.equal(g.step('Flight_Start').magic,2);
 for(let i=0;i<20;i++){assert.equal(g.step('Flight_N',input(6,true)).magic,null);assert.equal(g.snapshot.magic,2);}
 assert.equal(g.snapshot.meter,630);
});
test('insufficient magic suppresses 8D and rejects an already queued start without negative resource',()=>{
 for(const magic of [0,0.5]){const g=game(magic);assert.equal(g.step('Stand',input(6,true)).consume,true);assert.equal(g.step('Flight_Start').action,'Flight_End');assert.equal(g.snapshot.magic,magic);}
});
test('foreground exits once at 180 updates, with no refresh from inputs',()=>{
 const g=game();g.step('Flight_Start');for(let i=0;i<179;i++)assert.equal(g.step(i%2?'Flight_N':'Flight_F').action,null);
 const r=g.step('Flight_N');assert.equal(r.action,'Flight_End');assert.equal(r.reason,'three-second-timeout');
 assert.equal(g.step('Flight_N').action,null);assert.equal(g.step('Flight_End').control,0);
});
test('manual 6A relinquishes foreground and background without duplicate command or forced landing',()=>{
 for(const background of [false,true]){const g=game();g.step('Flight_Start');if(background)g.step('Flight_N_BG');
  const r=g.step('Boss_6A_Air');assert.equal(r.action,null);assert.equal(r.reason,'flight-6a-free-exit');assert.equal(r.magic,null);assert.equal(r.meter,null);
  assert.equal(g.step('JumpFall').control,0);
 }
});
test('background consumes exactly 50 numeric units per 60 updates, not percent or bar levels',()=>{
 const g=game();g.step('Flight_Start');for(let i=0;i<60;i++)g.step('Flight_N_BG');assert.equal(g.snapshot.meter,580);assert.equal(g.snapshot.remainder,0);
 for(let i=0;i<60;i++)g.step('Flight_N_BG');assert.equal(g.snapshot.meter,530);
 assert.equal(oleanderControlDecode(g.snapshot.control).mode,2);
});
test('background ignores 3-second foreground deadline; 630 meter lasts 756 updates',()=>{
 const g=game();g.step('Flight_Start');for(let i=0;i<755;i++)assert.equal(g.step('Flight_N_BG').action,null);
 assert.equal(g.snapshot.meter,1);const r=g.step('Flight_N_BG');assert.equal(r.action,'Boss_6A_Air');assert.equal(g.snapshot.meter,0);
 assert.equal(g.step('Flight_N_BG').action,null,'only one exit queued');assert.equal(g.step('Boss_6A_Air').magic,null);assert.equal(g.step('JumpFall').control,0);
});
test('zero or fractional remaining meter cannot go negative',()=>{
 for(const meter of [0,0.1,0.5,1]){const g=game(3,meter);g.step('Flight_Start');let r=g.step('Flight_N_BG');if(!r.action)r=g.step('Flight_N_BG');assert.equal(r.action,'Boss_6A_Air');assert.equal(g.snapshot.meter,0);}
});
test('background actions continue draining; hits/native landing relinquish control',()=>{
 const g=game();g.step('Flight_Start');g.step('Flight_N_BG');g.step('HomingSparkCast');assert.equal(g.snapshot.meter,629);
 assert.equal(g.step('j.HitMid1').control,0);assert.equal(g.step('Stand').meter,null);
});
test('native snapshot restoration replays costs, fractional remainder and exit identically',()=>{
 const g=game();const start=g.snapshot;const a=g.step('Flight_Start');g.restore(start);assert.deepEqual(g.step('Flight_Start'),a);
 g.step('Flight_N_BG');const saved=g.snapshot;const p=g.step('Flight_N_BG');g.restore(saved);assert.deepEqual(g.step('Flight_N_BG'),p);
});
test('invalid native state or resources fail closed',()=>{
 for(const patch of [{control:7},{control:NaN},{remainder:60},{meter:-1},{magicUnit:0}])assert.throws(()=>oleanderBalanceStep({state:'Stand',input:input(),meter:1,magic:1,magicUnit:1,...patch}));
});
test('ground 6A pays exactly one magic; re-entry after animation pays again',()=>{
 const g=game();assert.equal(g.step('Boss_6A').magic,2);for(let i=0;i<30;i++)assert.equal(g.step('Boss_6A').magic,null);
 g.step('Stand');assert.equal(g.step('Boss_6A').magic,1);
});
test('zero magic denies ground 6A without consuming normal attack input or making resources negative',()=>{
 const g=game(0);assert.equal(g.step('Stand').consume,false);assert.equal(g.step('Boss_6A').action,'Stand');assert.equal(g.step('Boss_6A').action,null);assert.equal(g.step('Stand').control,0);assert.equal(g.snapshot.magic,0);
});
test('foreground, background and automatic 6A exits are free even at zero magic',()=>{
 for(const bg of [false,true]){const g=game(1,0);g.step('Flight_Start');assert.equal(g.snapshot.magic,0);if(bg)assert.equal(g.step('Flight_N_BG').action,'Boss_6A_Air');assert.equal(g.step('Boss_6A_Air').magic,null);assert.equal(g.snapshot.magic,0);}
});

test('background adoption does not depend on 4D, Flight_Start or a surviving tracker',()=>{
 for(const state of ['Flight_N_BG','HomingSparkCast']){
  const g=game();for(let i=0;i<60;i++)g.step(state);
  assert.equal(g.snapshot.meter,580);assert.equal(g.snapshot.remainder,0);assert.equal(oleanderControlDecode(g.snapshot.control).mode,2);
 }
});
test('foreground Homing Spark joins upkeep immediately; repeated casts never reset drain debt',()=>{
 const g=game();g.step('Flight_Start');
 for(let i=0;i<120;i++)g.step(i%7<3?'HomingSparkCast':'Flight_N_BG');
 assert.equal(g.snapshot.meter,530);assert.equal(g.snapshot.remainder,0);
});
test('zero meter from ANY background entry requests one free exit, including Homing Spark startup',()=>{
 for(const state of ['Flight_N_BG','HomingSparkCast']){
  const g=game(0,0);assert.equal(g.step(state).action,'Boss_6A_Air');assert.equal(g.step(state).action,null);
  assert.equal(g.step('Boss_6A_Air').magic,null);assert.equal(g.snapshot.meter,0);
 }
});
test('snapshot replay preserves background adoption and cast drain; native foreground/landing stop fees',()=>{
 const g=game();g.step('HomingSparkCast');const snap=g.snapshot,first=g.step('HomingSparkCast');g.restore(snap);assert.deepEqual(g.step('HomingSparkCast'),first);
 g.step('Flight_N');const meter=g.snapshot.meter;assert.equal(g.step('Stand').meter,null);assert.equal(g.snapshot.meter,meter);
});
