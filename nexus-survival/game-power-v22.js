/* NEXUS SURVIVAL progressive player power build 0.22
 * Gentle stage-based damage compensation for the 2x swarm introduced in 0.21.
 * STAGE 1 ~= +4%, STAGE 50 ~= +23.6%. Existing skill/passive multipliers are preserved.
 */
(function(){
'use strict';
const START=1.04;
const PER_STAGE=.004;
const CAP=1.24;

function stagePower(stage){
  return Math.min(CAP,START+Math.max(0,Number(stage)||0)*PER_STAGE);
}

function syncPower(p){
  if(!p||!g)return;
  const next=stagePower(g.stage||0);
  const prev=Number(p._stagePowerMul)||1;
  if(Math.abs(next-prev)<.00001)return;
  /* Divide the old stage modifier before applying the new one so upgrades that
     changed p.dmg in-between stages are retained exactly once. */
  p.dmg=Math.max(1,(Number(p.dmg)||1)/prev*next);
  p._stagePowerMul=next;
}

/* Host owns combat values. Clients receive the resulting p.dmg in snapshots. */
const oldUpdateHost22=updateHost;
updateHost=function(dt){
  if(g&&state==='play')for(const p of Object.values(g.players||{}))syncPower(p);
  return oldUpdateHost22(dt);
};

/* Make the current compensation visible without changing any combat UI flow. */
const oldHud22=hud;
hud=function(){
  oldHud22();
  if(!g)return;
  const el=$('lvl');
  if(!el)return;
  const bonus=Math.round((stagePower(g.stage||0)-1)*100);
  if(!el.textContent.includes('SWARM PWR'))el.textContent+=` · SWARM PWR +${bonus}%`;
};

window.NEXUS_POWER_V22={
  build:'0.22',
  startMultiplier:START,
  perStage:PER_STAGE,
  cap:CAP,
  maxStageMultiplier:stagePower(49),
  stagePower
};
})();
