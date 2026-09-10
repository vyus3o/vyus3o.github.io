/* NEXUS SURVIVAL elite & recovery system build 0.9 */
(function(){
const ELITE_BASE=[.06,.075,.09,.105,.12];
const DIFF_BONUS={EASY:-.01,NORMAL:0,HARD:.01,NIGHTMARE:.02,HELL:.03};
const HEAL_DROP_CHANCE=.40;
const HEAL_RATIO=.30;

function ensureDrops(){if(g&&!Array.isArray(g.healDrops))g.healDrops=[]}
function eliteChance(){return Math.max(.035,(ELITE_BASE[g?.stage||0]||.06)+(DIFF_BONUS[diff]||0))}

/* 일반 몬스터 생성 후 일정 확률로 엘리트 승격 */
const _spawnElite=spawn;
spawn=function(b=false){
  const before=g?.e?.length||0;
  _spawnElite(b);
  if(b||!g||g.e.length<=before)return;
  const e=g.e[g.e.length-1];
  if(!e||e.boss||Math.random()>=eliteChance())return;
  e.elite=true;
  e.eliteTier=1+Math.min(2,Math.floor((g.stage||0)/2));
  const hpMul=2.8+.25*e.eliteTier;
  e.max*=hpMul;e.hp=e.max;
  e.dmg*=1.42+.08*e.eliteTier;
  e.spd*=.94;
  e.r=Math.round(e.r*(1.20+.04*e.eliteTier));
  e.elitePulse=Math.random()*Math.PI*2;
};

function spawnHealDrop(x,y,ownerId){
  ensureDrops();
  g.healDrops.push({id:'h'+g.nextEnemyId+'-'+Date.now()+'-'+((Math.random()*999)|0),x,y,tx:x,ty:y,ownerId,ratio:HEAL_RATIO,life:18,max:18,spin:Math.random()*Math.PI*2});
  addFx('holy',x,y,{r:46,col:'#77e59a',life:.55,ownerId,net:true});
}

/* 엘리트 처치: 추가 경험치 + 40% 확률 회복 오브 */
const _killElite=killEnemy;
killEnemy=function(e,ownerId){
  const wasElite=!!(e&&e.elite&&!e.dead&&!e.boss),x=e?.x||0,y=e?.y||0;
  _killElite(e,ownerId);
  if(!wasElite||!g)return;
  g.gem.push({x:x+6,y:y-4,v:18+g.stage*4,spin:Math.random()*6.28});
  addFx('ring',x,y,{r:64,col:'#f1c86a',life:.5,ownerId});
  if(Math.random()<HEAL_DROP_CHANCE)spawnHealDrop(x,y,ownerId);
};

function updateHealDrops(dt){
  ensureDrops();
  for(let i=g.healDrops.length-1;i>=0;i--){
    const d=g.healDrops[i];d.life-=dt;d.spin+=dt*3.6;
    if(d.life<=0){g.healDrops.splice(i,1);continue}
    let p=playerById(d.ownerId);
    if(!p?.alive)continue;
    const dist=Math.hypot(p.x-d.x,p.y-d.y),pull=Math.max(95,(p.pickup||170)*.65);
    if(p.hp<p.max-.5&&dist<pull){
      const a=Math.atan2(p.y-d.y,p.x-d.x),spd=260+Math.max(0,pull-dist)*1.2;
      d.x+=Math.cos(a)*spd*dt;d.y+=Math.sin(a)*spd*dt;
    }
    if(p.hp<p.max-.5&&dist<27){
      const heal=Math.max(1,p.max*d.ratio);
      healPlayer(p,heal);
      addFx('healwave',p.x,p.y,{r:72,col:'#76e59a',life:.5,ownerId:p.id});
      if(p.id===g.localId)toast('RECOVERY // 최대 체력 30% 회복');
      g.healDrops.splice(i,1);
    }
  }
}

const _updateHostElite=updateHost;
updateHost=function(dt){
  _updateHostElite(dt);
  if(g&&state==='play')updateHealDrops(dt);
};

/* 스테이지 이동 시 남은 회복 아이템 정리 */
const _advanceStageElite=advanceStage;
advanceStage=function(){_advanceStageElite();if(g)g.healDrops=[]};

/* 네트워크 스냅샷에 엘리트/회복 아이템 포함 */
const _makeNetStateElite=makeNetState;
makeNetState=function(){
  const s=_makeNetStateElite();ensureDrops();
  const em=new Map(g.e.map(e=>[e.id,e]));
  s.e.forEach(d=>{const e=em.get(d.id);if(e){d.elite=!!e.elite;d.eliteTier=e.eliteTier||0}});
  s.healDrops=g.healDrops.slice(0,24).map(d=>({id:d.id,x:d.x,y:d.y,ownerId:d.ownerId,ratio:d.ratio,life:d.life,max:d.max,spin:d.spin}));
  return s;
};

const _applySnapElite=applyNetSnapshot;
applyNetSnapshot=function(s,initial=false){
  _applySnapElite(s,initial);
  if(!g)return;
  const sm=new Map((s.e||[]).map(e=>[e.id,e]));
  for(const e of g.e){const d=sm.get(e.id);if(d){e.elite=!!d.elite;e.eliteTier=d.eliteTier||0}}
  g.healDrops=(s.healDrops||[]).map(d=>({...d}));
};

/* 엘리트가 일반 몬스터와 확실히 구분되도록 오라/체력바 추가 */
const _drawEnemyElite=drawEnemy;
drawEnemy=function(e){
  _drawEnemyElite(e);
  if(!e?.elite||e.boss)return;
  const pulse=.5+.5*Math.sin((g?.t||0)*5+(e.elitePulse||e.id));
  ctx.save();
  ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle='#f4cf72';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(e.x,e.y,e.r+8+3*pulse,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.15;ctx.fillStyle='#e59b4e';ctx.beginPath();ctx.arc(e.x,e.y,e.r+13,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;ctx.fillStyle='#190f08cc';ctx.fillRect(e.x-25,e.y-e.r-18,50,5);ctx.fillStyle='#f1c86a';ctx.fillRect(e.x-25,e.y-e.r-18,50*Math.max(0,e.hp/e.max),5);
  ctx.font='900 8px Arial';ctx.textAlign='center';ctx.fillStyle='#ffe7a0';ctx.fillText('ELITE',e.x,e.y-e.r-23);
  ctx.restore();
};

function drawHealDrop(d){
  const p=.5+.5*Math.sin((g?.t||0)*6+d.spin);
  ctx.save();ctx.translate(Math.round(d.x),Math.round(d.y));ctx.rotate(d.spin*.25);
  ctx.globalAlpha=.16+.09*p;ctx.fillStyle='#7cff9b';ctx.beginPath();ctx.arc(0,0,22+4*p,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.9;ctx.strokeStyle='#9dffb4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,15+2*p,0,Math.PI*2);ctx.stroke();
  ctx.rotate(-d.spin*.25);ctx.fillStyle='#dffff0';ctx.fillRect(-3,-10,6,20);ctx.fillRect(-10,-3,20,6);
  ctx.fillStyle='#6ee58e';ctx.fillRect(-2,-9,4,18);ctx.fillRect(-9,-2,18,4);
  ctx.restore();
}

/* 넥서스가 그려지기 직전에 월드 회복 아이템을 렌더링 */
const _drawNexusElite=drawNexus;
drawNexus=function(n,t){ensureDrops();for(const d of g.healDrops)drawHealDrop(d);_drawNexusElite(n,t)};

/* HUD에 현재 엘리트 수 표시 */
const _hudElite=hud;
hud=function(){
  _hudElite();
  if(!g)return;
  const el=$('enemyInfo'),count=g.e.filter(e=>e.elite&&!e.dead).length;
  if(el)el.textContent+=' · ELITE '+count;
};

})();
