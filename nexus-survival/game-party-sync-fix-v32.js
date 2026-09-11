/* NEXUS SURVIVAL party level sync compatibility/UI hotfix 0.32.1 */
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
function settle(reason){
 const sync=window.NEXUS_PARTY_SYNC_V32;if(NET.mode!=='host'||!sync?.hostRound)return;
 sync.forceRoundSync?.();
 if(!pending().length)sync.resumeHost?.(reason);else hostWait();
}
const oldRemote=netApplyRemoteChoice;
netApplyRemoteChoice=function(pid,o){const out=oldRemote(pid,o);settle('remote-choice');return out};
const oldReq=requestLevel;
requestLevel=function(p){const out=oldReq(p);setTimeout(hostWait,0);return out};
const oldSel=selectChoice;
selectChoice=function(o){const out=oldSel(o);settle('local-choice');return out};
const nx=document.getElementById('nexusBtn');if(nx&&!nx.dataset.v321){nx.dataset.v321='1';const old=nx.onclick;nx.onclick=function(ev){const out=typeof old==='function'?old.call(this,ev):undefined;settle('nexus-choice');return out}};
window.NEXUS_PARTY_SYNC_FIX_V32={build:'0.32.1',immediateLastChoiceResume:true,hostWaitingUi:true,legacyRemoteChoiceCompatible:true};
})();