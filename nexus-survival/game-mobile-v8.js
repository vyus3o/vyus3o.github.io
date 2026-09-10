/* NEXUS SURVIVAL mobile portrait build 0.8 */
(function(){
const IS_MOBILE=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if(!IS_MOBILE)return;

document.documentElement.classList.add('mobile-build','portrait-build');
window.NEXUS_MOBILE={enabled:true,orientation:'portrait',appReady:true};

let joy={active:false,id:null,x:0,y:0};
function setMove(x,y){
  const dead=.15;
  keys.KeyA=x<-dead;keys.KeyD=x>dead;keys.KeyW=y<-dead;keys.KeyS=y>dead;
}
function clearMove(){
  joy.active=false;joy.id=null;joy.x=joy.y=0;setMove(0,0);
  const k=document.getElementById('joyKnob');if(k)k.style.transform='translate(0px,0px)';
}
function joyPoint(e,base){
  const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.34;
  let dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy)||1;
  if(d>max){dx=dx/d*max;dy=dy/d*max}
  joy.x=dx/max;joy.y=dy/max;setMove(joy.x,joy.y);
  const k=document.getElementById('joyKnob');if(k)k.style.transform=`translate(${dx}px,${dy}px)`;
}

function buildMobileUI(){
  const wrap=document.getElementById('wrap');if(!wrap||document.getElementById('mobileControls'))return;

  const controls=document.createElement('div');
  controls.id='mobileControls';
  controls.innerHTML=`
    <div id="joystick" aria-label="이동 조이스틱"><div id="joyKnob"></div><div id="joyLabel">MOVE</div></div>
    <div id="mobileActions"><button id="mobilePauseBtn" class="mobBtn" type="button">PAUSE</button></div>`;
  wrap.appendChild(controls);

  const pause=document.createElement('div');
  pause.id='mobilePauseOverlay';
  pause.innerHTML='<div class="pauseCard">PAUSED<small>PAUSE 버튼을 다시 누르면 계속합니다</small></div>';
  wrap.appendChild(pause);

  const portrait=document.createElement('div');
  portrait.id='portraitNotice';
  portrait.innerHTML='<div><div class="phoneIcon"></div><b>휴대폰을 세로로 돌려주세요</b><span>NEXUS SURVIVAL 모바일 버전은 세로 화면에 맞춰져 있습니다.</span></div>';
  document.body.appendChild(portrait);

  const base=document.getElementById('joystick');
  base.addEventListener('pointerdown',e=>{if(state!=='play')return;e.preventDefault();joy.active=true;joy.id=e.pointerId;base.setPointerCapture?.(e.pointerId);joyPoint(e,base)});
  base.addEventListener('pointermove',e=>{if(!joy.active||e.pointerId!==joy.id)return;e.preventDefault();joyPoint(e,base)});
  base.addEventListener('pointerup',e=>{if(e.pointerId===joy.id)clearMove()});
  base.addEventListener('pointercancel',e=>{if(e.pointerId===joy.id)clearMove()});
  base.addEventListener('lostpointercapture',clearMove);
  window.addEventListener('pointerup',clearMove,{passive:true});

  document.getElementById('mobilePauseBtn').addEventListener('click',e=>{
    e.preventDefault();
    if(NET.mode!=='solo'){toast('멀티에서는 전체 일시정지를 사용할 수 없습니다');return}
    if(state==='play'){state='mobilePause';clearMove();pause.classList.add('show')}
    else if(state==='mobilePause'){state='play';pause.classList.remove('show')}
  });

  const start=document.getElementById('start');
  if(start&&!document.getElementById('mobileFullscreen')){
    const full=document.createElement('button');
    full.id='mobileFullscreen';full.type='button';full.textContent='FULL SCREEN // 세로 전체화면';
    start.insertAdjacentElement('afterend',full);
    full.addEventListener('click',async()=>{
      try{
        if(!document.fullscreenElement&&wrap.requestFullscreen)await wrap.requestFullscreen();
        if(screen.orientation?.lock)await screen.orientation.lock('portrait');
      }catch{toast('세로 화면 그대로 플레이할 수 있습니다')}
    });
  }
}

function uiLoop(){
  const controls=document.getElementById('mobileControls');
  if(controls){
    const modalOpen=['levelModal','chestModal','endModal'].some(id=>!document.getElementById(id)?.classList.contains('hidden'));
    const show=!!g&&state==='play'&&!modalOpen;
    controls.style.display=show?'block':'none';
    if(!show)clearMove();
  }
  requestAnimationFrame(uiLoop);
}

/* 세로 크롭에서 미니맵이 화면 밖으로 나가지 않도록 중앙 우측으로 이동 */
if(typeof drawMinimap==='function'){
  drawMinimap=function(){
    if(!g)return;
    const mw=112,mh=78,x=674,y=132,sx=mw/WORLD.w,sy=mh/WORLD.h;
    ctx.save();ctx.globalAlpha=.88;ctx.fillStyle='#07100cdc';ctx.fillRect(x,y,mw,mh);ctx.strokeStyle='#65736c';ctx.lineWidth=1;ctx.strokeRect(x,y,mw,mh);
    ctx.fillStyle='#b8ec71';ctx.fillRect(x+g.n.x*sx-2,y+g.n.y*sy-2,5,5);
    for(let p of Object.values(g.players)){ctx.fillStyle=playerRingColor(p.id);ctx.fillRect(x+p.x*sx-2,y+p.y*sy-2,4,4)}
    const boss=g.e.find(e=>e.boss);if(boss){ctx.fillStyle='#e56a68';ctx.fillRect(x+boss.x*sx-3,y+boss.y*sy-3,6,6)}
    ctx.strokeStyle='#ffffff55';ctx.strokeRect(x+g.cam.x*sx,y+g.cam.y*sy,W*sx,H*sy);
    ctx.fillStyle='#aebbb2';ctx.font='8px sans-serif';ctx.textAlign='left';ctx.fillText('MAP',x+5,y+10);ctx.restore();
  };
}

/* 모바일에서는 과도한 파티클만 줄이고 스킬/데미지 정보는 유지 */
if(typeof burst==='function'){
  const oldBurst=burst;
  burst=function(x,y,c,n=5){let cap=n>20?11:n>10?8:n;return oldBurst(x,y,c,cap)};
}
if(typeof addText==='function'){
  const oldText=addText;
  addText=function(x,y,value,kind='enemy',crit=false,net=true){
    if(g?.text?.length>115&&kind==='dot'&&!crit)return;
    return oldText(x,y,value,kind,crit,net);
  };
}

/* iOS/Android 브라우저 제스처가 게임 입력을 방해하지 않도록 제한 */
['levelModal','chestModal','endModal'].forEach(id=>document.getElementById(id)?.addEventListener('pointerdown',clearMove,{passive:true}));
window.addEventListener('blur',clearMove);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMove()});
window.addEventListener('contextmenu',e=>{if(e.target.closest?.('#wrap'))e.preventDefault()});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});

function boot(){buildMobileUI();requestAnimationFrame(uiLoop)}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
