'use strict';
const OLEANDER_FLY_FRAMES=180,OLEANDER_SLOT_MAGIC=0x4f4c05;
function oleanderControlDecode(value){
 if(!Number.isInteger(value)||value<0||value>180*8+5||(value&7)>5)throw Error('Invalid Oleander control');
 return {mode:value&7,remaining:Math.floor(value/8)};
}
function oleanderControlEncode(s){return s.remaining*8+s.mode;}
// Native-restored state only. Remainder is an integer 0..59, not floating debt.
function oleanderBalanceStep({control=0,remainder=0,state,input,meter,magic,magicUnit,hp=1}){
 const s=oleanderControlDecode(control);
 if(!Number.isInteger(remainder)||remainder<0||remainder>=60)throw Error('Invalid Oleander drain remainder');
 if(![meter,magic,magicUnit].every(Number.isFinite)||meter<0||magic<0||magicUnit<=0)throw Error('Invalid Oleander resources');
 if(!Array.isArray(input)||input.length<8)throw Error('Invalid Oleander input');
 const out={control,remainder,magic:null,meter:null,action:null,consume:false,reason:null};
 const singleD=input[6]===0&&input.slice(3,6).every(v=>v===4);
 const finish=()=>{out.control=oleanderControlEncode(s);return out;};
 const clear=()=>({...out,control:0,remainder:0});
 const exit=(action,reason)=>{s.mode=3;s.remaining=30;out.remainder=0;out.action=action;out.consume=true;out.reason=reason;return finish();};
 if(hp<=0||/Intro|Victory|Defeat|WinPose|Death|KO/.test(state))return clear();
 const sixA=['Boss_6A','Boss_6A_Air'].includes(state);
 if(s.mode===5){
  if(!sixA)return clear();s.remaining--;if(s.remaining<=0)throw Error('Unaffordable ground 6A was not cancelled');return finish();
 }
 if(s.mode===4)return sixA?finish():clear(); // One payment/free exit per native action.
 if(sixA){
  const free=[1,2,3].includes(s.mode);
  if(!free&&magic<magicUnit){exit('Stand','ground-6a-insufficient-magic');s.mode=5;return finish();}
  if(!free)out.magic=magic-magicUnit;
  s.mode=4;s.remaining=0;out.remainder=0;out.reason=free?'flight-6a-free-exit':'ground-6a-payment';return finish();
 }
 if(s.mode===3){
  if(state==='Flight_End'||/^JumpFall|^JumpLand|^Stand/.test(state))return clear();
  s.remaining--;if(s.remaining<=0)throw Error('Oleander exit command did not start');return finish();
 }
 if(s.mode===0){
  // Native enum U=6; preserve direction and synchronized history, suppress only D.
  if(singleD&&input[0]===6&&magic<magicUnit){out.consume=true;out.reason='insufficient-magic';}
  if(state!=='Flight_Start')return out;
  if(magic<magicUnit)return exit('Flight_End','insufficient-magic');
  out.magic=magic-magicUnit;out.reason='flight-entry';s.mode=1;s.remaining=OLEANDER_FLY_FRAMES;out.remainder=0;return finish();
 }
 if(['Flight_End','Boss_6A','Boss_6A_Air'].includes(state)||/^JumpFall|^JumpLand|^Stand|^s\.Hit|^c\.Hit|^j\.Hit|^Hit_|^Throw/.test(state))return clear();
 if(s.mode===1){
  if(state==='Flight_N_BG'){s.mode=2;s.remaining=0;out.remainder=0;}
  else if(/^Flight_/.test(state)){
   s.remaining=Math.max(0,s.remaining-1);
   if(s.remaining===0)return exit('Flight_End','three-second-timeout');
   return finish();
  }else return clear(); // Native 6A/other native exits own their animation.
 }
 if(s.mode===2){
  if(['Flight_N','Flight_F','Flight_B'].includes(state))return clear();
  const debt=out.remainder+50,cost=Math.floor(debt/60);out.remainder=debt%60;
  if(cost>0)out.meter=Math.max(0,meter-cost);
  if(meter===0||(cost>0&&meter<=cost)){out.meter=0;return exit('Boss_6A_Air','background-meter-empty');}
  return finish();
 }
 return finish();
}
if(typeof module!=='undefined')module.exports={OLEANDER_FLY_FRAMES,OLEANDER_SLOT_MAGIC,oleanderControlDecode,oleanderControlEncode,oleanderBalanceStep};
