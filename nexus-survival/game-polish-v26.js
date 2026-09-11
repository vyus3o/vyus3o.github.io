/* NEXUS SURVIVAL opening balance + HUD/VFX polish build 0.26 */
(function(){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- 7-class opening balance ----------
 * Target: every class can comfortably clear STAGE 1 without skills.
 * These multipliers affect BASIC ATTACKS only, preserving late-game active-skill scaling.
 */
const BASIC_MUL={warrior:1.10,archer:1.04,mage:1.22,priest:1.20,necromancer:1.28,rogue:.80,gunslinger:.73};
const OPENING_FADE={mage:.08,necromancer:.08,priest:.04};
const DIFF_OPEN={EASY:1,NORMAL:1.18,HARD:1.24,NIGHTMARE:1.30,HELL:1.36};
function openingDiffMul(){const stage=Math.max(0,g?.stage||0),w=Math.max(0,1-stage/9),target=DIFF_OPEN[typeof diff==='string'?diff:'NORMAL']||1;return 1+(target-1)*w}
const oldBasic26=doBasicAttack;
doBasicAttack=function(p,t){
 if(!p||!t)return oldBasic26(p,t);
 const oldDmg=p.dmg,stage=Math.max(0,g?.stage||0),fade=Math.max(0,1-stage/9),mul=(BASIC_MUL[p.cls]||1)*(1+(OPENING_FADE[p.cls]||0)*fade),beforeQ=g?.q?.length||0;
 let restoreAddFx=null;
 /* Rogue used the generic long 'slash' beam. Convert only its basic attack to a dedicated dagger slash. */
 if(p.cls==='rogue'){
  const realAddFx=addFx;restoreAddFx=realAddFx;
  addFx=function(type,x,y,o={}){
   if(type==='slash'&&o&&o.r>=100)return realAddFx('rogueslash26',x,y,{...o,r:54,r2:18,life:.16,col:'#a7e2c2'});
   return realAddFx(type,x,y,o);
  };
 }
 p.dmg=oldDmg*mul;
 try{oldBasic26(p,t)}finally{p.dmg=oldDmg;if(restoreAddFx)addFx=restoreAddFx}
 /* Innate pre-skill identity to prevent weak opening ranged classes. */
 if(g?.q?.length>beforeQ){
  for(let i=beforeQ;i<g.q.length;i++){
   const q=g.q[i];if(!q||q.ownerId!==p.id)continue;
   if(p.cls==='mage'&&q.skill==='basic')q.explode=Math.max(q.explode||0,1);
   if(p.cls==='necromancer'&&q.skill==='N-BASIC')q.pierce=Math.max(q.pierce||0,1);
  }
 }
};

/* NORMAL+ gets an opening combat assist on all player damage, fading out by STAGE 10.
   EASY is unchanged. This helps the doubled horde without inflating mid/late-game builds. */
const oldDamageEnemy26=damageEnemy;
damageEnemy=function(e,amount,ownerId,o={}){
 const p=typeof playerById==='function'?playerById(ownerId):null,assist=p?openingDiffMul():1;
 const out=oldDamageEnemy26(e,amount*assist,ownerId,o);
 if(e&&p&&g&&((e._hitFx26||0)<=g.t)){
  e._hitFx26=g.t+.09;const map={warrior:['#e6c59d','spark'],archer:['#cce89b','spark'],mage:['#9eb5ff','spark'],priest:['#fff0a0','cross'],necromancer:['#b59ad8','spark'],rogue:['#a7e2c2','x'],gunslinger:['#f2b36b','spark']},v=map[p.cls]||['#fff','spark'];
  addFx('hit26',e.x,e.y,{r:p.cls==='rogue'?13:11,col:v[0],life:.13,net:false});const fx=g.fx[g.fx.length-1];if(fx)fx.style=v[1];
 }
 return out;
};

/* ---------- player marker cleanup ---------- */
playerRingColor=function(id){return({p1:'#d8ff65',p2:'#65d5ff',p3:'#ff9f6b',p4:'#d891ff',p5:'#ff6fae'})[id]||'#eef2e9'};
const oldDrawPlayer26=drawPlayer;
drawPlayer=function(p,isLocal=false){
 if(!p)return oldDrawPlayer26(p,isLocal);
 const realArc=ctx.arc;
 /* Remove the always-on circular player ring and circular shield bubble from the legacy renderer.
    Buff/ultimate aura rings use different radii and remain intact. */
 ctx.arc=function(x,y,r,a0,a1,ccw){if(r===25||r===22||r===31)return;return realArc.call(this,x,y,r,a0,a1,ccw)};
 try{oldDrawPlayer26(p,isLocal)}finally{ctx.arc=realArc}
 const col=playerRingColor(p.id),x=p.x,y=p.y+14,s=isLocal?15:11;
 ctx.save();ctx.strokeStyle=col;ctx.lineWidth=isLocal?2:1.5;ctx.globalAlpha=isLocal?.95:.58;
 /* four corner ticks instead of a full circle */
 for(let i=0;i<4;i++){const sx=i%2?-1:1,sy=i<2?-1:1;ctx.beginPath();ctx.moveTo(x+sx*s,y+sy*6);ctx.lineTo(x+sx*(s-6),y+sy*6);ctx.stroke()}
 if((p.shield||0)>0){
  ctx.globalAlpha=.82;ctx.strokeStyle='#a8e8ff';ctx.lineWidth=2;const hx=p.x+18,hy=p.y-29,r=7;ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6,xx=hx+Math.cos(a)*r,yy=hy+Math.sin(a)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.stroke();
 }
 ctx.restore();
};

/* ---------- right HUD collision fix ---------- */
const css=document.createElement('style');css.id='combatUiFix26';css.textContent=`
@media (min-width:1101px){#buffTracker{right:214px!important;top:12px!important;width:190px!important;max-height:190px;overflow:hidden}.hudbox.right{right:12px;top:12px;width:160px}}
@media (min-width:901px) and (max-width:1100px){#buffTracker{right:12px!important;top:255px!important;width:170px!important;max-height:180px;overflow:hidden}}
@media (pointer:coarse){#buffTracker{right:8px!important;top:112px!important;width:138px!important;max-height:27vh!important;overflow:hidden}}
`;document.head.appendChild(css);

/* ---------- class-readable projectiles ---------- */
const oldDrawProjectile26=drawProjectile;
drawProjectile=function(q){
 const p=typeof playerById==='function'?playerById(q?.ownerId):null,c=p?.cls,t=g?.t||0;
 if(!q||!c)return oldDrawProjectile26(q);
 const a=Math.atan2(q.vy,q.vx);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(a);
 if(c==='archer'&&q.skill==='basic'){
  ctx.strokeStyle='#dff0b7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(8,0);ctx.stroke();ctx.fillStyle='#f4ffd8';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(5,-4);ctx.lineTo(5,4);ctx.closePath();ctx.fill();ctx.globalAlpha=.28;ctx.fillRect(-22,-1,9,2);
 }else if(c==='mage'&&q.skill==='basic'){
  ctx.rotate(-t*5);ctx.globalAlpha=.25;ctx.fillStyle='#819cff';ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#c9d5ff';ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.fillStyle='#ffffff';ctx.fillRect(-2,-2,4,4);
 }else if(c==='priest'&&q.skill==='basic'){
  ctx.fillStyle='#f5e58d';ctx.beginPath();ctx.arc(0,0,6,0,TAU);ctx.fill();ctx.fillStyle='#fffbd0';ctx.fillRect(-1,-9,2,18);ctx.fillRect(-8,-1,16,2);ctx.globalAlpha=.25;ctx.fillStyle='#fff3a7';ctx.fillRect(-20,-2,12,4);
 }else if(c==='necromancer'&&q.skill==='N-BASIC'){
  ctx.fillStyle='#e4dfcf';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(2,-4);ctx.lineTo(-12,-2);ctx.lineTo(-15,2);ctx.lineTo(2,4);ctx.closePath();ctx.fill();ctx.fillStyle='#9e83c8';ctx.fillRect(-17,-1,7,2);
 }else if(c==='gunslinger'&&q.skill==='GS-BASIC'){
  ctx.fillStyle='#ffe2a4';ctx.fillRect(-2,-2,10,4);ctx.globalAlpha=.35;ctx.fillStyle='#f1a85f';ctx.fillRect(-24,-1,20,2);
 }else{ctx.restore();return oldDrawProjectile26(q)}
 ctx.restore();
};

/* ---------- hit/VFX polish ---------- */
const oldDrawFx26=drawFx;
drawFx=function(f){
 if(!f)return oldDrawFx26(f);const a=clamp((f.life||0)/(f.max||1),0,1);
 if(f.type==='rogueslash26'){
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.globalAlpha=Math.min(1,a*2);ctx.strokeStyle='#b8f0cf';ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(6,-18);ctx.quadraticCurveTo(34,-8,52,2);ctx.stroke();ctx.globalAlpha*=.7;ctx.beginPath();ctx.moveTo(8,15);ctx.quadraticCurveTo(31,6,46,-5);ctx.stroke();ctx.restore();return;
 }
 if(f.type==='hit26'){
  ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=Math.min(1,a*2);ctx.strokeStyle=f.col||'#fff';ctx.lineWidth=2;const r=f.r||14;
  if(f.style==='x'){ctx.beginPath();ctx.moveTo(-r,-r*.55);ctx.lineTo(r,r*.55);ctx.moveTo(-r,r*.55);ctx.lineTo(r,-r*.55);ctx.stroke()}
  else if(f.style==='cross'){ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.stroke()}
  else{for(let i=0;i<5;i++){const q=i*TAU/5;ctx.beginPath();ctx.moveTo(Math.cos(q)*4,Math.sin(q)*4);ctx.lineTo(Math.cos(q)*r,Math.sin(q)*r);ctx.stroke()}}
  ctx.restore();return;
 }
 return oldDrawFx26(f);
};

window.NEXUS_POLISH_V26={build:'0.26',openingBalance:true,difficultyOpeningAssist:true,openingDifficulty:DIFF_OPEN,playerMarker:'cornerTicks',shieldIndicator:'hex',hudNoOverlap:true,rogueFxFixed:true,classBasicVfx:true,basicMultipliers:BASIC_MUL};
})();
