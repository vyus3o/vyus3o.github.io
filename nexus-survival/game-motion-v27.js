/* NEXUS SURVIVAL cinematic motion + detail layer build 0.27
 * Rendering/UI polish only. No combat, balance, progression or network authority changes.
 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const pstate=new Map(),estate=new Map(),bossState=new Map();
const coarse=()=>!!window.matchMedia?.('(pointer:coarse)').matches;
const now=()=>g?.t||0;
const biome=()=>Math.max(0,Math.min(4,Math.floor((g?.stage||0)/10)));
const h=(n,s=0)=>{const x=Math.sin((Number(n)||0)*91.731+s*37.17)*43758.5453;return x-Math.floor(x)};
const classColor=p=>C?.[p?.cls]?.col||'#d8ff65';
const biomeCols=['#a8bd67','#9bd36a','#bdefff','#ff8b4a','#bd91ff'];
function line(x1,y1,x2,y2,c,w=2,a=1){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function ring(x,y,r,c,w=2,a=1,start=0,end=TAU){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.restore()}
function glow(x,y,r,c,a=.12){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
function diamond(x,y,s,c,a=.5,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=a;ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.65,0);ctx.lineTo(0,s);ctx.lineTo(-s*.65,0);ctx.closePath();ctx.fill();ctx.restore()}
function hex(x,y,r,c,a=.5,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<6;i++){const q=-Math.PI/2+i*TAU/6,xx=Math.cos(q)*r,yy=Math.sin(q)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.stroke();ctx.restore()}

const css=document.createElement('style');
css.id='motionDetailV27';
css.textContent=`
@keyframes v27CardIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
@keyframes v27BossIn{0%{opacity:0;transform:translateY(-8px) scale(.98)}100%{opacity:1;transform:none}}
@keyframes v27BuffIn{0%{opacity:0;transform:translateX(10px)}100%{opacity:1;transform:none}}
@keyframes v27Pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.16)}}
.choice,.advanceCard,.classCard{animation:v27CardIn .22s ease-out both;transform-origin:center}
.choice:nth-child(2),.advanceCard:nth-child(2),.classCard:nth-child(2){animation-delay:.035s}
.choice:nth-child(3),.advanceCard:nth-child(3),.classCard:nth-child(3){animation-delay:.07s}
.choice:nth-child(4),.advanceCard:nth-child(4),.classCard:nth-child(4){animation-delay:.105s}
#bosshud:not(.hidden){animation:v27BossIn .3s ease-out both}
#buffTracker>*{animation:v27BuffIn .18s ease-out both}
#hud .fill{transition:width .10s linear}
.startBtn,.rewardBtn,.nexusBtn,.modeBtn,.miniBtn{transition:transform .10s ease,filter .10s ease,border-color .12s ease}
.startBtn:active,.rewardBtn:active,.nexusBtn:active,.modeBtn:active,.miniBtn:active{transform:scale(.985);filter:brightness(1.16)}
#bosshud .bossbar{animation:v27Pulse 1.45s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.choice,.advanceCard,.classCard,#bosshud:not(.hidden),#buffTracker>*{animation:none!important}#hud .fill{transition:none!important}}
`;
document.head.appendChild(css);

const prevShadow27=shadow;
shadow=function(x,y,w=34){
 prevShadow27(x,y,w);
 ctx.save();
 ctx.globalAlpha=.16;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y+14),w*.32,4.2,0,0,TAU);ctx.fill();
 ctx.globalAlpha=.08;ctx.beginPath();ctx.ellipse(Math.round(x-2),Math.round(y+12),w*.48,6.5,0,0,TAU);ctx.fill();
 ctx.restore();
};

const prevTerrain27=terrain;
terrain=function(){
 prevTerrain27();
 if(!g)return;
 const t=now(),cam=g.cam||{x:0,y:0},th=biome(),count=coarse()?9:18,col=biomeCols[th];
 ctx.save();
 for(let i=0;i<count;i++){
  const sx=h(i+11,th),sy=h(i+47,th),sp=.35+h(i+93,th)*.8;
  let x=cam.x+((sx*W+t*(th===2?18:th===3?7:4)*sp+i*17)%W);
  let y=cam.y+((sy*H+(th===1||th===3?-t*20*sp:t*8*sp)+H*4)%H);
  const phase=t*(1.2+sp)+i;
  if(th===0){
   ctx.globalAlpha=.18+.12*Math.sin(phase);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+5);ctx.quadraticCurveTo(x+Math.sin(phase)*4,y,x+Math.sin(phase)*5,y-8);ctx.stroke();
  }else if(th===1){
   glow(x+Math.sin(phase)*5,y,2.2+(i%3),col,.10+.08*Math.sin(phase*.7)**2);
  }else if(th===2){
   ctx.globalAlpha=.28;ctx.fillStyle='#eaffff';ctx.fillRect(Math.round(x),Math.round(y),i%3===0?3:2,i%3===0?3:2);line(x-3,y+4,x+3,y-4,'#d9f7ff',1,.12);
  }else if(th===3){
   const rise=((sy*H-t*28*sp+H*6)%H);y=cam.y+rise;glow(x+Math.sin(phase)*7,y,2+(i%2),'#ff9b4e',.16);line(x,y+5,x+Math.sin(phase)*3,y-5,'#ffcc72',1,.20);
  }else{
   const rr=4+4*h(i+5,th);ring(x,y,rr,col,1,.12,phase,phase+1.6);glow(x,y,1.7,'#d7b8ff',.18);
  }
 }
 ctx.restore();
};

const prevNexus27=drawNexus;
drawNexus=function(n,t){
 prevNexus27(n,t);
 if(!n)return;
 const hp=clamp((n.hp??n.max??1)/Math.max(1,n.max??n.hp??1),0,1),pulse=.5+.5*Math.sin(t*3.4),danger=hp<.35;
 const col=danger?'#ff7b62':'#c8ff88';
 glow(n.x,n.y-18,32+5*pulse,col,danger?.11:.08);
 for(let i=0;i<3;i++){const a=t*(i%2?-.45:.35)+i*2.1;ring(n.x,n.y+3,66+i*7,col,1.5,.16+i*.035,a,a+1.15)}
 for(let i=0;i<4;i++){const a=t*.55+i*TAU/4,r=43+4*Math.sin(t*2+i);diamond(n.x+Math.cos(a)*r,n.y-18+Math.sin(a)*r*.45,2.4,col,.45,a)}
 if(danger){for(let i=0;i<3;i++){const a=t*2+i*2.1;line(n.x+Math.cos(a)*20,n.y-18+Math.sin(a)*13,n.x+Math.cos(a)*35,n.y-18+Math.sin(a)*24,'#ff8b65',1.5,.22+.12*pulse)}}
};

const prevBasic27=doBasicAttack;
doBasicAttack=function(p,t){
 if(p&&t&&g){p._v27AttackUntil=g.t+(p.cls==='gunslinger'?.09:p.cls==='rogue'?.13:.16);p._v27AttackAngle=Math.atan2(t.y-p.y,t.x-p.x)}
 return prevBasic27(p,t);
};
const prevRunSkills27=runSkills;
runSkills=function(p,dt){
 const beforeFx=g?.fx?.length||0,beforeQ=g?.q?.length||0,beforeZ=g?.zones?.length||0,beforeD=g?.delayed?.length||0;
 const out=prevRunSkills27(p,dt);
 if(p&&g&&((g.fx?.length||0)>beforeFx||(g.q?.length||0)>beforeQ||(g.zones?.length||0)>beforeZ||(g.delayed?.length||0)>beforeD))p._v27CastUntil=Math.max(p._v27CastUntil||0,g.t+.18);
 return out;
};

function playerMotion(p){
 let s=pstate.get(p.id);if(!s){s={x:p.x,y:p.y,vx:0,vy:0,speed:0,lastT:now(),trail:[]};pstate.set(p.id,s)}
 const tt=now(),dt=Math.max(1/120,Math.min(.08,tt-s.lastT||1/60)),dx=p.x-s.x,dy=p.y-s.y;
 const vx=dx/dt,vy=dy/dt,spd=Math.min(1,Math.hypot(vx,vy)/Math.max(1,p.spd||220));
 s.vx=lerp(s.vx,vx,.22);s.vy=lerp(s.vy,vy,.22);s.speed=lerp(s.speed,spd,.18);s.x=p.x;s.y=p.y;s.lastT=tt;
 if(Math.hypot(dx,dy)>22){s.trail.unshift({x:p.x-dx*.65,y:p.y-dy*.65,t:tt});s.trail=s.trail.slice(0,3)}
 s.trail=s.trail.filter(q=>tt-q.t<.22);
 return s;
}
function playerOverlay(p,isLocal,s){
 const t=now(),col=classColor(p),moving=s.speed>.08,step=Math.sin((p.walk||t*8)*1.05),attack=(p._v27AttackUntil||0)>t,cast=(p._v27CastUntil||0)>t,a=p._v27AttackAngle||0;
 if(moving){
  ctx.save();ctx.globalAlpha=.12+.10*Math.abs(step);ctx.fillStyle='#d8c7a080';const side=step>0?-1:1;ctx.fillRect(Math.round(p.x-8*side),Math.round(p.y+17),5,2);ctx.fillRect(Math.round(p.x+5*side),Math.round(p.y+19),4,2);ctx.restore();
 }
 for(const q of s.trail){const life=clamp(1-(t-q.t)/.22,0,1);ctx.save();ctx.globalAlpha=.08*life;ctx.fillStyle=col;ctx.fillRect(q.x-9,q.y-20,18,32);ctx.restore()}
 if(isLocal&&moving){const ang=Math.atan2(s.vy,s.vx);line(p.x-Math.cos(ang)*16,p.y-Math.sin(ang)*12,p.x-Math.cos(ang)*28,p.y-Math.sin(ang)*20,col,1.5,.12*s.speed)}
 if(p.cls==='warrior'){
  if(attack){const pr=clamp((p._v27AttackUntil-t)/.16,0,1),ang=a-.45+(.9*(1-pr));ring(p.x,p.y,31,col,4,.38,ang-.55,ang+.55);line(p.x+Math.cos(a)*15,p.y+Math.sin(a)*12,p.x+Math.cos(a)*34,p.y+Math.sin(a)*28,'#fff3d5',2,.45)}
  else line(p.x+13,p.y-18+step*1.5,p.x+18,p.y-26+step*2,'#e6d0b5',1.5,.24);
 }else if(p.cls==='archer'){
  const pull=attack?8:2+Math.abs(step)*2;line(p.x+14,p.y-12,p.x+14-pull,p.y,'#e9d6ad',1,.38);line(p.x+14-pull,p.y,p.x+14,p.y+13,'#e9d6ad',1,.38);if(attack)line(p.x+11,p.y,p.x+34,p.y,'#efffcf',2,.52);
 }else if(p.cls==='mage'){
  for(let i=0;i<3;i++){const q=t*1.7+i*TAU/3,r=18+2*Math.sin(t*2+i);diamond(p.x+Math.cos(q)*r,p.y-8+Math.sin(q)*r*.48,2.2,i===0?'#b9c7ff':col,.28,q)}if(cast)ring(p.x,p.y-3,27+3*Math.sin(t*16),'#cad5ff',2,.35,t,t+4.4);
 }else if(p.cls==='priest'){
  for(let i=0;i<2;i++){const q=t*1.1+i*Math.PI,yy=p.y-10-((t*17+i*13)%24);glow(p.x+Math.sin(q+i)*12,yy,2,'#fff3ad',.20)}if(cast){line(p.x,p.y-32,p.x,p.y-14,'#fff9d7',2,.44);line(p.x-7,p.y-23,p.x+7,p.y-23,'#fff9d7',2,.44)}
 }else if(p.cls==='necromancer'){
  for(let i=0;i<2;i++){const q=t*1.4+i*Math.PI,rr=21+i*4;glow(p.x+Math.cos(q)*rr,p.y-13+Math.sin(q)*9,3.5,'#b995df',.18);line(p.x+Math.cos(q)*rr,p.y-13+Math.sin(q)*9,p.x+Math.cos(q-.35)*(rr+5),p.y-8+Math.sin(q-.35)*12,'#9c7cc4',1,.16)}if(cast)ring(p.x,p.y-5,28,'#b796df',1.5,.25,t*.8,t*.8+4.7);
 }else if(p.cls==='rogue'){
  const dir=(p.face||1);line(p.x-dir*7,p.y-19,p.x-dir*(18+8*s.speed),p.y-16+step*3,'#6ba589',3,.26);if(attack){line(p.x+Math.cos(a-.4)*8,p.y+Math.sin(a-.4)*8,p.x+Math.cos(a-.4)*31,p.y+Math.sin(a-.4)*31,'#d9ffe9',2.5,.62);line(p.x+Math.cos(a+.35)*8,p.y+Math.sin(a+.35)*8,p.x+Math.cos(a+.35)*29,p.y+Math.sin(a+.35)*29,'#9fe3c0',2,.50)}
 }else if(p.cls==='gunslinger'){
  if(attack){const mx=p.x+Math.cos(a)*26,my=p.y+Math.sin(a)*26;glow(mx,my,7,'#ffd47d',.33);for(let i=0;i<3;i++){const q=a+(i-1)*.24;line(mx,my,mx+Math.cos(q)*(8+i*2),my+Math.sin(q)*(8+i*2),'#ffe5a7',1.5,.46)}}else{line(p.x-14,p.y-3+step,p.x-25,p.y+2+step*1.5,'#b47b52',2,.18);}
 }
 if(cast&&!['mage','priest','necromancer'].includes(p.cls))ring(p.x,p.y-3,24,col,1.5,.16,t*.7,t*.7+4.8);
}

const prevDrawPlayer27=drawPlayer;
drawPlayer=function(p,isLocal=false){
 if(!p)return prevDrawPlayer27(p,isLocal);
 const s=playerMotion(p),t=now(),attack=(p._v27AttackUntil||0)>t,cast=(p._v27CastUntil||0)>t;
 const sway=Math.sin((p.walk||t*7))*s.speed,rot=clamp((s.vx/Math.max(1,p.spd||220))*.035,-.04,.04)+(attack?Math.sin((p._v27AttackUntil-t)*34)*.018:0);
 const sx=1+.018*s.speed*Math.abs(sway)+(attack?.025:0),sy=1-.014*s.speed*Math.abs(sway)+(cast?.018:0),lunge=attack?2.8:0,a=p._v27AttackAngle||0;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rot);ctx.scale(sx,sy);ctx.translate(-p.x+Math.cos(a)*lunge,-p.y+Math.sin(a)*lunge);prevDrawPlayer27(p,isLocal);ctx.restore();
 playerOverlay(p,isLocal,s);
};

function enemyMotion(e){
 const id=e.id??e;let s=estate.get(id);if(!s){s={x:e.x,y:e.y,hp:e.hp,hitUntil:0,phase:0};estate.set(id,s)}
 const t=now(),dx=e.x-s.x,dy=e.y-s.y;s.speed=lerp(s.speed||0,Math.min(1,Math.hypot(dx,dy)/7),.2);
 if(Number.isFinite(s.hp)&&Number.isFinite(e.hp)&&e.hp<s.hp-.01)s.hitUntil=t+.11;
 s.x=e.x;s.y=e.y;s.hp=e.hp;return s;
}
function enemyTransform(e,s){
 const t=now(),phase=(e.anim||t*7)+(Number(e.type)||0)*.8,type=((e.type||0)%5+5)%5,hit=s.hitUntil>t;
 let sx=1,sy=1,dy=0,rot=0;
 if(e.boss){sx=1+.018*Math.sin(t*2.1);sy=1-.014*Math.sin(t*2.1);dy=Math.sin(t*1.9)*1.2}
 else if(type===0){rot=.018*Math.sin(phase);dy=Math.abs(Math.sin(phase))*-1.4;sy=1+.018*Math.abs(Math.sin(phase))}
 else if(type===1){sx=1+.045*Math.sin(phase*1.25);sy=1-.025*Math.sin(phase*1.25);dy=Math.abs(Math.sin(phase*1.25))*-1}
 else if(type===2){dy=Math.sin(phase*.9)*2.5;rot=.025*Math.sin(phase*.7);sx=1+.025*Math.sin(phase)}
 else if(type===3){dy=Math.abs(Math.sin(phase*.72))*-1;sy=1+.025*Math.abs(Math.sin(phase*.72));rot=.012*Math.sin(phase*.55)}
 else{dy=Math.sin(phase*.62)*1.8;rot=.018*Math.sin(phase*.48)}
 if(e.variant==='swift'){sx*=1+.02*Math.sin(phase*1.6);rot*=1.5}
 if(e.variant==='brute'){sy*=1+.015*Math.sin(phase*.5)}
 if(hit){const q=(s.hitUntil-t)/.11;sx*=1+.035*q;sy*=1-.035*q;rot+=Math.sin(q*Math.PI)*.05}
 return {sx,sy,dy,rot,hit};
}
function enemyOverlay(e,s){
 const t=now(),th=biome(),col=e.gradeColor||biomeCols[th],type=((e.type||0)%5+5)%5,phase=(e.anim||t*7),spd=s.speed||0;
 if(e.boss){
  let bs=bossState.get(e.id);if(!bs){bs={seen:t,band:3,phaseAt:-99};bossState.set(e.id,bs)}
  const hp=clamp(e.hp/Math.max(1,e.max),0,1),band=hp>.66?3:hp>.33?2:1;if(band<bs.band){bs.band=band;bs.phaseAt=t}
  const tier=e.bossTier||'normal',rings=tier==='major'?3:tier==='mid'?2:1,entry=t-bs.seen;
  for(let i=0;i<rings;i++){const r=(e.r||48)+15+i*9+Math.sin(t*2+i)*3;ring(e.x,e.y+8,r,col,2,.13+i*.035,t*(i%2?-.5:.4)+i,t*(i%2?-.5:.4)+i+3.9)}
  if(entry<1.15){const p=clamp(entry/1.15,0,1);ring(e.x,e.y,(e.r||48)*(1.9-p*.55),col,4,(1-p)*.55);glow(e.x,e.y,(e.r||48)*(1.4-p*.2),col,(1-p)*.12)}
  if(t-bs.phaseAt<.8){const p=(t-bs.phaseAt)/.8;ring(e.x,e.y,(e.r||48)*(1.1+p*1.35),'#fff4cc',4,(1-p)*.55);for(let i=0;i<8;i++){const a=i*TAU/8+t*.4;line(e.x+Math.cos(a)*(e.r||48)*.7,e.y+Math.sin(a)*(e.r||48)*.5,e.x+Math.cos(a)*(e.r||48)*(1.2+p*.8),e.y+Math.sin(a)*(e.r||48)*(.9+p*.5),col,3,(1-p)*.42)}}
  if(hp<.25){const p=.5+.5*Math.sin(t*9);glow(e.x,e.y-10,(e.r||48)*.75,'#ff7a67',.04+.05*p)}
  for(let i=0;i<(tier==='major'?5:3);i++){const a=t*(.45+i*.03)+i*TAU/5,r=(e.r||48)*(1.05+.15*(i%2));glow(e.x+Math.cos(a)*r,e.y-8+Math.sin(a)*r*.45,2.5,col,.16)}
  return;
 }
 if(spd>.22&&(type===0||type===1||type===3)){const a=phase*1.15,off=type===1?16:9;ctx.save();ctx.globalAlpha=.08+.07*spd;ctx.fillStyle=col;ctx.fillRect(Math.round(e.x-off+Math.sin(a)*4),Math.round(e.y+15),5,2);ctx.fillRect(Math.round(e.x+off-Math.sin(a)*4),Math.round(e.y+16),4,2);ctx.restore()}
 if(type===2){for(let i=0;i<2;i++){const a=t*1.4+i*Math.PI;glow(e.x+Math.cos(a)*((e.r||18)+5),e.y+Math.sin(a)*8,1.6,col,.14)}}
 if(type===4){const p=.5+.5*Math.sin(t*3.2+(Number(e.id)||0));glow(e.x,e.y-(e.r||18)-5,3.5,col,.10+.08*p)}
 if(s.hitUntil>t)ring(e.x,e.y,e.r+5,'#fff6df',2,.18);
}

const prevDrawEnemy27=drawEnemy;
drawEnemy=function(e){
 if(!e)return prevDrawEnemy27(e);
 const s=enemyMotion(e),m=enemyTransform(e,s);
 ctx.save();ctx.translate(e.x,e.y+m.dy);ctx.rotate(m.rot);ctx.scale(m.sx,m.sy);ctx.translate(-e.x,-e.y);prevDrawEnemy27(e);ctx.restore();
 enemyOverlay(e,s);
};

const prevDrawProjectile27=drawProjectile;
drawProjectile=function(q){
 if(q&&Number.isFinite(q.vx)&&Number.isFinite(q.vy)){
  const sp=Math.hypot(q.vx,q.vy),nx=sp?(-q.vx/sp):0,ny=sp?(-q.vy/sp):0,len=clamp(sp*.035,7,31),col=q.col||'#fff';
  line(q.x,q.y,q.x+nx*len,q.y+ny*len,col,Math.max(1,Math.min(3,(q.size||3)*.38)),.16);
  if((q.pierce||0)>2||q.size>=8)line(q.x+nx*4,q.y+ny*4,q.x+nx*(len+12),q.y+ny*(len+12),'#fff8d8',1,.10);
 }
 prevDrawProjectile27(q);
};

const prevDrawFx27=drawFx;
drawFx=function(f){
 prevDrawFx27(f);if(!f||!g)return;
 const a=clamp(f.life/Math.max(.01,f.max||1),0,1),p=1-a,t=now(),c=f.col||'#fff',r=f.r||40;
 if(['meteor','explosion','arcaneexplode','holyburst','judgment'].includes(f.type)){
  for(let i=0;i<6;i++){const q=i*TAU/6+h(i+f.x,2)*.25,rr=r*(.25+p*.7);line(f.x+Math.cos(q)*rr,f.y+Math.sin(q)*rr,f.x+Math.cos(q)*(rr+9+12*p),f.y+Math.sin(q)*(rr+9+12*p),c,1.5,.14*a)}
 }else if(['chain','lightning','lightningStrike'].includes(f.type)){
  for(let i=0;i<3;i++){const q=t*4+i*TAU/3;glow(f.x+Math.cos(q)*r*.22,f.y+Math.sin(q)*r*.18,2,'#efffff',.16*a)}
 }else if(['shield','prayer','healwave','holy'].includes(f.type)){
  for(let i=0;i<4;i++){const q=t*.7+i*TAU/4;diamond(f.x+Math.cos(q)*r*.45,f.y+Math.sin(q)*r*.35,2.1,'#fff8ce',.12*a,q)}
 }
};

window.NEXUS_MOTION_V27={build:'0.27',renderingOnly:true,playerMotion:true,classAttackMotion:true,enemyGait:true,hitReactions:true,bossEntrance:true,bossPhaseMotion:true,projectileTrails:true,biomeAmbience:true,nexusMotion:true,uiMicroMotion:true,mobileAdaptiveFx:true};
})();
