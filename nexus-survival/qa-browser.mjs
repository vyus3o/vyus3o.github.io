import puppeteer from 'puppeteer-core';

const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expectedBuild=process.env.NEXUS_EXPECTED_BUILD||'0.18';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});

const fail=(msg,detail='')=>{throw new Error(`${msg}${detail?` :: ${detail}`:''}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function openPage(mobile=false){
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{
    if(m.type()!=='error')return;
    const text=m.text();
    if(text.includes('Failed to load resource'))return;
    errors.push(`console: ${text}`);
  });
  page.on('response',r=>{
    if(r.status()<400)return;
    try{
      const u=new URL(r.url());
      if(u.pathname.endsWith('/favicon.ico'))return;
    }catch{}
    errors.push(`http ${r.status()}: ${r.url()}`);
  });
  if(mobile){
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  }else await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(build=>window.NEXUS_RUNTIME_CHECK?.build===build,{timeout:15000},expectedBuild);
  const qa=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);
  if(!qa.ok)fail('runtime QA failed',JSON.stringify(qa.failed));
  return {page,errors};
}

async function population(page){
  return await page.evaluate(()=>eval(`(()=>{
    const cam=g?.cam||{x:0,y:0};
    const enemies=(g?.e||[]).filter(e=>!e.dead&&!e.boss);
    const visible=enemies.filter(e=>e.x>=cam.x-30&&e.x<=cam.x+W+30&&e.y>=cam.y-30&&e.y<=cam.y+H+30);
    return {hostiles:enemies.length,visible:visible.length,nextEnemyId:g?.nextEnemyId||0,spawn:g?.spawn,time:g?.t||0,boss:!!g?.boss,ids:enemies.map(e=>e.id).slice(0,30)};
  })()`));
}

try{
  /* ---------------- Solo: actual visible horde ---------------- */
  const desktop=await openPage(false);
  const page=desktop.page;
  const menu=await page.evaluate(()=>({classes:document.querySelectorAll('#classes .classCard').length,diffs:document.querySelectorAll('#diffs .diffBtn').length,build:document.querySelector('.brandCorner')?.textContent||''}));
  if(menu.classes!==4)fail('class menu count',String(menu.classes));
  if(menu.diffs!==5)fail('difficulty menu count',String(menu.diffs));
  if(!menu.build.includes(expectedBuild))fail('wrong build label',menu.build);

  await page.click('#start');
  await page.waitForFunction(()=>eval("state==='play'&&!!g&&!!localPlayer()"),{timeout:5000});
  await page.evaluate(()=>eval("localPlayer().at=999"));
  const started=await page.evaluate(()=>eval("({stage:g.stage,players:Object.keys(g.players).length,alive:localPlayer().alive,spawnFix:window.NEXUS_SPAWN_FIX})"));
  if(started.stage!==0||started.players<1||!started.alive||started.spawnFix?.build!=='0.18')fail('solo start/spawn fix failed',JSON.stringify(started));

  await page.waitForFunction(()=>eval(`(()=>{const c=g.cam||{x:0,y:0},es=g.e.filter(e=>!e.dead&&!e.boss),v=es.filter(e=>e.x>=c.x-30&&e.x<=c.x+W+30&&e.y>=c.y-30&&e.y<=c.y+H+30).length;return es.length>=6&&v>=2&&g.nextEnemyId>=7})()`),{timeout:8000});
  const soloPopulation=await population(page);
  if(soloPopulation.hostiles<6||soloPopulation.visible<2||soloPopulation.nextEnemyId<7||soloPopulation.boss)fail('visible monster horde did not grow',JSON.stringify(soloPopulation));

  /* progression sanity after spawn test */
  await page.evaluate(()=>eval("g.stage=9;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForSelector('#advancementModal:not(.hidden) .advanceCard',{timeout:3000});
  const advCards=await page.$$eval('#advancementModal .advanceCard',els=>els.length);
  if(advCards!==2)fail('advancement card count',String(advCards));
  await page.click('#advancementModal .advanceCard');
  await page.waitForFunction(()=>eval("state==='play'&&g.stage===10&&!!localPlayer().subclass"),{timeout:3000});
  const afterAdv=await page.evaluate(()=>eval("({stage:g.stage,subclass:localPlayer().subclass,awakened:localPlayer().awakened})"));
  if(afterAdv.awakened)fail('awakening happened too early');

  await page.evaluate(()=>eval("g.stage=29;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForSelector('#advancementModal:not(.hidden) #advContinue:not(.hidden)',{timeout:3000});
  await page.click('#advContinue');
  await page.waitForFunction(()=>eval("state==='play'&&g.stage===30&&localPlayer().awakened===true"),{timeout:3000});
  const ult=await page.evaluate(()=>eval("(()=>{const p=localPlayer();const before=p.ultReadyAt;const ok=window.nexusUseUlt(p,false);return {ok,before,after:p.ultReadyAt,t:g.t}})()"));
  if(!ult.ok||!(ult.after>ult.t))fail('R ultimate activation failed',JSON.stringify(ult));

  await page.evaluate(()=>eval("g.stage=49;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForFunction(()=>eval("state==='ended'"),{timeout:3000});
  const ending=await page.evaluate(()=>({title:document.getElementById('endTitle')?.textContent,text:document.getElementById('endText')?.textContent}));
  if(ending.title!=='VICTORY'||!ending.text?.includes('STAGE 50'))fail('stage 50 victory failed',JSON.stringify(ending));
  if(desktop.errors.length)fail('desktop browser errors',desktop.errors.join(' | '));
  await page.close();

  /* ---------------- Real PeerJS 2-player host/client ---------------- */
  const hostPack=await openPage(false),clientPack=await openPage(false);
  const host=hostPack.page,client=clientPack.page;
  await host.click('#modeHost');
  await host.waitForFunction(()=>eval("NET.mode==='host'&&NET.ready&&NET.roomCode.length===6"),{timeout:15000});
  const room=await host.evaluate(()=>eval('NET.roomCode'));
  if(!room||room.length!==6)fail('multiplayer room creation failed',String(room));

  await client.click('#modeJoin');
  await client.waitForSelector('#roomInput:not([disabled])',{timeout:3000});
  await client.type('#roomInput',room);
  await client.click('#joinBtn');
  await host.waitForFunction(()=>eval("Object.keys(NET.lobby).length===2"),{timeout:15000});
  await client.waitForFunction(()=>eval("NET.mode==='client'&&NET.ready&&NET.localId==='p2'&&Object.keys(NET.lobby).length===2"),{timeout:15000});

  await host.click('#start');
  await host.waitForFunction(()=>eval("state==='play'&&!!g&&Object.keys(g.players).length===2"),{timeout:5000});
  await client.waitForFunction(()=>eval("state==='play'&&!!g&&Object.keys(g.players).length===2"),{timeout:8000});
  await host.evaluate(()=>eval("Object.values(g.players).forEach(p=>p.at=999)"));

  await host.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=7&&g.nextEnemyId>=8"),{timeout:9000});
  await client.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=5"),{timeout:9000});
  const hostPop=await population(host),clientPop=await population(client);
  const overlap=hostPop.ids.filter(id=>clientPop.ids.includes(id)).length;
  if(hostPop.hostiles<7||clientPop.hostiles<5||overlap<5)fail('multiplayer monster snapshot sync failed',JSON.stringify({hostPop,clientPop,overlap}));

  const beforeMove=await host.evaluate(()=>eval("g.players.p2.x"));
  await client.keyboard.down('d');
  await sleep(750);
  await client.keyboard.up('d');
  await host.waitForFunction(x=>eval("g.players.p2.x")>x+15,{timeout:4000},beforeMove);
  const afterMove=await host.evaluate(()=>eval("g.players.p2.x"));
  const clientStage=await client.evaluate(()=>eval('g.stage'));
  const hostStage=await host.evaluate(()=>eval('g.stage'));
  if(clientStage!==hostStage)fail('multiplayer stage desync',`${hostStage}/${clientStage}`);
  if(hostPack.errors.length)fail('multiplayer host browser errors',hostPack.errors.join(' | '));
  if(clientPack.errors.length)fail('multiplayer client browser errors',clientPack.errors.join(' | '));
  await client.close();await host.close();

  /* ---------------- Mobile portrait controls + spawning ---------------- */
  const mobile=await openPage(true);
  const mp=mobile.page;
  await mp.click('#start');
  await mp.waitForFunction(()=>eval("state==='play'&&!!g"),{timeout:5000});
  await mp.evaluate(()=>eval("localPlayer().at=999"));
  await mp.waitForFunction(()=>{
    const j=document.getElementById('joystick'),r=j?.getBoundingClientRect();
    return !!j&&r.width>0&&r.height>0;
  },{timeout:5000});
  await mp.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=4"),{timeout:7000});
  const mobileUi=await mp.evaluate(()=>{
    const j=document.getElementById('joystick'),d=document.getElementById('raidDashBtn');
    const r=j?.getBoundingClientRect();
    return {mobile:document.documentElement.classList.contains('mobile-build'),joystick:!!j&&r.width>0&&r.height>0,dash:!!d,orientation:document.querySelector('meta[name="screen-orientation"]')?.content,hostiles:g.e.filter(e=>!e.dead&&!e.boss).length};
  });
  if(!mobileUi.mobile||!mobileUi.joystick||!mobileUi.dash||mobileUi.orientation!=='portrait'||mobileUi.hostiles<4)fail('mobile portrait/spawn failed',JSON.stringify(mobileUi));
  if(mobile.errors.length)fail('mobile browser errors',mobile.errors.join(' | '));
  await mp.close();

  console.log(`PASS browser:runtime-qa · ${base}`);
  console.log('PASS browser:solo-start');
  console.log(`PASS browser:visible-horde · ${soloPopulation.hostiles} total / ${soloPopulation.visible} visible by ${soloPopulation.time.toFixed(2)}s`);
  console.log(`PASS browser:stage10-advancement · ${afterAdv.subclass}`);
  console.log('PASS browser:stage30-awakening-and-R');
  console.log('PASS browser:stage50-victory');
  console.log(`PASS browser:multiplayer-room-and-sync · room ${room} · host ${hostPop.hostiles} / client ${clientPop.hostiles} · overlap ${overlap}`);
  console.log(`PASS browser:multiplayer-input · p2 x ${beforeMove.toFixed(1)} -> ${afterMove.toFixed(1)}`);
  console.log(`PASS browser:mobile-portrait-and-spawn · ${mobileUi.hostiles} hostiles`);
  console.log('9/9 browser smoke checks passed');
} finally {
  await browser.close();
}
