/* NEXUS SURVIVAL boss hierarchy build 0.24
 * Every stage keeps a boss. 5/15/25/35/45 = MID BOSS.
 * 10/20/30/40/50 = MAJOR STAGE BOSS.
 * Tier bosses gain extra telegraphed patterns while boss adds continue spawning.
 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tierFor(stageIndex){const s=(stageIndex||0)+1;return s%10===0?'major':s%5===0?'mid':'normal'}
function livingPlayers(){return Object.values(g?.players||{}).filter(p=>p.alive&&!p.pendingLevel&&!p.levelSafe)}
function nearest(b){let out=null,bd=1e9;for(const p of livingPlayers()){const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd){bd=d;out=p}}return out}
function phase(b){const q=b.hp/Math.max(1,b.max);return q<=.28?3:q<=.62?2:1}
function ensureRaid(){if(!Array.isArray(g.raidTelegraphs))g.raidTelegraphs=[];if(!g.raidSerial)g.raidSerial=1}
function tg(b,o){ensureRaid();const t={id:g.raidSerial++,type:o.type||'circle',x:o.x??b.x,y:o.y??b.y,angle:o.angle||0,r:o.r||100,inner:o.inner||0,len:o.len||0,width:o.width||0,half:o.half||.45,life:o.delay||1,max:o.delay||1,damage:b.dmg*(o.mult||1),col:o.col||'#ff654f',name:o.name||'DANGER',bossId:b.id,knock:o.knock||60,moveBoss:!!o.moveBoss,endX:o.endX||0,endY:o.endY||0,stage:g.stage};g.raidTelegraphs.push(t);if(NET.mode==='host')netEmitEvent({k:'raidTelegraph',tg:{...t}});return t}
function callout(text,ph){const el=document.getElementById('raidBossCallout');if(el){el.textContent=`${text} // PHASE ${ph}`;el.classList.add('show');clearTimeout(el._v24);el._v24=setTimeout(()=>el.classList.remove('show'),1000)}if(NET.mode==='host')netEmitEvent({k:'raidCallout',name:text,phase:ph})}
function targetPoint(p,spread=0){return{x:clamp(p.x+(Math.random()-.5)*spread,80,WORLD.w-80),y:clamp(p.y+(Math.random()-.5)*spread,80,WORLD.h-80)}}
function addLine(b,a,len,width,delay,m,name,col){return tg(b,{type:'line',angle:a,len,width,delay,mult:m,name,col,knock:72,endX:clamp(b.x+Math.cos(a)*len,45,WORLD.w-45),endY:clamp(b.y+Math.sin(a)*len,45,WORLD.h-45)})}
function addCircle(b,x,y,r,delay,m,name,col){return tg(b,{type:'circle',x,y,r,delay,mult:m,name,col,knock:58})}
function addCone(b,a,len,half,delay,m,name,col){return tg(b,{type:'cone',angle:a,len,half,delay,mult:m,name,col,knock:66})}
function addDonut(b,inner,r,delay,m,name,col){return tg(b,{type:'donut',inner,r,delay,mult:m,name,col,knock:64})}

function castMid(b){const p=nearest(b);if(!p)return;const ph=phase(b),n=b._midCastNo||0;b._midCastNo=n+1;const a=Math.atan2(p.y-b.y,p.x-b.x),delay=Math.max(.90,1.16-ph*.06),col='#ffb45d';
 if(n%4===0){callout('MID BOSS · 교차 압살',ph);for(let i=0;i<4+(ph>=3?2:0);i++)addLine(b,a+i*TAU/(4+(ph>=3?2:0)),580+ph*45,64+ph*5,delay,1.10,'교차 압살',col)}
 else if(n%4===1){callout('MID BOSS · 추적 폭격',ph);for(const q of livingPlayers()){const pt=targetPoint(q,80);addCircle(b,pt.x,pt.y,92+ph*6,delay,1.08,'추적 폭격',col);if(ph>=2){const pt2=targetPoint(q,170);addCircle(b,pt2.x,pt2.y,74,delay+.22,1.02,'2차 폭격',col)}}}
 else if(n%4===2){callout('MID BOSS · 내외곽 붕괴',ph);addDonut(b,120-ph*8,330+ph*25,delay,1.14,'내외곽 붕괴',col);if(ph>=2)addCircle(b,p.x,p.y,92,delay+.28,1.06,'붕괴 핵',col)}
 else{callout('MID BOSS · 연속 부채꼴',ph);const c=ph===3?4:3;for(let i=0;i<c;i++)addCone(b,a+(i-(c-1)/2)*.38,520+ph*45,.26+ph*.025,delay+i*.10,1.12,'연속 부채꼴',col)}
 b._tierPatternCd=Math.max(4.8,6.8-ph*.45);
}
function castMajor(b){const p=nearest(b);if(!p)return;const ph=phase(b),n=b._majorCastNo||0;b._majorCastNo=n+1;const a=Math.atan2(p.y-b.y,p.x-b.x),delay=Math.max(.82,1.08-ph*.055),col='#ff6258';
 if(n%5===0){callout('STAGE BOSS · 멸절 격자',ph);const c=6+ph;for(let i=0;i<c;i++)addLine(b,i*TAU/c+g.t*.14,650+ph*50,60+ph*6,delay,1.16,'멸절 격자',col)}
 else if(n%5===1){callout('STAGE BOSS · 전원 추적',ph);for(const q of livingPlayers()){const pt=targetPoint(q,55);addCircle(b,pt.x,pt.y,100+ph*7,delay,1.14,'전원 추적',col);addCircle(b,pt.x+(Math.random()-.5)*150,pt.y+(Math.random()-.5)*150,72,delay+.24,1.08,'2차 추적',col)}}
 else if(n%5===2){callout('STAGE BOSS · 파멸의 고리',ph);addDonut(b,105-ph*8,365+ph*32,delay,1.20,'파멸의 고리',col);addCircle(b,p.x,p.y,100+ph*6,delay+.18,1.12,'파멸 핵',col);if(ph===3)addCircle(b,b.x,b.y,135,delay+.42,1.14,'중심 폭발',col)}
 else if(n%5===3){callout('STAGE BOSS · 회전 절단',ph);const c=5+ph;for(let i=0;i<c;i++)addCone(b,a+i*TAU/c,560+ph*55,.22+ph*.018,delay,1.16,'회전 절단',col)}
 else{callout('STAGE BOSS · 복합 공세',ph);addLine(b,a,720,86,delay,1.22,'관통 돌진',col);addLine(b,a+Math.PI/2,620,68,delay+.15,1.10,'교차 절단',col);addLine(b,a-Math.PI/2,620,68,delay+.15,1.10,'교차 절단',col);if(ph>=2)addDonut(b,130,330,delay+.36,1.12,'후속 고리',col)}
 b._tierPatternCd=Math.max(3.8,5.7-ph*.38);
}

/* Stat identity: current progression already gives 10-stage bosses +30%, so these are additional tier multipliers. */
const oldSpawnTier24=spawn;
spawn=function(b=false){const before=g?.e?.length||0,out=oldSpawnTier24(b);if(!b||!g||g.e.length<=before)return out;const boss=g.e.slice(before).find(e=>e.boss)||g.e.find(e=>e.boss&&!e.dead);if(!boss||boss._bossTierApplied)return out;const tier=tierFor(g.stage);boss._bossTierApplied=true;boss.bossTier=tier;
 if(tier==='mid'){boss.max*=1.38;boss.hp=boss.max;boss.dmg*=1.10;boss.spd*=1.03;boss.r=Math.round(boss.r*1.08);boss._tierPatternCd=2.9}
 else if(tier==='major'){boss.max*=1.65;boss.hp=boss.max;boss.dmg*=1.18;boss.spd*=1.05;boss.r=Math.round(boss.r*1.14);boss._tierPatternCd=2.4}
 else boss._tierPatternCd=999;
 return out};

