/* NEXUS SURVIVAL advancement balance interaction fixes build 0.13 */
(function(){
'use strict';
const ADV=window.NEXUS_ADV||{};
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
/* Timed offensive buffs affect attacks without permanently altering base stats. */
if(typeof doBasicAttack==='function'){
 const prevBasic=doBasicAttack;
 doBasicAttack=function(p,t){const rate=p.rate,crit=p.crit;if((p._bloodlustUntil||0)>(g?.t||0))p.rate*=1-Math.min(.20,p._bloodlustSpeed||0);if((p._huntUntil||0)>(g?.t||0))p.crit=Math.min(.65,p.crit+(p._huntCrit||0));const out=prevBasic(p,t);p.rate=rate;p.crit=crit;return out};
}
/* In multiplayer the authoritative host pauses while boss treasure is open. */
if(typeof openChest==='function'){
 const prevOpenChest=openChest;
 openChest=function(){const out=prevOpenChest();const chest=document.getElementById('chestModal');if(g&&NET.mode==='host'&&state==='play'&&chest&&!chest.classList.contains('hidden'))state='chest';return out};
}
/* Restore host simulation immediately after a regular treasure is claimed. */
const rewardBtn=document.getElementById('rewardBtn');
if(rewardBtn)rewardBtn.addEventListener('click',()=>{if(g&&NET.mode==='host'&&state==='chest')state='play'});

/* Remote advancement choices must never replace the host's still-unpicked cards. */
function applyRemoteAdv13(p,id){
 const a=ADV[id];if(!p||!a||a.base!==p.cls||p.subclass)return false;
 window.nexusEnsureAdvPlayer?.(p);p.subclass=id;p.advSkills={};p.awakened=false;p.ultReadyAt=0;
 if(id==='berserker'){p.dmg*=1.04;p.max*=.97;p.hp=Math.min(p.hp,p.max)}
 else if(id==='guardian'){p.max*=1.10;p.hp=Math.min(p.max,p.hp+p.max*.10);p.dmg*=.96}
 else if(id==='ranger')p.spd*=1.05;
 else if(id==='sniper'){p.dmg*=1.07;p.rate*=1.06}
 else if(id==='warlock')p.rng*=1.06;
 else if(id==='seraph'){p.max*=1.05;p.hp=p.max;p.dmg*=.96}
 else if(id==='inquisitor')p.dmg*=1.04;
 if(typeof addFx==='function')addFx('holyburst',p.x,p.y,{r:110,col:a.col,life:.75,ownerId:p.id});
 return true;
}
function resumeAfterAdv13(){
 const m=document.getElementById('advancementModal');if(m)m.classList.add('hidden');
 advanceStage();state='play';if(NET.mode==='host')netBroadcast({t:'v13Resume',state:makeNetState()});
}
if(typeof netHostMessage==='function'){
 const prevNetHost=netHostMessage;
 netHostMessage=function(conn,msg){
  if(msg?.t==='v13AdvChoice'&&conn?.playerId&&g&&state==='advancement'){
   const p=playerById(conn.playerId);
   if(p&&p._advPending&&applyRemoteAdv13(p,msg.id)){
    p._advPending=false;try{conn.send({t:'v13AdvAccepted',id:msg.id})}catch{}
    const host=localPlayer(),pending=Object.values(g.players).some(q=>q._advPending);
    if(!pending)resumeAfterAdv13();
    else if(host&&!host._advPending){const cards=document.getElementById('advCards');if(cards)cards.innerHTML='';document.getElementById('advWait')?.classList.remove('hidden')}
   }
   return;
  }
  return prevNetHost(conn,msg);
 };
}

/* Later biomes receive a modest elite-frequency ramp instead of resetting to the early-game rate. */
if(typeof spawn==='function'){
 const prevSpawn=spawn;
 spawn=function(b=false){
  const before=g?.e?.length||0;const out=prevSpawn(b);if(b||!g||g.e.length<=before)return out;
  const e=g.e[g.e.length-1];if(!e||e.boss||e.elite)return out;
  const zone=Math.min(4,Math.floor((g.stage||0)/10)),bonus=[0,.01,.02,.03,.04][zone];
  if(Math.random()<bonus){e.elite=true;e.eliteTier=3;e.elitePulse=Math.random()*Math.PI*2;e.max*=3.31;e.hp=e.max;e.dmg*=1.59;e.spd*=.94;e.r=Math.round(e.r*1.28)}
  return out;
 };
}
})();
