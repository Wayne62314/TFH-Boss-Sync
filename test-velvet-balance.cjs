const test=require('node:test'),assert=require('node:assert/strict');
const {velvetBalanceStep,velvetControlDecode,velvetControlEncode}=require('./velvet-balance-policy');
function input(dir=8,button=-1){const a=[dir,10,10,4,4,4,4,4];if(button>=0)a[3+button]=0;return a;}
function game(meter=375){let control=0,tracker=0;return {step(state='Stand',keys=input()){
 const r=velvetBalanceStep({control,tracker,state,input:keys,meter,unit:125});control=r.control;tracker=r.tracker;if(r.meter!==null)meter=r.meter;return r;
 },get state(){return {control,tracker,meter};},restore(s){({control,tracker,meter}=s);}};}
function enter(g){g.step('Stand',input(2));g.step('Crouching',input(8));g.step('Crouching',input(2));return g.step('Crouching',input(8,3));}
test('normal D is unchanged; real 22D spends two levels and starts a 360-frame mode',()=>{
 const g=game();assert.equal(g.step('Stand',input(8,3)).action,null);assert.equal(enter(g).action,'Boss_Install');
 assert.equal(g.state.meter,125);assert.equal(velvetControlDecode(g.state.control).remaining,360);
});
test('below two bars never enters or spends; exact two bars enters with zero remaining',()=>{
 for(const n of [0,124,249]){const g=game(n);assert.equal(enter(g).action,null);assert.equal(g.state.meter,n);}
 const g=game(250);assert.equal(enter(g).action,'Boss_Install');assert.equal(g.state.meter,0);
});
test('native countdown bar waits for acknowledged installation and replays from native state',()=>{
 const g=game();assert.equal(enter(g).modeTimer,null);const save={...g.state};
 const first=g.step('Boss_Install');assert.equal(first.modeTimer,360);
 assert.equal(g.step('Boss_Install').modeTimer,null,'no per-frame replenishment');
 g.restore(save);assert.deepEqual(g.step('Boss_Install'),first);
});
test('slow, single down, held down or airborne motions do not qualify as 22D',()=>{
 const g=game();g.step('Stand',input(2));for(let i=0;i<25;i++)g.step('Crouch',input(2));assert.equal(g.step('Crouch',input(2,3)).action,null);
 const h=game();h.step('Stand',input(2));h.step('Crouch',input(8));for(let i=0;i<25;i++)h.step();h.step('Stand',input(2));assert.equal(h.step('Crouch',input(2,3)).action,null);
 const j=game();j.step('JumpFall',input(2));j.step('JumpFall',input(8));j.step('JumpFall',input(2));assert.equal(j.step('JumpFall',input(2,3)).action,null);
});
test('A/B/C once each; third ice completes before automatic super exit',()=>{
 const g=game();enter(g);assert.equal(g.step('Boss_Wind_Idle',input(8,0)).action,'Boss_IceL');
 g.step('Boss_IceL');
 assert.equal(g.step('Boss_Wind_Idle',input(8,0)).reason,'already-used');
 assert.equal(g.step('Boss_Wind_Idle',input(8,1)).action,'Boss_IceM');
 g.step('Boss_IceM');
 assert.equal(g.step('Boss_Wind_Idle',input(8,2)).action,'Boss_IceH');
 assert.equal(g.step('Boss_Wind_Idle').action,null,'queued last ice has not started yet');
 assert.equal(g.step('Boss_IceH').action,null);
 assert.equal(g.step('Boss_Wind_Idle').action,'IcePrison');
 assert.equal(g.step('Boss_Wind_Idle').action,null,'no duplicate super while pending');
});
test('manual D can exit with no remaining bar; native one-bar staging requested exactly once',()=>{
 const g=game(250);enter(g);const r=g.step('Boss_Wind_Idle',input(8,3));assert.equal(r.action,'IcePrison');assert.equal(r.meter,125);assert.equal(r.reason,'manual');
 assert.equal(g.step('Boss_Wind_Idle',input(8,3)).action,null);
});
test('360 simulation steps expire; no wall clock means no pause advancement',()=>{
 const g=game();enter(g);for(let i=0;i<359;i++)assert.equal(g.step('Boss_Wind_Idle').action,null);
 assert.equal(g.step('Boss_IceM').action,null,'do not interrupt an ice on timeout');
 const r=g.step('Boss_Wind_Idle');assert.equal(r.action,'IcePrison');assert.equal(r.reason,'timeout');
});
test('native state restoration replays usage/timer/meter decisions identically',()=>{
 const g=game();enter(g);g.step('Boss_Wind_Idle',input(8,0));g.step('Boss_IceL');const save={...g.state};
 const a=g.step('Boss_Wind_Idle',input(8,1));g.restore(save);const b=g.step('Boss_Wind_Idle',input(8,1));assert.deepEqual(a,b);
 const h=game(),before={...h.state};const e1=enter(h);h.restore(before);const e2=enter(h);assert.deepEqual(e1,e2);assert.equal(h.state.meter,125);
});
test('manual exit during queued or running ice waits for completion and survives native restoration',()=>{
 const g=game();enter(g);g.step('Boss_Wind_Idle',input(8,0));
 assert.equal(g.step('Boss_Wind_Idle',input(8,3)).action,null);
 assert.equal(g.step('Boss_IceL').action,null);const save={...g.state};
 assert.equal(g.step('Boss_Wind_Idle').reason,'manual');g.restore(save);
 assert.equal(g.step('Boss_Wind_Idle').action,'IcePrison');
});
test('control serializes exactly in integer-valued float range; no illegal states or negative meter accepted',()=>{
 for(let remaining=0;remaining<=360;remaining++)for(let used=0;used<8;used++){
 const s={remaining,used,active:true,awaitingStart:false,exiting:false};assert.deepEqual(velvetControlDecode(velvetControlEncode(s)),s);
 }
 assert.throws(()=>velvetBalanceStep({state:'Stand',input:input(),meter:-1,unit:125}));
});
