/* NEXUS SURVIVAL full progression + skill integrity hotfix build 0.33 */
(function(){
'use strict';
const BUILD='0.33';
const ADV=window.NEXUS_ADV||{};
const ADV_OPTIONS={
 warrior:['berserker','guardian'],archer:['ranger','sniper'],mage:['elementalist','warlock'],priest:['seraph','inquisitor'],
 necromancer:['lich','necrolord'],rogue:['assassin','shadowdancer'],gunslinger:['desperado','artillerist']
};
const ADV_PREFIX={berserker:'BZ',guardian:'GD',ranger:'RN',sniper:'SN',elementalist:'EL',warlock:'AW',seraph:'SE',inquisitor:'IQ',lich:'LI',necrolord:'NL',assassin:'AS',shadowdancer:'SD',desperado:'DP',artillerist:'AT'};
const EXTRA_TYPES=new Set(['nova','targetnova','line','chain','volley','homing','grenade','rain','burnzone','poisonzone','slowzone','blackhole','trap','mark','chainmark','execute','executechain','lifesteal','buff','critbuff','guard','partyshield','heal','emergency','partybuff','holyrain','summon','barrage']);
let hostMilestone=null,clientMilestone=null,milestoneTimer=0;

const clone=v=>JSON.parse(JSON.stringify(v));
const local=()=>typeof localPlayer==='function'?localPlayer():null;
const connFor=pid=>NET?.conns?[...NET.conns.values()].find(c=>c?.playerId===pid&&c.open):null;
function connectedIds(){
 const ids=new Set();
 if(!g)return ids;
 if(NET.mode==='solo'){if(g.localId)ids.add(g.localId);return ids}
 if(NET.mode==='host'){
  ids.add(g.localId||'p1');
  for(const c of NET.conns?.values?.()||[])if(c?.open&&c.playerId&&g.players?.[c.playerId])ids.add(c.playerId);
 }else if(g.localId)ids.add(g.localId);
 return ids;
}
function clearMilestoneTimer(){if(milestoneTimer){clearInterval(milestoneTimer);milestoneTimer=0}}
function hideMilestoneUi(){
 const m=document.getElementById('advancementModal');if(m)m.classList.add('hidden');
 const w=document.getElementById('advWait');if(w)w.classList.add('hidden');
}
function milestoneModal(){
 let m=document.getElementById('advancementModal');
 if(m)return m;
 m=document.createElement('div');m.id='advancementModal';m.className='modal hidden';
 m.innerHTML='<div class="modalbox advanceBox"><div class="eyebrow" id="advEyebrow">CLASS ADVANCEMENT</div><div class="modalTitle" id="advTitle">전직 선택</div><div class="modalSub" id="advSub"></div><div id="advCards" class="advanceCards"></div><button id="advContinue" class="rewardBtn hidden">CONTINUE</button><div id="advWait" class="advWait hidden">다른 플레이어의 선택을 기다리는 중...</div></div>';
 document.getElementById('wrap')?.appendChild(m);return m;
}
function setWait(text){
 const m=milestoneModal(),cards=document.getElementById('advCards'),btn=document.getElementById('advContinue'),wait=document.getElementById('advWait');
 m.classList.remove('hidden');if(cards)cards.innerHTML='';if(btn)btn.classList.add('hidden');if(wait){wait.classList.remove('hidden');wait.textContent=text||'다른 플레이어의 선택을 기다리는 중...'}
}
function playerName(p){return NET?.lobby?.[p?.id]?.name||p?.name||p?.id||'PLAYER'}
function applyAdv33(p,id){
 const a=ADV[id];if(!p||!a||a.base!==p.cls||p.subclass)return false;
 window.nexusEnsureAdvPlayer?.(p);p.subclass=id;p.advSkills={};p.awakened=false;p.ultReadyAt=0;
 if(id==='berserker'){p.dmg*=1.04;p.max*=.97;p.hp=Math.min(p.hp,p.max)}
 else if(id==='guardian'){p.max*=1.10;p.hp=Math.min(p.max,p.hp+p.max*.10);p.dmg*=.96}
 else if(id==='ranger')p.spd*=1.05;
 else if(id==='sniper'){p.dmg*=1.07;p.rate*=1.06}
 else if(id==='warlock')p.rng*=1.06;
 else if(id==='seraph'){p.max*=1.05;p.hp=p.max;p.dmg*=.96}
 else if(id==='inquisitor')p.dmg*=1.04;
 else if(id==='lich'){p.dmg*=1.05;p.max*=.95;p.hp=Math.min(p.hp,p.max);p.rng*=1.05}
 else if(id==='necrolord'){p.max*=1.06;p.hp=Math.min(p.max,p.hp+p.max*.08);p.dmg*=.98}
 else if(id==='assassin'){p.dmg*=1.06;p.crit=Math.min(.55,(p.crit||0)+.07);p.max*=.96;p.hp=Math.min(p.hp,p.max)}
 else if(id==='shadowdancer'){p.spd*=1.06;p.rate*=.95}
 else if(id==='desperado'){p.rate*=.91;p.dmg*=.98}
 else if(id==='artillerist'){p.dmg*=1.08;p.rate*=1.08;p.rng*=1.04}
 try{addFx('holyburst',p.x,p.y,{r:110,col:a.col,life:.75,ownerId:p.id})}catch{}
 return true;
}
function showAdv33(p,isClient,round){
 const m=milestoneModal(),opts=ADV_OPTIONS[p?.cls]||[],cards=document.getElementById('advCards'),btn=document.getElementById('advContinue'),wait=document.getElementById('advWait');
 m.classList.remove('hidden');document.getElementById('levelModal')?.classList.add('hidden');document.getElementById('chestModal')?.classList.add('hidden');
 document.getElementById('advEyebrow').textContent='STAGE 10 // CLASS ADVANCEMENT';
 document.getElementById('advTitle').textContent='전직을 선택하세요';
 document.getElementById('advSub').textContent='전직은 되돌릴 수 없습니다. 전용 스킬 슬롯 3개가 해금됩니다.';
 if(btn)btn.classList.add('hidden');if(wait)wait.classList.add('hidden');if(cards)cards.innerHTML='';
 for(const id of opts){
  const a=ADV[id];if(!a)continue;const b=document.createElement('button');b.className='advanceCard';b.style.setProperty('--adv-col',a.col||'#d8ff65');
  b.innerHTML=`<small>${C[p.cls]?.n||p.cls} ADVANCEMENT</small><h2>${a.name}</h2><p class="advPassive"><b>고유 패시브</b><br>${a.passive||''}</p><p><b>전용 스킬</b><br>${Object.values(a.skills||{}).map(s=>s.n).join(' · ')}</p><strong>STAGE 30 → ${a.awaken} / R ${a.ult}</strong>`;
  b.onclick=()=>{if(isClient)submitClientAdv(round,id);else submitHostAdv(round,id)};cards.appendChild(b);
 }
 if(!opts.length)setWait('전직 데이터 오류 · 방장에게 다시 동기화를 요청합니다.');
}
function awakenPlayer33(p){
 if(!p)return;window.nexusEnsureAdvPlayer?.(p);if(!p.subclass)return;
 p.awakened=true;p.ultReadyAt=g?.t||0;p.hp=p.max;p.shield=Math.max(p.shield||0,p.max*.12);
 const a=ADV[p.subclass];try{addFx('holyburst',p.x,p.y,{r:135,col:a?.col||'#d8ff65',life:.9,ownerId:p.id})}catch{}
}
function showAwaken33(p,isClient,round){
 const a=p?.subclass?ADV[p.subclass]:null,m=milestoneModal(),cards=document.getElementById('advCards'),btn=document.getElementById('advContinue'),wait=document.getElementById('advWait');
 m.classList.remove('hidden');document.getElementById('levelModal')?.classList.add('hidden');document.getElementById('chestModal')?.classList.add('hidden');
 document.getElementById('advEyebrow').textContent='STAGE 30 // AWAKENING';
 document.getElementById('advTitle').textContent=a?`${a.name} → ${a.awaken}`:'CLASS AWAKENING';
 document.getElementById('advSub').textContent=a?`각성기 해금: R · ${a.ult} / 모바일 ULT 버튼`:'각성기가 해금되었습니다.';
 if(cards)cards.innerHTML=a?`<div class="awakenCard" style="--adv-col:${a.col}"><small>ULTIMATE UNLOCKED</small><h2>${a.ult}</h2><p>${a.passive||''}</p><strong>R 키 또는 ULT 버튼으로 사용</strong></div>`:'';
 if(wait)wait.classList.add('hidden');if(btn){btn.classList.remove('hidden');btn.textContent=isClient?'READY // 방장 대기':'AWAKEN // 파티 준비 완료';btn.onclick=()=>isClient?submitClientReady(round):submitHostReady(round)}
}
function startPacketFor(pid){
 if(!hostMilestone||!g)return null;const p=g.players?.[pid];if(!p)return null;
 return {t:'v33MilestoneStart',round:hostMilestone.id,kind:hostMilestone.kind,stage:hostMilestone.stage,playerId:pid,build:BUILD};
}
function sendStart(pid){const c=connFor(pid),pkt=startPacketFor(pid);if(c&&pkt)try{c.send(pkt)}catch{}}
function refreshMilestone(){
 if(NET.mode!=='host'||!hostMilestone||!g)return;
 const live=connectedIds();for(const pid of [...hostMilestone.pending])if(!live.has(pid))hostMilestone.pending.delete(pid);
 if(!hostMilestone.pending.size){finishMilestone33();return}
 for(const pid of hostMilestone.pending)if(pid!==(g.localId||'p1'))sendStart(pid);
 const lp=local();
 if(lp&&!hostMilestone.pending.has(lp.id)){
  const names=[...hostMilestone.pending].map(id=>playerName(g.players[id])).join(' · ');
  setWait(names?`선택 대기: ${names}`:'파티 동기화 중...');
 }
}
function beginMilestone33(kind){
 if(!g)return false;
 clearMilestoneTimer();const stage=g.stage+1,id=`${kind}-${stage}-${Date.now().toString(36)}`;
 hostMilestone={id,kind,stage,pending:new Set(),finished:false};state=kind==='advancement'?'advancement':'awakening';
 document.getElementById('levelModal')?.classList.add('hidden');document.getElementById('chestModal')?.classList.add('hidden');
 const ids=connectedIds();
 for(const pid of ids){
  const p=g.players?.[pid];if(!p)continue;
  if(kind==='advancement'){if(!p.subclass)hostMilestone.pending.add(pid)}
  else{awakenPlayer33(p);hostMilestone.pending.add(pid)}
 }
 const lp=local();
 if(lp&&hostMilestone.pending.has(lp.id)){if(kind==='advancement')showAdv33(lp,false,id);else showAwaken33(lp,false,id)}
 for(const pid of hostMilestone.pending)if(pid!==lp?.id)sendStart(pid);
 if(!hostMilestone.pending.size){finishMilestone33();return true}
 milestoneTimer=setInterval(refreshMilestone,550);return true;
}
function submitHostAdv(round,id){
 if(NET.mode!=='host'||!hostMilestone||hostMilestone.id!==round||hostMilestone.kind!=='advancement')return;
 const p=local();if(!p||!hostMilestone.pending.has(p.id)||!applyAdv33(p,id))return;
 hostMilestone.pending.delete(p.id);refreshMilestone();
}
function submitClientAdv(round,id){
 if(NET.mode!=='client'||!clientMilestone||clientMilestone.id!==round||clientMilestone.submitted)return;
 clientMilestone.submitted=true;if(NET.hostConn?.open)try{NET.hostConn.send({t:'v33AdvChoice',round,id,playerId:NET.localId,build:BUILD})}catch{}
 setWait('전직 선택 완료 · 다른 플레이어를 기다리는 중...');
}
function submitHostReady(round){
 if(NET.mode!=='host'||!hostMilestone||hostMilestone.id!==round||hostMilestone.kind!=='awakening')return;
 const p=local();if(p)hostMilestone.pending.delete(p.id);refreshMilestone();
}
function submitClientReady(round){
 if(NET.mode!=='client'||!clientMilestone||clientMilestone.id!==round||clientMilestone.submitted)return;
 clientMilestone.submitted=true;if(NET.hostConn?.open)try{NET.hostConn.send({t:'v33AwakenReady',round,playerId:NET.localId,build:BUILD})}catch{}
 setWait('각성 준비 완료 · 다른 플레이어를 기다리는 중...');
}
function finishMilestone33(){
 if(NET.mode!=='host'||!hostMilestone||hostMilestone.finished||!g)return;
 hostMilestone.finished=true;const rid=hostMilestone.id;clearMilestoneTimer();hideMilestoneUi();
 advanceStage();state='play';const snap=typeof makeNetState==='function'?makeNetState():null;
 const pkt={t:'v33MilestoneResume',round:rid,state:snap,build:BUILD};
 const send=()=>{try{netBroadcast(pkt)}catch{}};send();setTimeout(send,120);setTimeout(send,420);hostMilestone=null;
 if(typeof toast==='function')toast('PARTY READY // 성장 동기화 완료');
}

const prevOpenChest33=openChest;
openChest=function(){
 if(!g)return prevOpenChest33();
 if(NET.mode==='solo')return prevOpenChest33();
 const s=g.stage+1;
 if(NET.mode==='client')return;
 if(s===10)return beginMilestone33('advancement');
 if(s===30)return beginMilestone33('awakening');
 return prevOpenChest33();
};

const prevHostMessage33=netHostMessage;
netHostMessage=function(conn,msg){
 if(msg?.t==='v33AdvChoice'&&NET.mode==='host'&&hostMilestone?.kind==='advancement'&&String(msg.round)===hostMilestone.id&&conn?.playerId){
  const pid=conn.playerId,p=g?.players?.[pid];
  if(p&&hostMilestone.pending.has(pid)&&applyAdv33(p,msg.id)){hostMilestone.pending.delete(pid);try{conn.send({t:'v33MilestoneAccepted',round:hostMilestone.id,kind:'advancement',id:msg.id,build:BUILD})}catch{}refreshMilestone()}
  return;
 }
 if(msg?.t==='v33AwakenReady'&&NET.mode==='host'&&hostMilestone?.kind==='awakening'&&String(msg.round)===hostMilestone.id&&conn?.playerId){
  hostMilestone.pending.delete(conn.playerId);try{conn.send({t:'v33MilestoneAccepted',round:hostMilestone.id,kind:'awakening',build:BUILD})}catch{}refreshMilestone();return;
 }
 return prevHostMessage33(conn,msg);
};
const prevClientMessage33=netClientMessage;
netClientMessage=function(msg){
 if(msg?.t==='v33MilestoneStart'&&NET.mode==='client'&&g){
  const rid=String(msg.round||'');if(!rid)return;
  if(clientMilestone?.id===rid&&clientMilestone.submitted){setWait(msg.kind==='awakening'?'각성 준비 완료 · 다른 플레이어를 기다리는 중...':'전직 선택 완료 · 다른 플레이어를 기다리는 중...');return}
  clientMilestone={id:rid,kind:msg.kind,stage:msg.stage,submitted:false};state=msg.kind==='advancement'?'advancement':'awakening';
  const p=local();if(msg.kind==='advancement')showAdv33(p,true,rid);else{awakenPlayer33(p);showAwaken33(p,true,rid)}return;
 }
 if(msg?.t==='v33MilestoneAccepted'&&clientMilestone&&String(msg.round)===clientMilestone.id){
  clientMilestone.submitted=true;setWait(msg.kind==='awakening'?'각성 준비 완료 · 다른 플레이어를 기다리는 중...':'전직 선택 완료 · 다른 플레이어를 기다리는 중...');return;
 }
 if(msg?.t==='v33MilestoneResume'&&g){
  if(clientMilestone&&msg.round&&String(msg.round)!==clientMilestone.id)return;
  hideMilestoneUi();document.getElementById('levelModal')?.classList.add('hidden');document.getElementById('chestModal')?.classList.add('hidden');
  if(msg.state&&typeof applyNetSnapshot==='function')try{applyNetSnapshot(msg.state,true)}catch{}
  clientMilestone=null;state='play';if(typeof toast==='function')toast('PARTY READY // 성장 동기화 완료');return;
 }
 return prevClientMessage33(msg);
};

/* ----- mechanics that had UI/definitions but incomplete runtime effects ----- */
const prevDamageEnemy33=damageEnemy;
damageEnemy=function(e,amount,ownerId,o={}){
 if(e&&g&&(e._weakUntil||0)>g.t&&Number.isFinite(e._weakMul)&&e._weakMul>0)amount*=1+e._weakMul;
 return prevDamageEnemy33(e,amount,ownerId,o);
};

const prevBasic33=doBasicAttack;
doBasicAttack=function(p,t){
 if(!p)return prevBasic33(p,t);
 const rate=p.rate,crit=p.crit,dmg=p.dmg;
 const now=g?.t||0;
 if(p.subclass==='berserker'&&(p._bloodlustUntil||0)>now&&p._bloodlustSpeed)p.rate*=Math.max(.62,1-p._bloodlustSpeed);
 if(p.cls==='rogue'&&(p._rogueHasteUntil||0)>now){const lv=Math.min(5,p.skills?.R12||0);p.rate*=Math.max(.68,1-(.08+.025*lv))}
 if(p.cls==='necromancer'&&(p.skills?.N09||0)>0&&(p.atkBuffUntil||0)>now&&(p.atkBuff||1)>1){const lv=Math.min(5,p.skills.N09||0);p.rate*=Math.max(.68,1-(.06+.025*lv))}
 if(p.subclass==='ranger'&&(p._huntUntil||0)>now&&p._huntCrit)p.crit=Math.min(.75,(p.crit||0)+p._huntCrit);
 if((p._v25CritUntil||0)>now&&p._v25CritBonus)p.crit=Math.min(.75,(p.crit||0)+p._v25CritBonus);
 if(p.subclass==='desperado'&&(p.advSkills?.DP04||0)>0&&(p._movingUntil||0)>now){const lv=Math.min(3,p.advSkills.DP04||0);p.dmg*=1+[0,.08,.13,.18][lv]}
 const beforePoison=t?.poison||0,beforeUntil=t?.poisonUntil||0;
 try{return prevBasic33(p,t)}finally{
  if(p.subclass==='assassin'&&(p.advSkills?.AS02||0)>0&&t&&!t.dead&&(t.poison||0)>beforePoison){
   const lv=Math.min(3,p.advSkills.AS02||0),mul=[1,1.20,1.35,1.55][lv];
   t.poison=Math.max(t.poison||0,(t.poison||0)*mul);t.poisonUntil=Math.max(t.poisonUntil||0,beforeUntil,(g?.t||0)+3.2+.6*lv);
  }
  p.rate=rate;p.crit=crit;p.dmg=dmg;
 }
};

const prevProj33=proj;
proj=function(p,tx,ty,dmg,o={}){
 if(p?.subclass==='artillerist'&&(p.advSkills?.AT04||0)>0&&o?.source!=='nexus'){
  const lv=Math.min(3,p.advSkills.AT04||0);o={...o,pierce:(o.pierce||0)+(lv>=3?2:1)};
 }
 return prevProj33(p,tx,ty,dmg,o);
};

const prevDamagePlayer33=damagePlayer;
damagePlayer=function(p,amount){
 if(p&&g){
  let best=0;
  for(const z of g.zones||[]){
   if(z?.type!=='guardian'||Math.hypot(p.x-z.x,p.y-z.y)>z.r)continue;
   const owner=playerById(z.ownerId),lv=Math.min(5,owner?.skills?.W14||0);if(lv)best=Math.max(best,.08+.015*lv);
  }
  if(best>0)amount*=1-best;
  if(p.subclass==='seraph'&&(p._seraphSanctuaryUntil||0)>g.t&&p._seraphSanctuaryReduce>0)amount*=1-Math.max(0,p._seraphSanctuaryReduce-.18);
 }
 return prevDamagePlayer33(p,amount);
};

const prevUpdatePlayers33=updatePlayers;
updatePlayers=function(dt){
 if(!g)return prevUpdatePlayers33(dt);
 const saved=[];
 for(const p of Object.values(g.players||{}))if((p._seraphWingUntil||0)>g.t&&p._seraphWingSpeed){saved.push([p,p.spd]);p.spd*=1+p._seraphWingSpeed}
 try{return prevUpdatePlayers33(dt)}finally{for(const[p,s]of saved)p.spd=s}
};

const prevUpdateClient33=updateClient;
updateClient=function(dt){
 const p=local();if(!p||!g)return prevUpdateClient33(dt);
 const s=p.spd;let mul=(p.speedBuffUntil||0)>g.t?(p.speedBuff||1):1;if((p._seraphWingUntil||0)>g.t)mul*=1+(p._seraphWingSpeed||0);
 p.spd=s*mul;try{return prevUpdateClient33(dt)}finally{p.spd=s}
};

const prevMakeNetState33=makeNetState;
makeNetState=function(){
 const s=prevMakeNetState33();if(!s?.players||!g)return s;
 const map=new Map(Object.values(g.players||{}).map(p=>[p.id,p]));
 for(const d of s.players){const p=map.get(d.id);if(!p)continue;
  d.speedBuff=p.speedBuff||1;d.speedBuffUntil=p.speedBuffUntil||0;d.atkBuff=p.atkBuff||1;d.atkBuffUntil=p.atkBuffUntil||0;
  d._seraphWingUntil=p._seraphWingUntil||0;d._seraphWingSpeed=p._seraphWingSpeed||0;d._seraphWingReduce=p._seraphWingReduce||0;
  d._movingUntil=p._movingUntil||0;
 }
 return s;
};

function skillAudit(){
 const basePrefixes={warrior:'W',archer:'A',mage:'M',priest:'P',necromancer:'N',rogue:'R',gunslinger:'GS'},missing=[];
 for(const [cls,pref] of Object.entries(basePrefixes))for(let i=1;i<=15;i++){const id=pref+String(i).padStart(2,'0');if(!SK?.[cls]?.[id])missing.push(id)}
 for(const [sub,pref] of Object.entries(ADV_PREFIX))for(let i=1;i<=12;i++){const id=pref+String(i).padStart(2,'0'),d=ADV?.[sub]?.skills?.[id];if(!d)missing.push(id);else if(i>=6&&!EXTRA_TYPES.has(d.v25?.type))missing.push(id+':runtime')}
 const baseCount=Object.values(SK||{}).reduce((n,x)=>n+Object.keys(x||{}).length,0);
 const advCount=Object.values(ADV||{}).reduce((n,a)=>n+Object.keys(a.skills||{}).length,0);
 return {ok:missing.length===0&&baseCount===105&&advCount===168,baseCount,advancedCount:advCount,missing};
}

const prevNetClose33=netClose;
netClose=function(){clearMilestoneTimer();hostMilestone=clientMilestone=null;hideMilestoneUi();return prevNetClose33()};

window.NEXUS_INTEGRITY_V33={
 build:BUILD,levelFlow:'1-50',reliableStage10Advancement:true,reliableStage30Awakening:true,
 fixes:['weak-marks','assassin-AS02','desperado-DP04','artillerist-AT04-pierce','berserker-BZ04-speed','ranger-RN04-crit','necromancer-N09-speed','rogue-R12-speed','seraph-SE01-speed','warrior-W14-guard','v25-critbuff'],
 skillAudit:skillAudit()
};
})();