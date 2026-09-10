/* NEXUS SURVIVAL advancement balance interaction fixes build 0.13 */
(function(){
'use strict';
/* SE05 uses its own scalable mitigation instead of inheriting the base sanctuary's permanent 18% flag. */
if(typeof addZone==='function'){
 const prevAddZone=addZone;
 addZone=function(type,x,y,r,life,ownerId,dmg=0,o={}){
  const owner=typeof playerById==='function'?playerById(ownerId):null;
  if(type==='sanctuary'&&life>=8&&owner?.subclass==='seraph'&&(owner.advSkills?.SE05||0)>0)type='holyground';
  return prevAddZone(type,x,y,r,life,ownerId,dmg,o);
 };
}
/* Reset transient mitigation, clamp boosted HP, and apply timed movement buffs. */
if(typeof updatePlayers==='function'){
 const prevPlayers=updatePlayers;
 updatePlayers=function(dt){
  if(g)for(const p of Object.values(g.players)){
   if(p.hp>p.max)p.hp=p.max;
   p.damageReduce=0;
   if((p._seraphWingUntil||0)>g.t){p.speedBuff=Math.max(p.speedBuff||1,1+(p._seraphWingSpeed||0));p.speedBuffUntil=Math.max(p.speedBuffUntil||0,p._seraphWingUntil)}
  }
  return prevPlayers(dt);
 };
}
/* Weak-point and interrogation debuffs are intentionally multiplicative but capped by their own short duration. */
if(typeof damageEnemy==='function'){
 const prevDamageEnemy=damageEnemy;
 damageEnemy=function(e,amount,ownerId,o={}){if(e&&(e._weakUntil||0)>(g?.t||0))amount*=1+Math.min(.20,e._weakMul||0);return prevDamageEnemy(e,amount,ownerId,o)};
}
/* Seraph advanced sanctuary: 18/22/26% only while actually standing inside the field. */
if(typeof damagePlayer==='function'){
 const prevDamagePlayer=damagePlayer;
 damagePlayer=function(p,amount){
  if(g&&p){for(const s of Object.values(g.players)){if(s.subclass!=='seraph'||(s._seraphSanctuaryUntil||0)<=g.t)continue;const lv=s.advSkills?.SE05||0,r=[0,205,220,235][lv]||0;if(r&&Math.hypot(p.x-s.x,p.y-s.y)<=r){amount*=1-[0,.18,.22,.26][lv];break}}}
  return prevDamagePlayer(p,amount);
 };
}
/* Timed offensive buffs that should affect the next basic attack without permanently altering base stats. */
if(typeof doBasicAttack==='function'){
 const prevBasic=doBasicAttack;
 doBasicAttack=function(p,t){const rate=p.rate,crit=p.crit;if((p._bloodlustUntil||0)>(g?.t||0))p.rate*=1-Math.min(.20,p._bloodlustSpeed||0);if((p._huntUntil||0)>(g?.t||0))p.crit=Math.min(.65,p.crit+(p._huntCrit||0));const out=prevBasic(p,t);p.rate=rate;p.crit=crit;return out};
}
/* In multiplayer the authoritative host must pause simulation while boss treasure is open. */
if(typeof openChest==='function'){
 const prevOpenChest=openChest;
 openChest=function(){
  const out=prevOpenChest();
  const chest=document.getElementById('chestModal');
  if(g&&NET.mode==='host'&&state==='play'&&chest&&!chest.classList.contains('hidden'))state='chest';
  return out;
 };
}
})();
