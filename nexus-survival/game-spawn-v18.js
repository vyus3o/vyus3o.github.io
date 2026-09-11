/* NEXUS SURVIVAL visible spawn + watchdog build 0.18 */
(function(){
'use strict';

const clamp18=(v,a,b)=>Math.max(a,Math.min(b,v));

/*
 * Spawn just around the combat viewport instead of on a very distant circular
 * ring. This keeps enemies entering from every side without popping directly
 * on top of the Nexus, and makes the growing horde visible within seconds.
 */
randEdgeSpawn=function(){
  const n=g?.n||{x:WORLD.w/2,y:WORLD.h/2};
  const side=(Math.random()*4)|0;
  const mx=54+Math.random()*72;
  const my=46+Math.random()*64;
  const halfW=W/2+mx;
  const halfH=H/2+my;
  let x=n.x,y=n.y;
  if(side===0){x=n.x-halfW;y=n.y+(Math.random()*2-1)*(H*.48)}
  else if(side===1){x=n.x+halfW;y=n.y+(Math.random()*2-1)*(H*.48)}
  else if(side===2){x=n.x+(Math.random()*2-1)*(W*.48);y=n.y-halfH}
  else{x=n.x+(Math.random()*2-1)*(W*.48);y=n.y+halfH}
  return {x:clamp18(x,30,WORLD.w-30),y:clamp18(y,30,WORLD.h-30)};
};

/*
 * Safety net: normal spawning is still controlled by the main spawn timer.
 * If that timer ever stalls while the field population is low, recover with
 * one authoritative host spawn. The host remains the only source of enemies;
 * clients receive the same enemies through snapshots.
 */
const prevUpdateHost18=updateHost;
updateHost=function(dt){
  const beforeId=g?.nextEnemyId||0;
  const out=prevUpdateHost18(dt);
  if(!g||state!=='play')return out;

  if(g.nextEnemyId>beforeId){
    g._spawnWatchAt=g.t;
    g._spawnWatchId=g.nextEnemyId;
  }
  if(g._spawnWatchAt==null)g._spawnWatchAt=g.t;

  if(!g.boss){
    const normalCount=(g.e||[]).filter(e=>!e.dead&&!e.boss).length;
    const minPopulation=Math.min(12,5+Math.floor((g.stage||0)/10)+Math.max(0,partyCount()-1)*2);
    if(normalCount<minPopulation&&g.t-g._spawnWatchAt>1.25){
      const id=g.nextEnemyId;
      spawn(false);
      if(g.nextEnemyId>id){
        g._spawnWatchAt=g.t;
        g._spawnWatchId=g.nextEnemyId;
        g.spawn=Math.max(g.spawn,.26);
      }
    }
  }
  return out;
};

window.NEXUS_SPAWN_FIX={build:'0.18',visibleEdgeSpawn:true,watchdog:true};
})();
