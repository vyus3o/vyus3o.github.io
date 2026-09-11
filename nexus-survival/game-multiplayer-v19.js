/* NEXUS SURVIVAL multiplayer reward + dash authority fixes build 0.19 */
(function(){
'use strict';

const ADV=window.NEXUS_ADV||{};

function rewardInfo(p,r){
  if(!p||!r)return {title:'전투 보상',desc:'보상 획득'};
  if(r.type==='skill'){
    const d=typeof skillDef==='function'?skillDef(p.cls,r.id):null;
    return {title:(d?.n||r.id)+' 강화',desc:d?.desc||'기본 직업 스킬 강화'};
  }
  if(r.type==='adv'){
    const d=ADV[p.subclass]?.skills?.[r.id];
    return {title:(d?.n||r.id)+' 강화',desc:d?.desc||'전직 스킬 강화'};
  }
  if(r.type==='endless'){
    const m={E01:['전투 숙련','공격력 +3%'],E02:['생명력 증폭','최대 체력 +3% · 즉시 회복'],E03:['넥서스 공명','NEXUS CORE +60']}[r.id]||['전투 숙련','지속 성장 보너스'];
    return {title:m[0],desc:m[1]};
  }
  return {title:'전투 보상',desc:'보상 획득'};
}

/*
 * Dash cooldown must use the host clock in multiplayer. The client predicts
 * movement immediately, but every authoritative snapshot now carries the
 * host's dashReadyAt / dashInvulUntil so the countdown cannot drift when g.t
 * is corrected by snapshots or reset between stages.
 */
if(typeof makeNetState==='function'){
  const prevMakeNet19=makeNetState;
  makeNetState=function(){
    const s=prevMakeNet19();
    if(!g||!Array.isArray(s?.players))return s;
    const map=new Map(Object.values(g.players||{}).map(p=>[p.id,p]));
    for(const d of s.players){
      const p=map.get(d.id);if(!p)continue;
      d.dashReadyAt=Number.isFinite(p.dashReadyAt)?p.dashReadyAt:0;
      d.dashInvulUntil=Number.isFinite(p.dashInvulUntil)?p.dashInvulUntil:0;
    }
    return s;
  };
}

/*
 * Multiplayer boss treasure is granted authoritatively to EVERY participant
 * as soon as the treasure phase opens. The host still controls when the next
 * stage starts, while each client receives and sees their own reward card.
 */
if(typeof openChest==='function'){
  const prevOpenChest19=openChest;
  openChest=function(){
    const out=prevOpenChest19();
    if(!g||NET.mode!=='host')return out;
    const chest=document.getElementById('chestModal');
    if(!chest||chest.classList.contains('hidden'))return out; // advancement/awakening/final victory

    if(g._v19ChestGranted?.stage===g.stage){
      g.pendingChestRewards={};
      return out;
    }

    const rewards={...(g.pendingChestRewards||{})};
    if(!Object.keys(rewards).length)return out;
    const granted={};
    for(const [pid,r] of Object.entries(rewards)){
      const p=typeof playerById==='function'?playerById(pid):null;
      if(!p||!r)continue;
      if(typeof applyChoice==='function')applyChoice(p,r);
      granted[pid]=r;
    }
    g._v19ChestGranted={stage:g.stage,rewards:granted};
    /* prevent the legacy host CLAIM handler from granting the same rewards twice */
    g.pendingChestRewards={};

    for(const conn of NET.conns?.values?.()||[]){
      const pid=conn?.playerId,r=granted[pid],p=pid?playerById(pid):null;
      if(!conn?.open||!pid||!r||!p)continue;
      const info=rewardInfo(p,r);
      try{conn.send({t:'v19Chest',stage:g.stage+1,reward:r,title:info.title,desc:info.desc})}catch{}
    }
    /* Sync the actual granted skill/stat state immediately, even while combat is paused. */
    if(typeof netSnapshotBroadcast==='function'&&typeof makeNetState==='function')netSnapshotBroadcast(makeNetState());

    const reward=document.getElementById('reward');
    if(reward&&!reward.querySelector('.v19-party-note'))reward.insertAdjacentHTML('beforeend','<br><small class="v19-party-note">PARTY REWARD // 모든 플레이어에게 각자 보상이 지급되었습니다.</small>');
    return out;
  };
}

/* Client gets its own treasure card and freezes locally until the host resumes. */
if(typeof netClientMessage==='function'){
  const prevNetClient19=netClientMessage;
  netClientMessage=function(msg){
    if(msg?.t==='v19Chest'&&g){
      window.__nexusV19ClientChest=true;
      state='chest';
      const modal=document.getElementById('chestModal'),reward=document.getElementById('reward'),btn=document.getElementById('rewardBtn');
      if(modal)modal.classList.remove('hidden');
      if(reward)reward.innerHTML=`<b>BOSS TREASURE · STAGE ${msg.stage||g.stage+1}</b><br>${msg.title||'전투 보상'}<br><small>${msg.desc||'개인 보상 획득'}</small><br><small>보상은 이미 서버에서 적용되었습니다.</small>`;
      if(btn)btn.textContent='REWARD RECEIVED // 방장 대기';
      if(typeof toast==='function')toast('BOSS REWARD // 개인 보상 획득');
      return;
    }
    if(msg?.t==='v13Resume')window.__nexusV19ClientChest=false;
    return prevNetClient19(msg);
  };
}

/* A client must never run the host-only next-stage reward button logic. */
const rewardBtn=document.getElementById('rewardBtn');
if(rewardBtn&&!rewardBtn.dataset.v19){
  rewardBtn.dataset.v19='1';
  const prevClick=rewardBtn.onclick;
  rewardBtn.onclick=function(ev){
    if(NET.mode==='client'&&window.__nexusV19ClientChest){
      document.getElementById('chestModal')?.classList.add('hidden');
      if(typeof toast==='function')toast('보상 획득 완료 · 방장 대기 중');
      return;
    }
    return typeof prevClick==='function'?prevClick.call(this,ev):undefined;
  };
}

window.NEXUS_MULTI_FIX={build:'0.19',partyBossRewards:true,dashClockSync:true};
})();
