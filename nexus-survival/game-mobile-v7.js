/* NEXUS SURVIVAL mobile build 0.7 */
(function(){
const IS_MOBILE=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if(!IS_MOBILE)return;

let joy={active:false,id:null,x:0,y:0};
function setMove(x,y){
  const dead=.16;
  keys.KeyA=x<-dead;keys.KeyD=x>dead;keys.KeyW=y<-dead;keys.KeyS=y>dead;
}
function clearMove(){joy.active=false;joy.id=null;joy.x=joy.y=0;setMove(0,0);const k=document.getElementById('joyKnob');if(k)k.style.transform='translate(0px,0px)'}
function joyPoint(e,base){
  const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.33;
  let dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy)||1;
  if(d>max){dx=dx/d*max;dy=dy/d*max}
  joy.x=dx/max;joy.y=dy/max;setMove(joy.x,joy.y);
  const k=document.getElementById('joyKnob');if(k)k.style.transform=`translate(${dx}px,${dy}px)`;
}
function buildMobileUI(){
  const wrap=document.getElementById('wrap');if(!wrap||document.getElementById('mobileControls'))return;
  const controls=document.createElement('div');controls.id='mobileControls';controls.innerHTML=`
    <div id="joystick" aria-label="이동 조이스틱"><div id="joyKnob"></div><div id="joyLabel">MOVE</div></div>
    <div id="mobileActions"><button id="mobilePauseBtn" class="mobBtn">PAUSE</button></div>`;
  wrap.appendChild(controls);
  const pause=document.createElement('div');pause.id='mobilePauseOverlay';pause.innerHTML='<div class="pauseCard">PAUSED<small>PAUSE 버튼을 다시 누르면 계속합니다</small></div>';wrap.appendChild(pause);
  const rotate=document.createElement('div');rotate.id='rotateNotice';rotate.innerHTML='<div><span class="rotateIcon">▯</span><b>휴대폰을 가로로 돌려주세요</b><span>NEXUS SURVIVAL은 가로 화면에 맞춰져 있습니다.</span></div>';document.body.appendChild(rotate);

  const base=document.getElementById('joystick');
  base.addEventListener('pointerdown',e=>{if(state!=='play')return;e.preventDefault();joy.active=true;joy.id=e.pointerId;base.setPointerCapture?.(e.pointerId);joyPoint(e,base)});
  base.addEventListener('pointermove',e=>{if(!joy.active||e.pointerId!==joy.id)return;e.preventDefault();joyPoint(e,base)});
  base.addEventListener('pointerup',e=>{if(e.pointerId===joy.id)clearMove()});
  base.addEventListener('pointercancel',e=>{if(e.pointerId===joy.id)clearMove()});
  base.addEventListener('lostpointercapture',clearMove);

  document.getElementById('mobilePauseBtn').addEventListener('click',e=>{
    e.preventDefault();
    if(NET.mode!=='solo'){toast('멀티에서는 전체 일시정지를 사용할 수 없습니다');return}
    if(state==='play'){state='mobilePause';clearMove();pause.classList.add('show')}
    else if(state==='mobilePause'){state='play';pause.classList.remove('show')}
  });

  const start=document.getElementById('start');
  if(start&&!document.getElementById('mobileFullscreen')){
    const full=document.createElement('button');full.id='mobileFullscreen';full.type='button';full.textContent='FULL SCREEN // 전체화면';start.insertAdjacentElement('afterend',full);
    full.addEventListener('click',async()=>{
      try{
        if(!document.fullscreenElement&&wrap.requestFullscreen)await wrap.requestFullscreen();
        if(screen.orientation?.lock)await screen.orientation.lock('landscape');
      }catch{toast('가로 화면으로 돌리면 모바일 화면에 맞춰집니다')}
    });
  }
}

function uiLoop(){
  const controls=document.getElementById('mobileControls');
  if(controls){
    const modalOpen=!document.getElementById('levelModal').classList.contains('hidden')||!document.getElementById('chestModal').classList.contains('hidden')||!document.getElementById('endModal').classList.contains('hidden');
    controls.style.display=(g&&state==='play'&&!modalOpen)?'block':'none';
    if(state!=='play')clearMove();
  }
  requestAnimationFrame(uiLoop);
}

/* 모바일에서는 과도한 파티클만 줄이고 핵심 스킬 이펙트/데미지 숫자는 유지 */
if(typeof burst==='function'){
  const oldBurst=burst;
  burst=function(x,y,c,n=5){let cap=n>18?10:n>8?7:n;return oldBurst(x,y,c,cap)};
}
if(typeof addText==='function'){
  const oldText=addText;
  addText=function(x,y,value,kind='enemy',crit=false,net=true){
    if(g?.text?.length>110&&kind==='dot'&&!crit)return;
    return oldText(x,y,value,kind,crit,net);
  };
}

/* 모바일 UI가 모달 뒤에서 입력을 먹지 않도록 함 */
['levelModal','chestModal','endModal'].forEach(id=>document.getElementById(id)?.addEventListener('pointerdown',clearMove,{passive:true}));
window.addEventListener('blur',clearMove);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMove()});
window.addEventListener('contextmenu',e=>{if(e.target.closest?.('#wrap'))e.preventDefault()});

/* 홈 화면 실행 시 앱처럼 보이도록 */
document.documentElement.classList.add('mobile-build');
window.addEventListener('DOMContentLoaded',()=>{buildMobileUI();requestAnimationFrame(uiLoop)});
if(document.readyState!=='loading'){buildMobileUI();requestAnimationFrame(uiLoop)}
})();
