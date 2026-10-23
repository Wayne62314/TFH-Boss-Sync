'use strict';
// Shares the existing native input hook: never adds a competing hook or host key.
function createNativeDualOleander(base,profile,api){
 function verify(){
  const expected={slot87:328,slot88:329,slot89:330,magicmeter:69,magicmeterperlevel:71,superbar:66},seen=new Set();
  const head=base.add(profile.registry+8).readPointer();if(head.isNull())throw Error('Missing Oleander registry');
  let node=head.readPointer();for(let i=0;i<2048&&!node.equals(head);i++,node=node.readPointer()){
   const name=api.str(node.add(0x10)).toLowerCase();if(Object.prototype.hasOwnProperty.call(expected,name)){
    if(node.add(0x30).readU8()!==1||node.add(0x34).readU16()!==expected[name])throw Error('Oleander slot layout mismatch: '+name);seen.add(name);
   }
  }if(seen.size!==6)throw Error('Oleander native resource fields missing');
 }
 verify();
 const make=new NativeFunction(base.add(profile.make),'pointer',['pointer'],{scheduling:'exclusive'});
 const enqueue=new NativeFunction(base.add(profile.enqueue),'void',['pointer','pointer','int','pointer'],{scheduling:'exclusive'});
 const commands=new Map();let count=0;
 for(const name of ['Flight_End','Boss_6A_Air','Stand']){const p=Memory.alloc(32);p.writeByteArray(new Uint8Array(32));p.writeUtf8String(name);p.add(16).writeU64(name.length);p.add(24).writeU64(15);commands.set(name,p);}
 function writable(p,n){const r=Process.findRangeByAddress(p);if(!r||!r.protection.includes('w')||p.add(n).compare(r.base.add(r.size))>0)throw Error('Unwritable Oleander field');}
 function validateStates(data){
  const b=data.add(0xd88).readPointer(),e=data.add(0xd90).readPointer(),n=e.sub(b).toInt32()/8;if(!Number.isInteger(n)||n<1||n>4096)throw Error('Invalid Oleander state table');
  const found=new Set();for(let i=0;i<n;i++){const p=b.add(i*8).readPointer();if(!p.isNull())found.add(api.str(p.add(0x10)));}
  for(const name of ['Flight_Start','Flight_N','Flight_N_BG','Flight_End','Boss_6A','Boss_6A_Air','Stand'])if(!found.has(name))throw Error('Missing Oleander state: '+name);
 }
 return {verify,status(){return {oleanderCommands:count};},reset(scene){
  const snap=api.inspect(scene),rows=snap?snap.players.filter(r=>r.name==='Uni'):[];
  for(const r of rows){
   const p=r.actor.add(0x540),tag=p.readFloat();
   if(tag!==0&&tag!==OLEANDER_SLOT_MAGIC)throw Error('Oleander slot87 already used');
   if(tag===0&&(p.add(4).readFloat()!==0||p.add(8).readFloat()!==0))throw Error('Oleander slot88/89 already used');
   writable(p,12);validateStates(r.data);
  }
  for(const r of rows){r.actor.add(0x540).writeFloat(OLEANDER_SLOT_MAGIC);r.actor.add(0x544).writeFloat(0);r.actor.add(0x548).writeFloat(0);}
 },evaluate(row,scene,args,context){
  if(row.actor.add(0x540).readFloat()!==OLEANDER_SLOT_MAGIC)throw Error('Oleander reserved slot overwritten; restart both games');
  const state=api.str(row.actor.add(0xc58).readPointer().add(0x10));
  const plan=oleanderBalanceStep({control:row.actor.add(0x544).readFloat(),remainder:row.actor.add(0x548).readFloat(),state,
   input:Array.from(new Uint8Array(args[1].readByteArray(8))),meter:row.actor.add(0x128).readFloat(),magic:row.actor.add(0x134).readFloat(),magicUnit:row.actor.add(0x13c).readFloat(),hp:row.hp});
  let manager=null;if(plan.action){manager=scene.add(0x2f8).readPointer();if(manager.isNull())throw Error('Missing Oleander command manager');validateStates(row.data);}
  row.actor.add(0x544).writeFloat(plan.control);row.actor.add(0x548).writeFloat(plan.remainder);
  if(plan.consume){const p=Memory.alloc(0x50);Memory.copy(p,args[1],0x50);for(let i=3;i<=30;i++)p.add(i).writeU8(4);context.inputCopy=p;args[1]=p;}
  context.oleander={row,scene,plan,manager,state};
 },afterInput(context){
  const c=context.oleander;if(!c||!api.active())return;
  if(!c.scene.equals(api.current())||!c.row.actor.add(0xc50).readPointer().equals(c.row.data))throw Error('Oleander generation changed during input');
  const {row,plan}=c;
  if(plan.magic!==null){writable(row.actor.add(0x134),4);row.actor.add(0x134).writeFloat(plan.magic);}
  if(plan.meter!==null){writable(row.actor.add(0x128),4);row.actor.add(0x128).writeFloat(plan.meter);}
  if(plan.action){
   const closure=make(commands.get(plan.action));if(closure.isNull())throw Error('Cannot create Oleander exit');
   const fn=Memory.alloc(0x40);fn.writeByteArray(new Uint8Array(0x40));fn.add(0x38).writePointer(closure);enqueue(c.manager,row.actor,0,fn);count++;
  }
  if(plan.reason)api.emit('oleander_balance',{side:row.side,state:c.state,reason:plan.reason,action:plan.action,magic:row.actor.add(0x134).readFloat(),meter:row.actor.add(0x128).readFloat(),control:plan.control,remainder:plan.remainder});
 }};
}