/* Network boss-tier metadata so every client renders the same hierarchy. */
const oldNetTier24=makeNetState;
makeNetState=function(){const s=oldNetTier24();if(!g||!Array.isArray(s.e))return s;const m=new Map(g.e.map(e=>[e.id,e]));for(const d of s.e){const e=m.get(d.id);if(e?.boss){d.bossTier=e.bossTier||tierFor(g.stage)}}return s};
const oldSnapTier24=applyNetSnapshot;
applyNetSnapshot=function(s,initial=false){oldSnapTier24(s,initial);if(!g)return;const m=new Map((s.e||[]).map(e=>[e.id,e]));for(const e of g.e){const d=m.get(e.id);if(e.boss&&d?.bossTier)e.bossTier=d.bossTier}};

/* Extra tier pattern engine runs beside the biome pattern engine, but avoids unfair dense overlap. */
const oldUpdateTier24=updateHost;
updateHost=function(dt){const out=oldUpdateTier24(dt);if(!g||state!=='play')return out;const b=g.e.find(e=>e.boss&&!e.dead);if(!b)return out;const tier=b.bossTier||tierFor(g.stage);if(tier==='normal')return out;b._tierPatternCd=(b._tierPatternCd??2.8)-dt;const active=(g.raidTelegraphs||[]).filter(t=>t.bossId===b.id).length;if(b._tierPatternCd<=0&&active<=1){if(tier==='major')castMajor(b);else castMid(b)}return out};

/* Boss visual hierarchy + HUD label. */
const oldDrawTier24=drawEnemy;
drawEnemy=function(e){oldDrawTier24(e);if(!e?.boss)return;const tier=e.bossTier||tierFor(g?.stage||0);if(tier==='normal')return;const t=g?.t||0,col=tier==='major'?'#ff5f58':'#ffb65e',rings=tier==='major'?3:2;ctx.save();ctx.strokeStyle=col;ctx.globalAlpha=.38+.12*Math.sin(t*4);ctx.lineWidth=tier==='major'?3:2;for(let i=0;i<rings;i++){ctx.beginPath();ctx.arc(e.x,e.y,e.r+14+i*8+Math.sin(t*3+i)*2,0,TAU);ctx.stroke()}ctx.restore()};
const oldHudTier24=hud;
hud=function(){oldHudTier24();if(!g||!g.boss)return;const b=g.e.find(e=>e.boss&&!e.dead);if(!b)return;const tier=b.bossTier||tierFor(g.stage),el=document.getElementById('bname');if(el){const raw=ST[g.stage]?.boss||'BOSS';el.textContent=tier==='major'?`STAGE BOSS // ${raw}`:tier==='mid'?`MID BOSS // ${raw}`:raw}};

window.NEXUS_BOSS_TIERS_V24={build:'0.24',midStages:[5,15,25,35,45],majorStages:[10,20,30,40,50],midHp:1.38,majorHp:1.65,midPatterns:4,majorPatterns:5,addsContinue:true};
})();
