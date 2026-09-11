/* NEXUS SURVIVAL pixel sprite rendering layer build 0.32
 * Uses the user-provided pixel concept assets as a compact embedded atlas.
 * Rendering only: combat, balance, networking and authoritative state are unchanged.
 */
(function(){
'use strict';
const BUILD='0.32',TAU=Math.PI*2;
const MAP={
 archer:[3,3,72,56],gunslinger:[78,3,72,57],mage:[153,3,72,57],necromancer:[228,3,72,59],priest:[303,3,72,60],rogue:[378,3,72,53],warrior:[453,3,72,60],
 arcane_warlock:[528,3,72,61],artillerist:[603,3,72,65],assassin:[678,3,72,67],berserker:[3,73,72,62],desperado:[78,73,72,69],elementalist:[153,73,72,64],guardian:[228,73,72,63],inquisitor:[303,73,69,72],lich:[375,73,64,72],necrolord:[442,73,71,72],ranger:[516,73,72,62],seraph:[591,73,72,62],shadowdancer:[666,73,72,71],sniper:[3,148,72,60],
 bat:[78,148,53,54],goblin:[134,148,43,54],skeleton:[180,148,42,54],slime:[225,148,49,54],spider:[277,148,54,47],dark_mage:[334,148,39,54],elite_goblin:[376,148,45,54],elite_ogre:[424,148,48,54],fire_elemental:[475,148,54,54],ice_golem:[532,148,45,54],bomber:[580,148,34,54],cursed_knight:[617,148,37,54],healer_oracle:[657,148,43,54],treasure_goblin:[703,148,48,54],void_wraith:[3,211,51,54],final_boss_01:[57,211,108,74],mid_boss_01:[168,211,101,108],stage_boss_01:[272,211,108,90]
};
const BASE=new Set(['warrior','archer','mage','priest','necromancer','rogue','gunslinger']);
const ADV_ALIAS={warlock:'arcane_warlock'};
const COMMON=['goblin','bat','skeleton','spider','slime'];
const ELITE=['elite_goblin','elite_ogre','dark_mage','ice_golem','fire_elemental'];
const SPECIAL=['cursed_knight','void_wraith','bomber','healer_oracle','treasure_goblin'];
const ENEMY_KEYS=new Set([...COMMON,...ELITE,...SPECIAL,'final_boss_01','mid_boss_01','stage_boss_01']);
const PARTY={p1:'#d8ff65',p2:'#65d5ff',p3:'#ff9f6b',p4:'#d891ff',p5:'#ff6fae'};
const img=new Image();
const enemyAtlas=document.createElement('canvas');
const enemyAtlasCtx=enemyAtlas.getContext('2d',{willReadFrequently:true});
const enemyRegionOK=new Set();
let ready=false,loadError=false,enemyAtlasReady=false,enemyAtlasFailed=false;
img.decoding='async';
img.onload=()=>{ready=true;prepareEnemyAtlas();if(window.NEXUS_PIXEL_V32){window.NEXUS_PIXEL_V32.ready=true;window.NEXUS_PIXEL_V32.loadError=false}try{delete window.NEXUS_PIXEL_ATLAS_B64}catch{}};
img.onerror=()=>{loadError=true;enemyAtlasFailed=true;if(window.NEXUS_PIXEL_V32){window.NEXUS_PIXEL_V32.loadError=true;window.NEXUS_PIXEL_V32.enemyAtlasFailed=true}};
img.src='data:image/png;base64,'+(window.NEXUS_PIXEL_ATLAS_B64||'');
const oldPlayer=drawPlayer,oldEnemy=drawEnemy;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stageNo=()=>Math.max(1,(g?.stage||0)+1);
function keyForPlayer(p){const s=ADV_ALIAS[p?.subclass]||p?.subclass;return s&&MAP[s]?s:(MAP[p?.cls]?p.cls:'warrior')}
function keyForEnemy(e){if(e?.boss){if(stageNo()===50)return'final_boss_01';if(e.bossTier==='mid')return'mid_boss_01';return'stage_boss_01'}const i=Math.abs(Number(e?.type)||0)%5;if(e?.elite)return ELITE[i];if(e?.grade==='legendary')return SPECIAL[i];return COMMON[i]}
function prepareEnemyAtlas(){
 try{
  enemyAtlas.width=img.naturalWidth||768;enemyAtlas.height=img.naturalHeight||352;enemyAtlasCtx.imageSmoothingEnabled=false;enemyRegionOK.clear();
  for(const key of ENEMY_KEYS){
   const a=MAP[key];if(!a)continue;const[sx,sy,sw,sh]=a;
   enemyAtlasCtx.clearRect(sx,sy,sw,sh);enemyAtlasCtx.drawImage(img,sx,sy,sw,sh,sx,sy,sw,sh);
   const id=enemyAtlasCtx.getImageData(sx,sy,sw,sh),d=id.data;let visible=0;
   for(let i=3;i<d.length;i+=4){if(d[i]>12){d[i]=255;visible++}else d[i]=0}
   const minVisible=Math.max(24,Math.floor(sw*sh*.012));
   if(visible>=minVisible){enemyAtlasCtx.putImageData(id,sx,sy);enemyRegionOK.add(key)}else enemyAtlasCtx.clearRect(sx,sy,sw,sh);
  }
  enemyAtlasReady=true;enemyAtlasFailed=false;
  if(window.NEXUS_PIXEL_V32){window.NEXUS_PIXEL_V32.enemyAtlasReady=true;window.NEXUS_PIXEL_V32.enemyAtlasFailed=false;window.NEXUS_PIXEL_V32.validEnemySprites=enemyRegionOK.size}
 }catch(err){
  enemyAtlasReady=false;enemyAtlasFailed=true;
  if(window.NEXUS_PIXEL_V32){window.NEXUS_PIXEL_V32.enemyAtlasReady=false;window.NEXUS_PIXEL_V32.enemyAtlasFailed=true;window.NEXUS_PIXEL_V32.enemyAtlasError=String(err?.message||err)}
 }
}
function sprite(key,x,y,targetH,opt={}){const a=MAP[key];if(!a||!ready)return false;if(opt.enemy&&enemyAtlasReady&&!enemyRegionOK.has(key))return false;const[sx,sy,sw,sh]=a,scale=targetH/sh,dw=Math.round(sw*scale),dh=Math.round(targetH),bottom=opt.bottom??Math.round(y+20),dx=-dw/2,dy=-dh,source=(opt.enemy&&enemyAtlasReady)?enemyAtlas:img;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalCompositeOperation='source-over';ctx.translate(Math.round(x),bottom);if(opt.rot)ctx.rotate(opt.rot);ctx.scale(opt.flip===false?1:-1,1);ctx.globalAlpha=opt.alpha??1;if(opt.glow){ctx.shadowColor=opt.glow;ctx.shadowBlur=opt.glowBlur||8}ctx.drawImage(source,sx,sy,sw,sh,dx,dy,dw,dh);ctx.restore();return true}
function tickMarker(p,isLocal){const col=PARTY[p.id]||'#eef2e9',x=p.x,y=p.y+15,s=isLocal?15:11;ctx.save();ctx.strokeStyle=col;ctx.lineWidth=isLocal?2:1.4;ctx.globalAlpha=isLocal?.92:.55;for(let i=0;i<4;i++){const sx=i%2?-1:1,sy=i<2?-1:1;ctx.beginPath();ctx.moveTo(x+sx*s,y+sy*6);ctx.lineTo(x+sx*(s-6),y+sy*6);ctx.stroke()}ctx.restore()}
function shieldHex(p){if(!(p.shield>0))return;const hx=p.x+18,hy=p.y-30,r=7;ctx.save();ctx.strokeStyle='#a8e8ff';ctx.lineWidth=2;ctx.globalAlpha=.86;ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6,xx=hx+Math.cos(a)*r,yy=hy+Math.sin(a)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.stroke();ctx.restore()}
function playerLabel(p){ctx.save();ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffffd9';const n=(window.NEXUS_ADV?.[p.subclass]?.name)||C?.[p.cls]?.n||p.cls;ctx.fillText(`${n} Lv.${p.l||1}`,p.x,p.y-41);ctx.restore()}
function playerFx(p,key,isLocal){const t=g?.t||0,col=C?.[p.cls]?.col||PARTY[p.id]||'#d8ff65',atk=(p._v27AttackUntil||0)>t,cast=(p._v27CastUntil||0)>t;if((p.dashInvulUntil||0)>t){ctx.save();ctx.globalAlpha=.16;for(let i=1;i<=3;i++)sprite(key,p.x-(p.face||1)*i*8,p.y,BASE.has(key)?58:64,{flip:(p.face||1)>0,alpha:.14/i});ctx.restore()}if(atk){const a=p._v27AttackAngle||0;ctx.save();ctx.strokeStyle=col;ctx.lineWidth=p.cls==='warrior'?4:2;ctx.globalAlpha=.38;ctx.beginPath();ctx.arc(p.x,p.y,29,a-.65,a+.65);ctx.stroke();ctx.restore()}if(cast){ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(p.x,p.y-4,25+2*Math.sin(t*14),t,t+4.8);ctx.stroke();ctx.restore()}if(isLocal){ctx.save();ctx.globalAlpha=.09;ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y+8,20,0,TAU);ctx.fill();ctx.restore()}}
drawPlayer=function(p,isLocal=false){if(!ready||!p)return oldPlayer(p,isLocal);const t=g?.t||0,key=keyForPlayer(p),moving=Math.min(1,Math.hypot(p.vx||0,p.vy||0)/Math.max(1,p.spd||220)),walk=Math.sin((p.walk||t*7));const atk=(p._v27AttackUntil||0)>t,bob=(moving>.03?walk*1.4:Math.sin(t*2.2+(Number(p.id?.slice?.(1))||0))*.45),rot=atk?Math.sin((p._v27AttackUntil-t)*35)*.045:clamp((p.vx||0)/Math.max(1,p.spd||220)*.025,-.025,.025);shadow(p.x,p.y,BASE.has(key)?42:46);playerFx(p,key,isLocal);sprite(key,p.x,p.y+bob,BASE.has(key)?58:65,{flip:(p.face||1)>0,rot,glow:(p.awakened?'#d8ff65':null),glowBlur:5});tickMarker(p,isLocal);shieldHex(p);playerLabel(p)};
function gradeRing(e){const col=e.gradeColor||({uncommon:'#7ed36e',rare:'#62b9ff',epic:'#c47cff',legendary:'#ffbd55'}[e.grade])||'#c9cec7';if(e.grade==='common'&&!e.elite)return;const r=(e.r||18)+(e.elite?7:4),t=g?.t||0;ctx.save();ctx.strokeStyle=col;ctx.lineWidth=e.grade==='legendary'?2.5:1.5;ctx.globalAlpha=e.elite?.62:.42+.12*Math.sin(t*5+(Number(e.id)||0));ctx.beginPath();ctx.ellipse(e.x,e.y+13,r,5+r*.06,0,0,TAU);ctx.stroke();ctx.restore()}
function enemyOverlay(e){const t=g?.t||0;if(e.markedUntil>t){ctx.save();ctx.strokeStyle='#f0d56d';ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(e.x,e.y-4,(e.r||18)+8,0,TAU);ctx.stroke();ctx.restore()}if(e.boss){const col=e.bossTier==='mid'?'#ffb65e':'#ff6258',rings=e.bossTier==='major'||stageNo()===50?3:2;ctx.save();ctx.strokeStyle=col;ctx.globalAlpha=.2+.08*Math.sin(t*4);ctx.lineWidth=2;for(let i=0;i<rings;i++){ctx.beginPath();ctx.arc(e.x,e.y,(e.r||42)+16+i*7+Math.sin(t*3+i)*2,0,TAU);ctx.stroke()}ctx.restore()}}
drawEnemy=function(e){if(!ready||!e||enemyAtlasFailed||!enemyAtlasReady)return oldEnemy(e);const key=keyForEnemy(e);if(!enemyRegionOK.has(key))return oldEnemy(e);const t=g?.t||0,baseR=e.r||18,swift=e.variantRole==='swift',brute=e.variantRole==='brute',bob=Math.sin((e.anim||t*6)+(Number(e.id)||0)*.31)*(e.boss?1.4:swift?2.0:1.15);let h=e.boss?(stageNo()===50?116:(e.bossTier==='mid'?102:96)):(e.elite?53:brute?48:swift?41:44);h*=clamp(baseR/18,.82,e.boss?1.25:1.38);const face=(e.vx??0)>=0,rot=swift?Math.sin(t*7+(Number(e.id)||0))*.035:0,glow=e.boss?'#ff744f':e.elite?(e.gradeColor||'#e0bd70'):null;shadow(e.x,e.y,e.boss?Math.min(100,h*.72):Math.max(32,h*.72));gradeRing(e);if(!sprite(key,e.x,e.y+bob,h,{flip:face,rot,glow,glowBlur:e.boss?10:5,enemy:true}))return oldEnemy(e);enemyOverlay(e)};
function applyClassCardSprites(){const cards=[...document.querySelectorAll('.classCard')];for(const card of cards){if(card.dataset.pixel32)return;const txt=(card.textContent||'').toLowerCase();let key=null;for(const k of BASE){const n=(C?.[k]?.n||'').toLowerCase();if(txt.includes(k)||(n&&txt.includes(n))){key=k;break}}if(!key)continue;card.dataset.pixel32='1';card.style.position='relative';const badge=document.createElement('canvas');badge.width=84;badge.height=72;badge.className='pixelClassPreview32';badge.style.cssText='position:absolute;right:6px;bottom:4px;width:70px;height:60px;image-rendering:pixelated;pointer-events:none;opacity:.94';const bc=badge.getContext('2d');bc.imageSmoothingEnabled=false;const a=MAP[key],scale=58/a[3],dw=a[2]*scale,dh=58;bc.drawImage(img,a[0],a[1],a[2],a[3],42-dw/2,69-dh,dw,dh);card.appendChild(badge)}}
img.addEventListener('load',()=>{setTimeout(applyClassCardSprites,40);const mo=new MutationObserver(()=>applyClassCardSprites());const root=document.getElementById('classes');if(root)mo.observe(root,{childList:true,subtree:true})},{once:true});
window.NEXUS_PIXEL_V32={build:BUILD,ready:false,loadError:false,source:'user-provided pixel assets v1',atlas:{w:768,h:352,embedded:true,quantizedColors:48},baseClasses:7,advancedClasses:14,commonMonsters:5,eliteMonsters:5,specialVisuals:5,bosses:3,pixelated:true,renderOnly:true,drawImageSprites:true,enemyOpaque:true,enemyFallback:true,enemyAtlasReady:false,enemyAtlasFailed:false,validEnemySprites:0};
// Data URLs may finish during this script on fast/headless browsers. Repair the
// public readiness marker deterministically if the load completed before the
// marker object above existed; otherwise the normal onload handler will set it.
if(img.complete){
 if(img.naturalWidth>0){ready=true;prepareEnemyAtlas();window.NEXUS_PIXEL_V32.ready=true;window.NEXUS_PIXEL_V32.loadError=false;try{delete window.NEXUS_PIXEL_ATLAS_B64}catch{}}
 else if(loadError)window.NEXUS_PIXEL_V32.loadError=true;
}
})();
