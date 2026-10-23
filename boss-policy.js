'use strict';
const BOSS_FLAG=0x08000000;
function dualBossMode(kind,training){return kind===0||kind===1||kind===11||(kind===10&&training===1);}
function dualBossEligible(row){return row&&[1,2].includes(row.side)&&Number.isInteger(row.slot)&&
 row.slot>=(row.side===1?0:3)&&row.slot<=(row.side===1?2:5)&&row.team===row.side&&row.name==='Uni'&&
 row.stateReady===true&&Number.isFinite(row.hp)&&row.hp>0;}
function dualBossFlags(flags){return (flags|BOSS_FLAG)>>>0;}
if(typeof module!=='undefined')module.exports={BOSS_FLAG,dualBossMode,dualBossEligible,dualBossFlags};
