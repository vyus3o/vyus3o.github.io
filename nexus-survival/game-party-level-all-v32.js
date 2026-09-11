/* NEXUS SURVIVAL multiplayer party-wide level choice hotfix 0.32.2 */
(function(){
'use strict';
const previous=requestLevel;
const clone=v=>JSON.parse(JSON.stringify(v));
function activePlayers(){
 if(!g?.players)return[];
 const lobby=NET?.lobby||{};
 return Object.values(g.players).filter(p=>p&&p.alive!==false&&(p.id==='p1'||lobby[p.id]?.connected!==false&&lobby[p.id]));
}
function connFor(pid){return [...(NET?.conns?.values?.()||[])].find(c=>c?.playerId===pid&&c.open)}
requestLevel=function(trigger){
 if(!trigger||NET.mode==='solo'||NET.mode!=='host')return previous(trigger);
 const existing=window.NEXUS_PARTY_SYNC_V32?.hostRound;
 if(existing)return previous(trigger);
 // Start the canonical v32 round with the player that caused the level-up.
 const out=previous(trigger);
 const sync=window.NEXUS_PARTY_SYNC_V32,r=sync?.hostRound;
 if(!r||!g)return out;
 // Multiplayer progression is party-wide: everybody gets their own class choices.
 for(const p of activePlayers()){
  p.pendingLevel=true;
  if(p!==trigger&&Number.isFinite(trigger.l))p.l=Math.max(p.l||1,trigger.l);
  if(!Array.isArray(r.choices[p.id])||!r.choices[p.id].length)r.choices[p.id]=clone(makeChoices(p));
  if(p.id===g.localId){
   showLevelChoices(p,clone(r.choices[p.id]));
   const m=document.getElementById('levelModal');if(m){m.dataset.v32Round=r.id;m.dataset.v32Owner=p.id}
   const nx=document.getElementById('nexusBtn');if(nx)nx.disabled=false;
  }else{
   const c=connFor(p.id);if(c)try{c.send({t:'v32LevelOffer',round:r.id,playerId:p.id,choices:clone(r.choices[p.id]),build:'0.32.2'})}catch{}
  }
 }
 // Broadcast after every player has been marked pending so clients never see a false READY state.
 sync.forceRoundSync?.();
 setTimeout(()=>sync.forceRoundSync?.(),80);
 setTimeout(()=>sync.forceRoundSync?.(),300);
 return out;
};
window.NEXUS_PARTY_LEVEL_ALL_V32={build:'0.32.2',partyWideChoices:true,allConnectedPlayersPending:true,repeatedDelivery:true};
})();