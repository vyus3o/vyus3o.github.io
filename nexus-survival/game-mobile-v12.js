/* NEXUS SURVIVAL mobile UI + seamless class dash build 0.12 / multiplayer hotfix 0.19 */
(function(){
'use strict';
const IS_MOBILE=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DASH12={
 warrior:{name:'돌진',dist:185,dur:.115,cd:2.35,inv:.24,col:'#e39a68',carry:105},
 archer:{name:'구르기',dist:225,dur:.155,cd:1.65,inv:.34,col:'#9fd477',carry:145},
 mage:{name:'순간이동',dist:295,dur:.065,cd:2.55,inv:.27,col:'#9eaeff',carry:70},
 priest:{name:'성광 도약',dist:205,dur:.13,cd:2.05,inv:.40,col:'#f4df82',carry:95}
};
function moveVector(p){
  let dx=(keys.KeyD?1:0)-(keys.KeyA?1:0),dy=(keys.KeyS?1:0)-(keys.KeyW?1:0),l=Math.hypot(dx,dy);
  if(l<.01){dx=p?.face<0?-1:1;dy=0;l=1}
  return {dx:dx/l,dy:dy/l};
}
function canSmoothDash(p){return !!(g&&state==='play'&&p&&p.alive&&!p.pendingLevel&&!p.levelSafe&&(p.dashReadyAt||0)<=g.t&&!p._smoothDash)}
function startSmoothDash(p,dx,dy,predicted=false){
  if(!canSmoothDash(p))return false;
  const cfg=DASH12[p.cls]||DASH12.warrior,l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  p.dashReadyAt=g.t+cfg.cd;p.dashInvulUntil=g.t+cfg.inv;p.face=dx<-.1?-1:dx>.1?1:p.face;
  p._smoothDash={dx,dy,left:cfg.dur,dur:cfg.dur,speed:cfg.dist/cfg.dur,col:cfg.col,cls:p.cls};
  p._dashCarry=null;
  if(p.cls==='priest')p.shield=(p.shield||0)+p.max*.025;
  if(typeof addFx==='function'){
    if(p.cls==='mage')addFx('dashBlink',p.x,p.y,{r:33,col:cfg.col,life:.2,ownerId:p.id});
    else addFx('dashPath',p.x,p.y,{r:cfg.dist*.65,r2:p.cls==='warrior'?18:13,col:cfg.col,angle:Math.atan2(dy,dx),life:.18,ownerId:p.id});
  }
  if(!predicted&&g)g.shake=Math.max(g.shake||0,1.2);
  return true;
}
function tickDash(p,dt){
  if(!p)return;
  const d=p._smoothDash;
  if(d){
    const step=Math.min(dt,d.left),cfg=DASH12[p.cls]||DASH12.warrior;
    p.x=clamp(p.x+d.dx*d.speed*step,28,WORLD.w-28);p.y=clamp(p.y+d.dy*d.speed*step,32,WORLD.h-28);p.tx=p.x;p.ty=p.y;
    d.left-=step;
    if(d.left<=.0001){p._smoothDash=null;p._dashCarry={dx:d.dx,dy:d.dy,left:.11,max:.11,speed:cfg.carry};if(typeof addFx==='function'&&p.cls==='mage')addFx('dashBlink',p.x,p.y,{r:38,col:cfg.col,life:.24,ownerId:p.id});}
  }else if(p._dashCarry){
    const c=p._dashCarry,step=Math.min(dt,c.left),fade=Math.max(0,c.left/c.max);
    p.x=clamp(p.x+c.dx*c.speed*fade*step,28,WORLD.w-28);p.y=clamp(p.y+c.dy*c.speed*fade*step,32,WORLD.h-28);p.tx=p.x;p.ty=p.y;
    c.left-=step;if(c.left<=0)p._dashCarry=null;
  }
}
function localSmoothDash(){
  const p=typeof localPlayer==='function'?localPlayer():null;if(!canSmoothDash(p))return;
  const v=moveVector(p);
  if(NET.mode==='client'){
    if(startSmoothDash(p,v.dx,v.dy,true)&&NET.hostConn?.open)NET.hostConn.send({t:'smoothDash12',dx:v.dx,dy:v.dy});
  }else startSmoothDash(p,v.dx,v.dy,false);
}
function installHooks(){
  if(window.__nexusMobile12Hooks)return;window.__nexusMobile12Hooks=true;
  if(typeof netHostMessage==='function'){
    const prevNetHost=netHostMessage;
    netHostMessage=function(conn,msg){
      if(msg&&msg.t==='smoothDash12'&&conn?.playerId&&g&&state==='play'){
        const p=playerById(conn.playerId),dx=Number(msg.dx)||0,dy=Number(msg.dy)||0;if(Math.hypot(dx,dy)>.1)startSmoothDash(p,dx,dy,false);return;
      }
      return prevNetHost(conn,msg);
    };
  }
  if(typeof updatePlayers==='function'){
    const prevPlayers=updatePlayers;
    updatePlayers=function(dt){const out=prevPlayers(dt);if(g)for(const p of Object.values(g.players))tickDash(p,dt);return out};
  }
  if(typeof updateClient==='function'){
    const prevClient=updateClient;
    updateClient=function(dt){const out=prevClient(dt);const p=typeof localPlayer==='function'?localPlayer():null;tickDash(p,dt);return out};
  }
  if(typeof applyNetSnapshot==='function'){
    const prevSnap=applyNetSnapshot;
    applyNetSnapshot=function(s,initial=false){
      const p0=typeof localPlayer==='function'?localPlayer():null,protect=!!(p0&&(p0._smoothDash||p0._dashCarry)),x=p0?.x,y=p0?.y;
      const out=prevSnap(s,initial);const p=typeof localPlayer==='function'?localPlayer():null;
      if(protect&&p&&!initial){p.x=x;p.y=y;p.tx=x;p.ty=y}return out;
    };
  }
  window.addEventListener('keydown',e=>{
    if(e.code==='Space'&&state==='play'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)localSmoothDash()}
  },true);
}
function replaceDashButton(){
  const old=document.getElementById('raidDashBtn');if(!old||old.dataset.v12)return;
  const btn=old.cloneNode(true);btn.dataset.v12='1';old.replaceWith(btn);
  btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();localSmoothDash()},{passive:false});
}
function patchHud(){
  if(typeof hud!=='function'||hud._mobile12)return;
  const prev=hud;const next=function(){const out=prev();if(IS_MOBILE&&g){const info=document.getElementById('enemyInfo');if(info&&!/KILLS/.test(info.textContent))info.textContent+=` · KILLS ${g.kills||0}`;}return out};next._mobile12=true;hud=next;
}
function patchMinimap(){
  if(!IS_MOBILE||typeof drawMinimap!=='function'||drawMinimap._mobile12)return;
  const fn=function(){
    if(!g)return;const mw=94,mh=62,x=730,y=112,sx=mw/WORLD.w,sy=mh/WORLD.h;
    ctx.save();ctx.globalAlpha=.78;ctx.fillStyle='#07100cc8';ctx.fillRect(x,y,mw,mh);ctx.strokeStyle='#738079';ctx.lineWidth=1;ctx.strokeRect(x,y,mw,mh);
    ctx.fillStyle='#b8ec71';ctx.fillRect(x+g.n.x*sx-2,y+g.n.y*sy-2,4,4);
    for(const p of Object.values(g.players)){ctx.fillStyle=playerRingColor(p.id);ctx.fillRect(x+p.x*sx-1.5,y+p.y*sy-1.5,3,3)}
    const b=g.e.find(e=>e.boss);if(b){ctx.fillStyle='#ff6758';ctx.fillRect(x+b.x*sx-2,y+b.y*sy-2,5,5)}
    ctx.strokeStyle='#ffffff45';ctx.strokeRect(x+g.cam.x*sx,y+g.cam.y*sy,W*sx,H*sy);ctx.restore();
  };fn._mobile12=true;drawMinimap=fn;
}
function syncViewport(){
  if(!IS_MOBILE)return;const wrap=document.getElementById('wrap');if(!wrap)return;
  const vv=window.visualViewport,h=Math.round(vv?.height||window.innerHeight),w=Math.round(vv?.width||window.innerWidth);
  document.documentElement.style.setProperty('--nexus-vh',h+'px');document.documentElement.style.setProperty('--nexus-vw',w+'px');
  try{window.scrollTo(0,0)}catch{}
}
function uiTick(){
  replaceDashButton();
  const btn=document.getElementById('raidDashBtn'),p=typeof localPlayer==='function'?localPlayer():null;
  if(btn&&p&&g){const cfg=DASH12[p.cls]||DASH12.warrior,remain=Math.max(0,(p.dashReadyAt||0)-g.t);btn.textContent=remain>0?`${cfg.name}\n${remain.toFixed(1)}`:cfg.name;btn.style.borderColor=cfg.col;btn.style.opacity=remain>0?'.58':'1'}
  requestAnimationFrame(uiTick);
}
function boot(){installHooks();patchHud();patchMinimap();syncViewport();replaceDashButton();requestAnimationFrame(uiTick);window.addEventListener('resize',syncViewport,{passive:true});window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});window.visualViewport?.addEventListener('scroll',syncViewport,{passive:true});}
/* Install input/network hooks immediately. Waiting for window.load left a short legacy-dash race on slower clients. */
boot();
if(document.readyState!=='complete')window.addEventListener('load',syncViewport,{once:true});
})();
