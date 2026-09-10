/* NEXUS SURVIVAL raid bosses + class dash build 0.11 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const oldDamagePlayer=damagePlayer;
const oldUpdateEnemies=updateEnemies;
const oldUpdateHost=updateHost;
const oldUpdateClient=updateClient;
const oldApplyNetEvent=applyNetEvent;
const oldNetHostMessage=netHostMessage;
const oldKillEnemy=killEnemy;
const oldDrawNexus=drawNexus;
const oldDrawEnemy=drawEnemy;
const oldDrawFx=drawFx;
const oldHud=hud;

function ensureRaid(){
  if(!g)return;
  if(!Array.isArray(g.raidTelegraphs))g.raidTelegraphs=[];
  if(!g.raidSerial)g.raidSerial=1;
}
function raidFx(type,x,y,o={}){
  if(!g)return;
  const fx={
    type,x,y,life:o.life??.38,max:o.life??.38,r:o.r??40,r2:o.r2??0,
    col:o.col||'#ff6a52',angle:o.angle||0,len:o.len||0,width:o.width||0,
    shape:o.shape||'circle',inner:o.inner||0,kind:o.kind||'',dx:o.dx||0,dy:o.dy||0
  };
  g.fx.push(fx);
  if(NET.mode==='host')netEmitEvent({k:'fx',fx});
}
function emitRaidEvent(ev){ if(NET.mode==='host')netEmitEvent(ev); }

const DASH={
  warrior:{name:'돌진',dist:185,cd:2.35,inv:.24,col:'#e39a68'},
  archer:{name:'구르기',dist:225,cd:1.65,inv:.34,col:'#9fd477'},
  mage:{name:'순간이동',dist:295,cd:2.55,inv:.27,col:'#9eaeff'},
  priest:{name:'성광 도약',dist:205,cd:2.05,inv:.40,col:'#f4df82'}
};
function getDashVector(p){
  let dx=(keys.KeyD?1:0)-(keys.KeyA?1:0),dy=(keys.KeyS?1:0)-(keys.KeyW?1:0);
  let l=Math.hypot(dx,dy);
  if(l<.01){dx=p?.face<0?-1:1;dy=0;l=1}
  return {dx:dx/l,dy:dy/l};
}
function canDash(p){
  return !!(g&&state==='play'&&p&&p.alive&&!p.pendingLevel&&!p.levelSafe&&(p.dashReadyAt||0)<=g.t);
}
function performDash(p,dx,dy,predicted=false){
  if(!canDash(p))return false;
  const cfg=DASH[p.cls]||DASH.warrior,l=Math.hypot(dx,dy)||1;
  dx/=l;dy/=l;
  const sx=p.x,sy=p.y;
  const ex=clamp(sx+dx*cfg.dist,28,WORLD.w-28),ey=clamp(sy+dy*cfg.dist,32,WORLD.h-28);
  p.x=ex;p.y=ey;p.tx=ex;p.ty=ey;
  p.dashReadyAt=g.t+cfg.cd;
  p.dashInvulUntil=g.t+cfg.inv;
  p.face=dx<-.1?-1:dx>.1?1:p.face;
  if(p.cls==='priest')p.shield=(p.shield||0)+p.max*.025;
  if(p.cls==='warrior')raidFx('dashPath',(sx+ex)/2,(sy+ey)/2,{shape:'line',angle:Math.atan2(dy,dx),len:Math.hypot(ex-sx,ey-sy),width:18,col:cfg.col,life:.22,kind:'warrior'});
  else if(p.cls==='archer')raidFx('dashPath',(sx+ex)/2,(sy+ey)/2,{shape:'line',angle:Math.atan2(dy,dx),len:Math.hypot(ex-sx,ey-sy),width:13,col:cfg.col,life:.28,kind:'archer'});
  else if(p.cls==='mage'){
    raidFx('dashBlink',sx,sy,{r:33,col:cfg.col,life:.30,kind:'start'});
    raidFx('dashBlink',ex,ey,{r:38,col:cfg.col,life:.34,kind:'end'});
  }else{
    raidFx('dashBlink',sx,sy,{r:30,col:cfg.col,life:.28,kind:'holy'});
    raidFx('dashBlink',ex,ey,{r:42,col:cfg.col,life:.38,kind:'holy'});
  }
  if(!predicted)g.shake=Math.max(g.shake,1.8);
  return true;
}
function triggerDash(){
  const p=localPlayer();
  if(!canDash(p))return;
  const v=getDashVector(p);
  if(NET.mode==='client'){
    if(performDash(p,v.dx,v.dy,true)&&NET.hostConn?.open)NET.hostConn.send({t:'raidDash',dx:v.dx,dy:v.dy});
  }else performDash(p,v.dx,v.dy,false);
}

damagePlayer=function(p,amount){
  if(p&&g&&(p.dashInvulUntil||0)>g.t){
    raidFx('dashEvade',p.x,p.y,{r:28,col:(DASH[p.cls]||DASH.warrior).col,life:.16,kind:p.cls});
    return;
  }
  return oldDamagePlayer(p,amount);
};

netHostMessage=function(conn,msg){
  if(msg&&msg.t==='raidDash'&&conn?.playerId&&g&&state==='play'){
    const p=playerById(conn.playerId),dx=Number(msg.dx)||0,dy=Number(msg.dy)||0;
    if(Math.hypot(dx,dy)>.1)performDash(p,dx,dy,false);
    return;
  }
  return oldNetHostMessage(conn,msg);
};

function phaseOf(b){const q=b.hp/Math.max(1,b.max);return q<=.35?3:q<=.70?2:1}
function nearestAlive(b){
  let best=null,bd=1e9;
  for(const p of Object.values(g.players)){if(!p.alive||p.pendingLevel||p.levelSafe)continue;let d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd){bd=d;best=p}}
  return {p:best,d:bd};
}
function addTg(t){
  ensureRaid();
  const tg={
    id:g.raidSerial++,type:t.type||'circle',x:t.x,y:t.y,angle:t.angle||0,
    r:t.r||100,inner:t.inner||0,len:t.len||0,width:t.width||0,half:t.half||.45,
    life:t.delay||1,max:t.delay||1,damage:t.damage||20,col:t.col||'#ff5f4f',
    name:t.name||'DANGER',bossId:t.bossId||0,knock:t.knock||0,moveBoss:!!t.moveBoss,
    endX:t.endX||0,endY:t.endY||0,stage:t.stage??(g?.stage||0)
  };
  g.raidTelegraphs.push(tg);
  emitRaidEvent({k:'raidTelegraph',tg:{...tg}});
  return tg;
}
function callout(name,phase){
  showRaidCallout(name,phase);
  emitRaidEvent({k:'raidCallout',name,phase});
}
function targetPoint(p,spread=0){
  return {x:clamp(p.x+(Math.random()-.5)*spread,100,WORLD.w-100),y:clamp(p.y+(Math.random()-.5)*spread,100,WORLD.h-100)};
}
function circleAt(b,x,y,r,delay,mult,name,col='#ff6756',knock=55){
  addTg({type:'circle',x,y,r,delay,damage:b.dmg*mult,name,col,bossId:b.id,knock,stage:g.stage});
}
function coneFrom(b,angle,len,half,delay,mult,name,col='#ff775a'){
  addTg({type:'cone',x:b.x,y:b.y,angle,len,half,delay,damage:b.dmg*mult,name,col,bossId:b.id,knock:65,stage:g.stage});
}
function lineFrom(b,angle,len,width,delay,mult,name,col='#ff6d55',moveBoss=false){
  addTg({type:'line',x:b.x,y:b.y,angle,len,width,delay,damage:b.dmg*mult,name,col,bossId:b.id,knock:80,moveBoss,
    endX:clamp(b.x+Math.cos(angle)*len,WORLD.w*.02,WORLD.w*.98),
    endY:clamp(b.y+Math.sin(angle)*len,WORLD.h*.02,WORLD.h*.98),stage:g.stage});
}
function donutAt(b,inner,r,delay,mult,name,col='#ff6575'){
  addTg({type:'donut',x:b.x,y:b.y,inner,r,delay,damage:b.dmg*mult,name,col,bossId:b.id,knock:70,stage:g.stage});
}
function bossPattern(b,phase){
  const near=nearestAlive(b),p=near.p;
  if(!p)return;
  const a=Math.atan2(p.y-b.y,p.x-b.x),n=b.raidCastNo||0;b.raidCastNo=n+1;
  const st=g.stage;
  if(st===0){
    if(n%3===0){
      callout('대지 분쇄',phase);circleAt(b,b.x,b.y,220,1.12,1.35,'대지 분쇄','#ff7757',90);
    }else if(n%3===1){
      callout('오우거 돌진',phase);lineFrom(b,a,phase>=3?760:650,phase>=2?130:115,1.00,1.45,'오우거 돌진','#ff5d4b',true);
    }else{
      callout('연속 강타',phase);const q=targetPoint(p);circleAt(b,q.x,q.y,115,.95,1.20,'연속 강타','#ff8b58',65);
      circleAt(b,clamp(q.x+145,80,WORLD.w-80),q.y,105,1.15,1.12,'연속 강타','#ff8b58',60);
      if(phase>=2)circleAt(b,clamp(q.x-145,80,WORLD.w-80),q.y,105,1.35,1.12,'연속 강타','#ff8b58',60);
    }
  }else if(st===1){
    if(n%3===0){
      callout('역병 개화',phase);
      for(const tp of Object.values(g.players).filter(x=>x.alive&&!x.pendingLevel)){const q=targetPoint(tp,50);circleAt(b,q.x,q.y,105,1.22,1.08,'역병 개화','#b7d94d',45)}
      if(phase>=3){const q=targetPoint(p,260);circleAt(b,q.x,q.y,135,1.55,1.18,'거대 역병','#c7e35b',55)}
    }else if(n%3===1){
      callout('부패의 숨결',phase);coneFrom(b,a,phase>=3?610:525,.52,1.02,1.28,'부패의 숨결','#b7d94d');
    }else{
      callout('죽음의 고리',phase);donutAt(b,125,phase>=3?390:345,1.15,1.30,'죽음의 고리','#c1df58');
    }
  }else if(st===2){
    if(n%3===0){
      callout('빙하 십자',phase);const base=a;
      const count=phase>=3?6:4;
      for(let i=0;i<count;i++)lineFrom(b,base+i*TAU/count,phase>=3?680:590,84,1.08,1.22,'빙하 십자','#8eddf5');
    }else if(n%3===1){
      callout('빙결 감옥',phase);
      for(const tp of Object.values(g.players).filter(x=>x.alive&&!x.pendingLevel)){const q=targetPoint(tp,30);circleAt(b,q.x,q.y,112,1.18,1.18,'빙결 감옥','#91dff5',55)}
    }else{
      callout('절대영도 고리',phase);donutAt(b,phase>=3?95:135,phase>=3?410:360,1.10,1.32,'절대영도 고리','#8eddf5');
    }
  }else if(st===3){
    if(n%3===0){
      callout('지옥불 운석',phase);
      const shots=phase>=3?6:phase===2?5:4;
      for(let i=0;i<shots;i++){const q=targetPoint(p,460);circleAt(b,q.x,q.y,88+(i%2)*14,.90+i*.10,1.15,'지옥불 운석','#ff7042',55)}
    }else if(n%3===1){
      callout('화염 군주의 참격',phase);coneFrom(b,a,phase>=3?650:555,phase>=3?.64:.52,.92,1.38,'화염 군주의 참격','#ff6840');
    }else{
      callout('불타는 전선',phase);
      const base=a-Math.PI/2;
      for(let i=-1;i<=1;i++){const ox=Math.cos(base)*i*145,oy=Math.sin(base)*i*145;addTg({type:'line',x:b.x+ox,y:b.y+oy,angle:a,len:650,width:78,delay:1.02,damage:b.dmg*1.25,name:'불타는 전선',col:'#ff7b43',bossId:b.id,knock:70,stage:g.stage})}
      if(phase>=3)lineFrom(b,a+Math.PI,520,90,1.30,1.28,'후방 화염','#ff9a4a');
    }
  }else{
    if(n%3===0){
      callout('공허 부채꼴',phase);
      const sectors=phase>=3?5:3;
      for(let i=0;i<sectors;i++)coneFrom(b,a+i*TAU/sectors,phase>=3?640:560,.30,1.08,1.28,'공허 부채꼴','#b27aff');
    }else if(n%3===1){
      callout('심연의 격자',phase);
      const count=phase>=3?8:6;
      for(let i=0;i<count;i++)lineFrom(b,i*TAU/count+(g.t*.25),phase>=3?720:620,phase>=3?72:62,1.05,1.24,'심연의 격자','#a86eff');
    }else{
      callout('차원 붕괴',phase);
      donutAt(b,110,phase>=3?430:370,1.05,1.34,'차원 붕괴','#b371ff');
      const q=targetPoint(p,120);circleAt(b,q.x,q.y,105,1.38,1.25,'붕괴 핵','#d084ff',60);
      if(phase>=3)circleAt(b,b.x,b.y,125,1.62,1.32,'심연 핵','#d084ff',75);
    }
  }
}
function inShape(t,p){
  const dx=p.x-t.x,dy=p.y-t.y,d=Math.hypot(dx,dy);
  if(t.type==='circle')return d<=t.r;
  if(t.type==='donut')return d>=t.inner&&d<=t.r;
  if(t.type==='cone')return d<=t.len&&Math.abs(angleDiff(Math.atan2(dy,dx),t.angle))<=t.half;
  if(t.type==='line'){
    const ca=Math.cos(t.angle),sa=Math.sin(t.angle),along=dx*ca+dy*sa,side=-dx*sa+dy*ca;
    return along>=0&&along<=t.len&&Math.abs(side)<=t.width*.5;
  }
  return false;
}
function executeTg(t){
  const b=g.e.find(e=>e.id===t.bossId&&!e.dead);
  for(const p of Object.values(g.players)){
    if(!p.alive||p.pendingLevel||p.levelSafe||!inShape(t,p))continue;
    damagePlayer(p,t.damage);
    if((p.dashInvulUntil||0)>g.t)continue;
    let kx=0,ky=0;
    if(t.type==='line'){kx=Math.cos(t.angle);ky=Math.sin(t.angle)}
    else{let l=Math.hypot(p.x-t.x,p.y-t.y)||1;kx=(p.x-t.x)/l;ky=(p.y-t.y)/l}
    p.x=clamp(p.x+kx*t.knock,28,WORLD.w-28);p.y=clamp(p.y+ky*t.knock,32,WORLD.h-32);p.tx=p.x;p.ty=p.y;
  }
  if(t.moveBoss&&b){b.x=t.endX;b.y=t.endY;b.tx=b.x;b.ty=b.y}
  raidFx('raidImpact',t.x,t.y,{shape:t.type,r:t.r,inner:t.inner,len:t.len,width:t.width,angle:t.angle,col:t.col,life:.36,kind:t.name});
  g.shake=Math.max(g.shake,t.type==='circle'||t.type==='donut'?7:5);
}
function updateTgs(dt,authoritative){
  ensureRaid();
  for(let i=g.raidTelegraphs.length-1;i>=0;i--){
    const t=g.raidTelegraphs[i];t.life-=dt;
    if(t.life<=0){
      if(authoritative)executeTg(t);
      g.raidTelegraphs.splice(i,1);
    }
  }
}
function raidHostTick(dt){
  if(!g||state!=='play')return;
  ensureRaid();
  updateTgs(dt,true);
  const b=g.e.find(e=>e.boss&&!e.dead);
  if(!b){g.raidTelegraphs.length=0;g.raidBossPhase=0;return}
  if(!b.raid){
    b.raid={cd:2.0,phase:1};
    b.raidCastNo=0;
    b.raidBaseSpd=Math.max(70,b.spd||0);
    b.spd=b.raidBaseSpd;
    g.raidBossPhase=1;
    callout('RAID START · '+ST[g.stage].boss,1);
  }
  const phase=phaseOf(b);
  if(phase!==b.raid.phase){
    b.raid.phase=phase;g.raidBossPhase=phase;b.raid.cd=1.25;
    callout('PHASE '+phase,phase);
    raidFx('bossPhase',b.x,b.y,{r:120+phase*18,col:phase===3?'#ff5b55':'#ffc05e',life:.8,kind:'phase'});
  }
  const near=nearestAlive(b);
  if(near.d>900)return;
  b.raid.cd-=dt;
  const casting=g.raidTelegraphs.some(t=>t.bossId===b.id);
  if(b.raid.cd<=0&&!casting){
    bossPattern(b,phase);
    b.raid.cd=phase===1?4.7:phase===2?3.9:3.15;
  }
}
function raidClientTick(dt){
  if(!g||state!=='play')return;
  ensureRaid();updateTgs(dt,false);
}
updateHost=function(dt){oldUpdateHost(dt);raidHostTick(dt)};
updateClient=function(dt){oldUpdateClient(dt);raidClientTick(dt)};

updateEnemies=function(dt){
  if(!g)return oldUpdateEnemies(dt);
  const restore=[];
  for(const e of g.e){
    if(!e.boss||e.dead)continue;
    if(!e.raidBaseSpd)e.raidBaseSpd=Math.max(70,e.spd||0);
    let targetSpd=e.raidBaseSpd*(phaseOf(e)===3?1.15:phaseOf(e)===2?1.07:1);
    restore.push([e,e.spd,targetSpd]);
    const casting=Array.isArray(g.raidTelegraphs)&&g.raidTelegraphs.some(t=>t.bossId===e.id);
    e.spd=casting?0:targetSpd;
  }
  const out=oldUpdateEnemies(dt);
  for(const [e,,targetSpd] of restore)if(!e.dead)e.spd=targetSpd;
  return out;
};

killEnemy=function(e,ownerId){
  const wasBoss=!!e?.boss;
  const out=oldKillEnemy(e,ownerId);
  if(wasBoss&&g){ensureRaid();g.raidTelegraphs.length=0;g.raidBossPhase=0;hideRaidCallout()}
  return out;
};

applyNetEvent=function(ev){
  if(ev?.k==='raidTelegraph'&&g){
    ensureRaid();
    if(!g.raidTelegraphs.some(t=>t.id===ev.tg.id))g.raidTelegraphs.push({...ev.tg});
    return;
  }
  if(ev?.k==='raidCallout'){showRaidCallout(ev.name,ev.phase);return}
  const out=oldApplyNetEvent(ev);
  if(ev?.k==='fx'&&ev.fx?.type==='raidImpact'&&g)g.shake=Math.max(g.shake,4);
  return out;
};

function tgAlpha(t){
  const p=1-clamp(t.life/t.max,0,1),pulse=.7+.3*Math.sin((g?.t||0)*16+p*8);
  return {p,pulse};
}
function drawRaidTelegraphs(){
  if(!g||!g.raidTelegraphs?.length)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const t of g.raidTelegraphs){
    const {p,pulse}=tgAlpha(t),fillA=.07+.13*p,strokeA=.58+.35*pulse;
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle||0);
    ctx.fillStyle=t.col;ctx.strokeStyle=t.col;ctx.lineWidth=2+2.3*p;ctx.globalAlpha=fillA;
    if(t.type==='circle'){
      ctx.beginPath();ctx.arc(0,0,t.r,0,TAU);ctx.fill();
      ctx.globalAlpha=strokeA;ctx.setLineDash([12,8]);ctx.beginPath();ctx.arc(0,0,t.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,Math.max(8,t.r*p),0,TAU);ctx.stroke();
    }else if(t.type==='donut'){
      ctx.beginPath();ctx.arc(0,0,t.r,0,TAU);ctx.arc(0,0,t.inner,0,TAU,true);ctx.fill('evenodd');
      ctx.globalAlpha=strokeA;ctx.setLineDash([12,8]);ctx.beginPath();ctx.arc(0,0,t.r,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,0,t.inner,0,TAU);ctx.stroke();ctx.setLineDash([]);
    }else if(t.type==='cone'){
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,t.len,-t.half,t.half);ctx.closePath();ctx.fill();
      ctx.globalAlpha=strokeA;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(-t.half)*t.len,Math.sin(-t.half)*t.len);ctx.arc(0,0,t.len,-t.half,t.half);ctx.closePath();ctx.stroke();
      ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,t.len*p,-t.half,t.half);ctx.stroke();
    }else if(t.type==='line'){
      ctx.fillRect(0,-t.width*.5,t.len,t.width);
      ctx.globalAlpha=strokeA;ctx.setLineDash([14,9]);ctx.strokeRect(0,-t.width*.5,t.len,t.width);ctx.setLineDash([]);
      ctx.globalAlpha=.8;ctx.fillRect(t.len*p-3,-t.width*.5,6,t.width);
    }
    ctx.restore();
  }
  ctx.restore();
}
drawNexus=function(n,t){drawRaidTelegraphs();return oldDrawNexus(n,t)};

drawEnemy=function(e){
  if(e?.boss){
    const phase=phaseOf(e),tt=g?.t||0;
    ctx.save();ctx.globalAlpha=phase===3?.50:phase===2?.32:.16;ctx.strokeStyle=phase===3?'#ff5f58':phase===2?'#ffc05d':'#e5a86e';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r+15+Math.sin(tt*4)*4,0,TAU);ctx.stroke();
    if(phase>=2){ctx.setLineDash([10,8]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+26,tt,tt+Math.PI*1.6);ctx.stroke();ctx.setLineDash([])}
    ctx.restore();
  }
  return oldDrawEnemy(e);
};

drawFx=function(f){
  if(!['raidImpact','dashPath','dashBlink','dashEvade','bossPhase'].includes(f?.type))return oldDrawFx(f);
  const a=clamp(f.life/(f.max||1),0,1),p=1-a;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='lighter';
  if(f.type==='dashPath'){
    ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.globalAlpha=.15+.45*a;ctx.strokeStyle=f.col;ctx.lineWidth=f.width||14;
    ctx.beginPath();ctx.moveTo(-(f.len||100)/2,0);ctx.lineTo((f.len||100)/2,0);ctx.stroke();
    ctx.globalAlpha=.9*a;ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-(f.len||100)/2+i*17,i*3);ctx.lineTo((f.len||100)/2-i*7,i*3);ctx.stroke()}
  }else if(f.type==='dashBlink'||f.type==='dashEvade'){
    ctx.globalAlpha=.22*a;ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(f.x,f.y,(f.r||30)*(1+.35*p),0,TAU);ctx.fill();
    ctx.globalAlpha=.9*a;ctx.strokeStyle=f.col;ctx.lineWidth=3;for(let i=0;i<8;i++){let q=i*TAU/8+(g?.t||0)*2;ctx.beginPath();ctx.moveTo(f.x+Math.cos(q)*8,f.y+Math.sin(q)*8);ctx.lineTo(f.x+Math.cos(q)*(f.r||30)*(1+.55*p),f.y+Math.sin(q)*(f.r||30)*(1+.55*p));ctx.stroke()}
  }else if(f.type==='bossPhase'){
    ctx.globalAlpha=.75*a;ctx.strokeStyle=f.col;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,(f.r||120)*( .55+.65*p),0,TAU);ctx.stroke();
    ctx.globalAlpha=.25*a;ctx.lineWidth=12;ctx.beginPath();ctx.arc(f.x,f.y,(f.r||120)*(.35+.75*p),0,TAU);ctx.stroke();
  }else{
    ctx.globalAlpha=.23*a;ctx.fillStyle=f.col;ctx.strokeStyle=f.col;ctx.lineWidth=4;
    if(f.shape==='line'){
      ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.fillRect(0,-(f.width||70)/2,f.len||500,f.width||70);
      ctx.globalAlpha=.85*a;ctx.strokeRect(0,-(f.width||70)/2,f.len||500,f.width||70);
    }else if(f.shape==='donut'){
      ctx.beginPath();ctx.arc(f.x,f.y,f.r||300,0,TAU);ctx.arc(f.x,f.y,f.inner||100,0,TAU,true);ctx.fill('evenodd');
      ctx.globalAlpha=.9*a;ctx.beginPath();ctx.arc(f.x,f.y,f.r||300,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(f.x,f.y,f.inner||100,0,TAU);ctx.stroke();
    }else{
      ctx.beginPath();ctx.arc(f.x,f.y,(f.r||100)*(1+.12*p),0,TAU);ctx.fill();ctx.globalAlpha=.9*a;ctx.stroke();
    }
  }
  ctx.restore();
};

function installUi(){
  if(document.getElementById('raidDashHud'))return;
  const style=document.createElement('style');
  style.textContent=`
#raidDashHud{position:absolute;right:18px;bottom:22px;z-index:18;background:#07100ddb;border:1px solid #78857c;padding:8px 11px;font:800 12px Arial,sans-serif;letter-spacing:.5px;color:#f3f2df;pointer-events:none}
#raidBossCallout{position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:19;min-width:250px;text-align:center;padding:8px 14px;background:#190b0be6;border:1px solid #c95f50;color:#ffe1c2;font:900 13px Arial,sans-serif;letter-spacing:1px;opacity:0;transition:opacity .12s}
#raidBossCallout.show{opacity:1}
#raidDashBtn{position:absolute;right:20px;bottom:74px;z-index:35;width:88px;height:88px;border-radius:50%;border:2px solid #c9d5c8;background:#18241fd9;color:#fff;font:900 12px Arial,sans-serif;touch-action:none;display:none}
@media (hover:none),(pointer:coarse){#raidDashBtn{display:block}#raidDashHud{right:18px;bottom:170px}}
`;
  document.head.appendChild(style);
  const wrap=document.getElementById('wrap')||document.body;
  const hud=document.createElement('div');hud.id='raidDashHud';hud.style.display='none';wrap.appendChild(hud);
  const call=document.createElement('div');call.id='raidBossCallout';wrap.appendChild(call);
  const btn=document.createElement('button');btn.id='raidDashBtn';btn.textContent='DASH';wrap.appendChild(btn);
  btn.addEventListener('pointerdown',e=>{e.preventDefault();triggerDash()});
}
let calloutTimer=0;
function showRaidCallout(name,phase){
  installUi();const el=document.getElementById('raidBossCallout');if(!el)return;
  el.textContent=(phase?`PHASE ${phase} // `:'')+name;el.classList.add('show');
  clearTimeout(calloutTimer);calloutTimer=setTimeout(()=>el.classList.remove('show'),1250);
}
function hideRaidCallout(){document.getElementById('raidBossCallout')?.classList.remove('show')}
function refreshRaidUi(){
  installUi();
  const el=document.getElementById('raidDashHud'),btn=document.getElementById('raidDashBtn'),p=localPlayer();
  if(!g||state==='menu'||!p){el.style.display='none';if(btn)btn.style.visibility='hidden';return}
  el.style.display='block';if(btn)btn.style.visibility=state==='play'?'visible':'hidden';
  const cfg=DASH[p.cls]||DASH.warrior,remain=Math.max(0,(p.dashReadyAt||0)-g.t);
  el.textContent=`[SPACE] ${cfg.name} · ${remain<=0?'READY':remain.toFixed(1)+'s'}`;
  if(btn){btn.textContent=remain<=0?cfg.name:`${cfg.name} ${remain.toFixed(1)}`;btn.style.borderColor=cfg.col;btn.style.opacity=remain<=0?'1':'.55'}
}
hud=function(){const out=oldHud();refreshRaidUi();return out};

window.addEventListener('keydown',e=>{
  if(e.code==='Space'){if(state==='play'){e.preventDefault();if(!e.repeat)triggerDash()}}
},{passive:false});
installUi();
})();