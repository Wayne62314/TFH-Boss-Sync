const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {OLEANDER_HP_SUBTRACT,OLEANDER_HP_SUBTRACT_FIELDS,oleanderIsHpSubtract,oleanderHalfFinalDamage}=require('./oleander-damage');
test('exact sampled final HP command is 40 bytes; finite final damage halves without rounding up early',()=>{
 assert.equal(OLEANDER_HP_SUBTRACT.length,80);
 for(const x of [0,1,135,601.5167236328125,271.3999938964844,504.3968505859375,479.7252502441406])assert.equal(oleanderHalfFinalDamage(x),x/2);
 for(const x of [-1,NaN,Infinity,1e9])assert.throws(()=>oleanderHalfFinalDamage(x));
});
function harness({side=1,child=false,name=child?'Boss_6A_Pillar_Impact':'Uni',state=child?'6A_Pillar_Impact':'Boss_6A',armed=true,badSignature=false}={}){
 const mem=new Map(),bytes=new Map(),texts=new Map(),events=[],writes=[];let callback,gateSource,hooked=false;
 class P{
  constructor(n){this.n=Number(n);}add(n){return new P(this.n+n);}sub(p){return new P(this.n-p.n);}toInt32(){return this.n;}isNull(){return this.n===0;}equals(p){return this.n===p.n;}compare(p){return Math.sign(this.n-p.n);}
  readU8(){return bytes.get(this.n)||0;}readPointer(){return new P(mem.get(this.n)||0);}readFloat(){return mem.get(this.n)||0;}
  writeFloat(v){mem.set(this.n,v);writes.push([this.n,v]);}
 }
 const base=new P(0x1000),profile={subtract:0x100},scene=new P(0x20000),root=new P(0x100000),victim=root.add(0x14a0),source=child?root.add(0x14a0*2):root,operand=new P(0x900000);
 const data=new P(0x700000),st=new P(0x800000);
 const sig=[0xf3,0x0f,0x10,0x45,0xc0,0xf3,0x0f,0x5c,0x45,0xc4,0xe9,0x81,0x05,0,0];sig.forEach((b,i)=>bytes.set(base.n+profile.subtract+i,b));if(badSignature)bytes.set(base.n+profile.subtract,0);
 mem.set(scene.n+0xa68,root.n);mem.set(scene.n+0xa70,root.n+0x14a0*3);mem.set(victim.n+0xb28,source.n);mem.set(source.n+0xb30,root.n);
 mem.set(source.n+0xc50,data.n);mem.set(source.n+0xc58,st.n);texts.set(data.n+0xb40,name);texts.set(st.n+0x10,state);mem.set(root.n+0x540,0x4f4c05);
 const api={active:()=>armed,current:()=>scene,initialized:()=>true,str:p=>texts.get(p.n),
  inspect:()=>({players:[{actor:root,side,name:'Uni',hp:1000},{actor:victim,side:side===1?2:1,name:'Cow',hp:1000}]}),fail:e=>{throw e;},emit:(event,p)=>events.push({event,...p})};
 const ctx={Process:{findRangeByAddress:p=>({base:p,size:4,protection:'rw-'})},
  NativeCallback:function(fn){callback=fn;return fn;},CModule:function(code){gateSource=code;return{onEnter:new P(0x600000)};},Interceptor:{attach(){hooked=true;return {detach(){}};}}};
 vm.createContext(ctx);vm.runInContext('const OLEANDER_SLOT_MAGIC=0x4f4c05;\n'+fs.readFileSync('oleander-damage.js','utf8'),ctx);
 return {events,writes,get gateSource(){return gateSource;},get hooked(){return hooked;},start(){const a=ctx.createNativeDualOleanderDamage(base,profile,api);a.install();},
  hit(value,hp=4800){mem.set(victim.n+0x1e8,value);mem.set(victim.n+0x120,hp);mem.set(operand.n,value);callback(victim,operand);return {damage:mem.get(victim.n+0x1e8),operand:mem.get(operand.n),hpBeforeStore:mem.get(victim.n+0x120),newHP:hp-mem.get(operand.n)};}
 };
}
for(const side of [1,2])for(const child of [false,true])test('native callback side '+side+' '+(child?'pillar':'body')+' scales before HP store and repeats per contact',()=>{
 const h=harness({side,child});h.start();assert.ok(h.gateSource.includes('p[4]!=64'));assert.ok(h.gateSource.includes('c->rbp-0x3c'));
 for(const d of [601.5167236328125,271.3999938964844,504.3968505859375,479.7252502441406]){const r=h.hit(d);assert.equal(r.damage,d/2);assert.equal(r.operand,d/2);assert.equal(r.hpBeforeStore,4800);}
 assert.equal(h.events.length,4);
});
test('half damage is applied before potentially lethal subtraction, not as an HP refund',()=>{
 const h=harness();h.start();const r=h.hit(600,400);assert.equal(r.newHP,100);assert.equal(r.hpBeforeStore,400);assert.ok(h.writes.every(([p])=>p!==0x100000+0x14a0+0x120));
});
test('ordinary Oleander attacks, unrelated summons and disabled tool are untouched',()=>{
 for(const options of [{state:'s.Jab'},{child:true,name:'ShadowBall',state:'Fly'},{armed:false}]){const h=harness(options);h.start();assert.equal(h.hit(600).damage,600);assert.equal(h.writes.length,0);}
});
test('bad subtraction signature refuses before hook installation',()=>{
 const h=harness({badSignature:true});assert.throws(()=>h.start(),/signature mismatch/);assert.equal(h.hooked,false);
});
test('old and freshly restarted native records match despite changed padding',()=>{
 const old=Buffer.from(OLEANDER_HP_SUBTRACT,'hex');
 const fresh=Buffer.from('01cd5bb64000000001fba6c67200000001000000400000000003b806d60000000000000000000000','hex');
 assert.notDeepEqual(old,fresh);assert.ok(oleanderIsHpSubtract(old));assert.ok(oleanderIsHpSubtract(fresh));
 const fields=new Set(OLEANDER_HP_SUBTRACT_FIELDS.map(([i])=>i));
 for(let i=0;i<40;i++)if(!fields.has(i)){const changed=Buffer.from(fresh);changed[i]^=255;assert.ok(oleanderIsHpSubtract(changed),'ignore padding byte '+i);}
});
test('all semantic field mismatches reject, including chip/true damage and alternate destination',()=>{
 const source=Buffer.from(OLEANDER_HP_SUBTRACT,'hex');
 for(const [i]of OLEANDER_HP_SUBTRACT_FIELDS){const changed=Buffer.from(source);changed[i]^=1;assert.equal(oleanderIsHpSubtract(changed),false,'reject semantic byte '+i);}
 for(const index of [116,117]){const changed=Buffer.from(source);changed[12]=index;assert.equal(oleanderIsHpSubtract(changed),false);}
});
