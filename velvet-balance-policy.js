'use strict';
const VELVET_MODE_FRAMES=360,VELVET_SLOT_MAGIC=0x565603;
function velvetControlDecode(value){
 if(!Number.isInteger(value)||value<0||value>VELVET_MODE_FRAMES*64+63)throw Error('Invalid native Velvet control');
 return {used:value&7,active:!!(value&8),exiting:!!(value&16),awaitingStart:!!(value&32),remaining:Math.floor(value/64)};
}
function velvetControlEncode(s){return s.remaining*64+s.used+(s.active?8:0)+(s.exiting?16:0)+(s.awaitingStart?32:0);}
function velvetInputDecode(value){
 if(!Number.isInteger(value)||value<0||value>511)throw Error('Invalid native Velvet motion tracker');
 return {down:!!(value&1),phase:(value>>1)&3,window:value>>3};
}
function velvetInputEncode(s){return (s.down?1:0)+(s.phase<<1)+(s.window<<3);}
// Pure transition: all state is supplied by/restored to native sprite slots.
// No host clock, external frame counter, input cache or random numbers.
function velvetBalanceStep({control=0,tracker=0,state,input,meter,unit,hp=1}){
 const s=velvetControlDecode(control),m=velvetInputDecode(tracker);
 if(!Array.isArray(input)||input.length<8||input.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid input');
 if(!Number.isFinite(meter)||meter<0||!Number.isFinite(unit)||unit<=0)throw Error('Invalid native meter');
 const out={control,tracker,consume:false,action:null,meter:null,modeTimer:null,reason:null};
 const press=input.slice(3,7).map(v=>v===0),single=i=>press[i]&&input.slice(3,7).every((v,j)=>i===j||v===4);
 function result(){out.control=velvetControlEncode(s);out.tracker=velvetInputEncode(m);return out;}
 function exit(reason){s.active=false;s.awaitingStart=false;s.exiting=true;s.remaining=30;out.action='IcePrison';out.consume=true;out.meter=unit;out.modeTimer=null;out.reason=reason;return result();}
 if(hp<=0){return {...out,control:0,tracker:0};}
 if(s.exiting){if(!s.awaitingStart){s.remaining=Math.max(0,s.remaining-1);if(s.remaining===0)throw Error('Exit super did not start');}return result();} // awaitingStart now acknowledges the exit super; never dispatch twice.
 if(s.active){
  if(/^Boss_/.test(state)){if(s.awaitingStart)out.modeTimer=s.remaining;s.awaitingStart=false;}
  else if(!s.awaitingStart){return {...out,control:0,tracker:velvetInputEncode(m)};}
  s.remaining=Math.max(0,s.remaining-1);
  // Native commands are queued: idle immediately after enqueue is NOT completion.
  // phase 1 waits for the ice state, phase 2 waits for its return to idle.
  if(m.phase===1){
   if(/^Boss_Ice[LMH]$/.test(state)){m.phase=2;m.window=0;}
   else {m.window=Math.max(0,m.window-1);if(m.window===0)throw Error('Queued Velvet ice did not start');}
  }else if(m.phase===2&&state==='Boss_Wind_Idle'){m.phase=0;m.window=0;}
  // Keep an exit request in the native tracker until the current ice finishes.
  if(single(3))m.down=true;
  const exitRequested=m.down;
  if(single(3)&&m.phase===0)return exit('manual');
  if(state==='Boss_Wind_Idle'&&m.phase===0){
   if(exitRequested)return exit('manual');
   if(s.remaining===0)return exit('timeout');
   if(s.used===7)return exit('all-three-complete');
  }
  if(state==='Boss_Wind_Idle'&&m.phase===0)for(let i=0;i<3;i++)if(single(i)){
   out.consume=true;
   if(!(s.used&(1<<i))){s.used|=1<<i;m.phase=1;m.window=30;out.action=['Boss_IceL','Boss_IceM','Boss_IceH'][i];out.reason='ice';}
   else out.reason='already-used';
   break;
  }
  if(s.awaitingStart&&s.remaining<VELVET_MODE_FRAMES-10)throw Error('Boss installation did not start');
  return result();
 }
 const ground=['Stand','Stand_Flourish','Crouch','Crouching','Uncrouching','TurnStanding','TurnCrouching'].includes(state);
 if(!ground){m.phase=0;m.window=0;m.down=input[0]===2;return result();}
 if(m.window>0)m.window--;if(m.window===0)m.phase=0;
 const down=input[0]===2;
 if(down&&!m.down){m.phase=m.phase===2?3:1;m.window=20;}
 else if(!down&&m.down&&m.phase===1){m.phase=2;}
 m.down=down;
 if(single(3)&&m.phase===3&&m.window>0){
  m.phase=0;m.window=0;
  if(meter>=unit*2){s.active=true;s.awaitingStart=true;s.exiting=false;s.used=0;s.remaining=VELVET_MODE_FRAMES;
   m.down=false;
   out.action='Boss_Install';out.consume=true;out.meter=meter-unit*2;out.reason='22D';}
 }
 return result();
}
if(typeof module!=='undefined')module.exports={VELVET_MODE_FRAMES,VELVET_SLOT_MAGIC,velvetControlDecode,velvetControlEncode,velvetInputDecode,velvetInputEncode,velvetBalanceStep};
