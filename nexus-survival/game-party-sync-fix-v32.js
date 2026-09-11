/* NEXUS SURVIVAL party level sync compatibility/UI hotfix 0.32.2 */
(function(){
'use strict';
function pending(){return g?Object.values(g.players||{}).filter(p=>p&&p.alive!==false&&p.pendingLevel):[]}
function hostWait(){
 if(NET.mode!=='host'||state!=='partyLevel'||!window.NEXUS_PARTY_SYNC_V32?.hostRound||!g)return;
 const lp=typeof localPlayer==='function'?localPlayer():null;if(lp?.pendingLevel)return;
 const m=document.getElementById('levelModal'),box=document.getElementById('choices'),nx=document.getElementById('nexusBtn');if(!m||!box)return;
 m.classList.remove('hidden');m.classList.add('partyPause28');
 box.innerHTML='<div style="grid-column:1/-1;padding:28px 16px;text-align:center;color:#c4d2c7;font:800 12px/1.7 monospace;letter-spacing:.5px">PARTY PAUSED<br>다른 플레이어의 레벨업 선택을 기다리는 중...</div>';
 if(nx)nx.disabled=true;
}
function settle(reason){const sync=window.NEXUS_PARTY_SYNC_V32;if(NET.mode!=='host'||!sync?.hostRound)return;sync.forceRoundSync?.();if(!pending().length)sync.resumeHost?.(reason);else hostWait()}
const oldRemote=netApplyRemoteChoice;
netApplyRemoteChoice=function(pid,o){const out=oldRemote(pid,o);settle('remote-choice');return out};
const oldReq=requestLevel;
requestLevel=function(p){
 if(!p||NET.mode!=='host')return oldReq(p);
 const hadRound=!!window.NEXUS_PARTY_SYNC_V32?.hostRound,out=oldReq(p),sync=window.NEXUS_PARTY_SYNC_V32,r=sync?.hostRound;
 if(hadRound||!r||!g){setTimeout(hostWait,0);return out}
 const lobby=NET.lobby||{},players=Object.values(g.players||{}).filter(x=>x&&x.alive!==false&&(x.id==='p1'||!!lobby[x.id]));
 for(const x of players){
  x.pendingLevel=true;
  if(x!==p&&Number.isFinite(p.l))x.l=Math.max(x.l||1,p.l);
  if(!Array.isArray(r.choices[x.id])||!r.choices[x.id].length)r.choices[x.id]=JSON.parse(JSON.stringify(makeChoices(x)));
  if(x.id===g.localId){showLevelChoices(x,JSON.parse(JSON.stringify(r.choices[x.id])));const m=document.getElementById('levelModal');if(m){m.dataset.v32Round=r.id;m.dataset.v32Owner=x.id}const nx=document.getElementById('nexusBtn');if(nx)nx.disabled=false}
  else{const c=[...NET.conns.values()].find(c=>c?.playerId===x.id&&c.open);if(c)try{c.send({t:'v32LevelOffer',round:r.id,playerId:x.id,choices:JSON.parse(JSON.stringify(r.choices[x.id])),build:'0.32.2'})}catch{}}
 }
 sync.forceRoundSync?.();setTimeout(()=>sync.forceRoundSync?.(),80);setTimeout(()=>sync.forceRoundSync?.(),300);return out;
};
const oldSel=selectChoice;
selectChoice=function(o){const out=oldSel(o);settle('local-choice');return out};
const nx=document.getElementById('nexusBtn');if(nx&&!nx.dataset.v321){nx.dataset.v321='1';const old=nx.onclick;nx.onclick=function(ev){const out=typeof old==='function'?old.call(this,ev):undefined;settle('nexus-choice');return out}};
window.NEXUS_PARTY_SYNC_FIX_V32={build:'0.32.2',immediateLastChoiceResume:true,hostWaitingUi:true,legacyRemoteChoiceCompatible:true,partyWideLevelChoices:true};
})();