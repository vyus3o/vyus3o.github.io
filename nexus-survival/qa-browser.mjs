import puppeteer from 'puppeteer-core';

const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expectedBuild=process.env.NEXUS_EXPECTED_BUILD||'0.19';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  headless:true,
  executablePath:chrome,
  protocolTimeout:30000,
  args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
});

const fail=(msg,detail='')=>{throw new Error(`${msg}${detail?` :: ${detail}`:''}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mark=s=>console.log(`QA STEP :: ${s}`);

async function openPage(label,mobile=false){
  mark(`${label}:open`);
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
    try{if(new URL(r.url()).pathname.endsWith('/favicon.ico'))return}catch{}
    errors.push(`http ${r.status()}: ${r.url()}`);
  });
  if(mobile){
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  }else await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(build=>window.NEXUS_RUNTIME_CHECK?.build===build,{timeout:12000},expectedBuild);
  const qa=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);
  if(!qa.ok)fail(`${label}:runtime QA`,JSON.stringify(qa.failed));
  mark(`${label}:ready`);
  return {page,errors};
}

async function startSolo(page,label){
  mark(`${label}:start-solo`);
  await page.evaluate(()=>document.getElementById('start')?.click());
  await page.waitForFunction(()=>eval("state==='play'&&!!g&&!!localPlayer()"),{timeout:5000});
  await page.evaluate(()=>eval("localPlayer().at=999"));
}

async function population(page){
  return page.evaluate(()=>eval(`(()=>{
    const cam=g?.cam||{x:0,y:0};
    const enemies=(g?.e||[]).filter(e=>!e.dead&&!e.boss);
    const visible=enemies.filter(e=>e.x>=cam.x-40&&e.x<=cam.x+W+40&&e.y>=cam.y-40&&e.y<=cam.y+H+40);
    return {hostiles:enemies.length,visible:visible.length,nextEnemyId:g?.nextEnemyId||0,spawn:g?.spawn,time:g?.t||0,boss:!!g?.boss,ids:enemies.map(e=>e.id).slice(0,40)};
  })()`));
}

try{
  /* Solo spawning: enemies must actually reach the viewport in a growing horde. */
  const soloPack=await openPage('solo');
  const solo=soloPack.page;
  const label=await solo.evaluate(()=>document.querySelector('.brandCorner')?.textContent||'');
  if(!label.includes(expectedBuild))fail('wrong build label',label);
  await startSolo(solo,'solo');
  mark('solo:wait-visible-horde');
  await solo.waitForFunction(()=>eval(`(()=>{
    const c=g.cam||{x:0,y:0};
    const es=g.e.filter(e=>!e.dead&&!e.boss);
    const v=es.filter(e=>e.x>=c.x-40&&e.x<=c.x+W+40&&e.y>=c.y-40&&e.y<=c.y+H+40).length;
    return es.length>=6&&v>=2&&g.nextEnemyId>=7;
  })()`),{timeout:9000});
  const soloPop=await population(solo);
  if(soloPop.hostiles<6||soloPop.visible<2||soloPop.nextEnemyId<7)fail('solo horde failed',JSON.stringify(soloPop));
  if(soloPack.errors.length)fail('solo browser errors',soloPack.errors.join(' | '));
  mark(`solo:PASS total=${soloPop.hostiles} visible=${soloPop.visible} t=${soloPop.time.toFixed(2)}`);
  await solo.close();

  /* Real PeerJS two-player room. */
  const hostPack=await openPage('multi-host');
  const clientPack=await openPage('multi-client');
  const host=hostPack.page,client=clientPack.page;

  mark('multi:create-room');
  await host.evaluate(()=>eval("netSetMode('host')"));
  await host.waitForFunction(()=>eval("NET.mode==='host'&&NET.ready&&NET.roomCode.length===6"),{timeout:18000});
  const room=await host.evaluate(()=>eval('NET.roomCode'));
  if(!room||room.length!==6)fail('room creation failed',String(room));
  mark(`multi:room=${room}`);

  mark('multi:join-room');
  await client.evaluate(code=>eval(`netSetMode('client');netJoin(${JSON.stringify(code)})`),room);
  await host.waitForFunction(()=>eval("Object.keys(NET.lobby).length===2"),{timeout:18000});
  await client.waitForFunction(()=>eval("NET.mode==='client'&&NET.ready&&NET.localId==='p2'&&Object.keys(NET.lobby).length===2"),{timeout:18000});
  mark('multi:lobby-2p-ready');

  mark('multi:start-run');
  await host.evaluate(()=>eval('startRun()'));
  await host.waitForFunction(()=>eval("state==='play'&&!!g&&Object.keys(g.players).length===2"),{timeout:6000});
  await client.waitForFunction(()=>eval("state==='play'&&!!g&&Object.keys(g.players).length===2"),{timeout:10000});
  await host.evaluate(()=>eval("Object.values(g.players).forEach(p=>p.at=999)"));

  mark('multi:wait-enemy-sync');
  await host.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=7&&g.nextEnemyId>=8"),{timeout:10000});
  await client.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=5"),{timeout:10000});
  await sleep(500);
  const hostPop=await population(host),clientPop=await population(client);
  const overlap=hostPop.ids.filter(id=>clientPop.ids.includes(id)).length;
  if(hostPop.hostiles<7||clientPop.hostiles<5||overlap<5)fail('enemy snapshot sync failed',JSON.stringify({hostPop,clientPop,overlap}));
  mark(`multi:enemy-sync PASS host=${hostPop.hostiles} client=${clientPop.hostiles} overlap=${overlap}`);

  /* Every participant must receive a boss reward, and the client must see its own reward modal. */
  mark('multi:boss-reward-all-players');
  await host.evaluate(()=>eval(`(()=>{
    g.e=[];g.boss=false;g.stage=0;
    for(const p of Object.values(g.players)){p.skills={W01:1};p.advSkills={};p.pendingLevel=false;}
    netSnapshotBroadcast(makeNetState());
  })()`));
  await client.waitForFunction(()=>eval("localPlayer()?.skills?.W01===1"),{timeout:4000});
  await host.evaluate(()=>eval('openChest()'));
  await host.waitForFunction(()=>eval("state==='chest'&&g._v19ChestGranted?.stage===0&&g.players.p1.skills.W01===2&&g.players.p2.skills.W01===2"),{timeout:4000});
  await client.waitForFunction(()=>eval("state==='chest'&&localPlayer()?.skills?.W01===2&&!document.getElementById('chestModal').classList.contains('hidden')"),{timeout:5000});
  const rewardState=await Promise.all([
    host.evaluate(()=>eval("({p1:g.players.p1.skills.W01,p2:g.players.p2.skills.W01,rewards:Object.keys(g._v19ChestGranted.rewards).sort()})")),
    client.evaluate(()=>eval("({p2:localPlayer().skills.W01,state,shown:!document.getElementById('chestModal').classList.contains('hidden'),text:document.getElementById('reward').textContent})"))
  ]);
  if(rewardState[0].p1!==2||rewardState[0].p2!==2||rewardState[0].rewards.join(',')!=='p1,p2'||rewardState[1].p2!==2||!rewardState[1].shown)fail('party boss rewards failed',JSON.stringify(rewardState));
  mark('multi:boss-reward PASS p1=2 p2=2 client-modal=true');

  /* Host alone advances the stage; the client cannot run host reward logic. */
  await host.evaluate(()=>document.getElementById('rewardBtn').click());
  await host.waitForFunction(()=>eval("state==='play'&&g.stage===1"),{timeout:4000});
  await client.waitForFunction(()=>eval("state==='play'&&g.stage===1&&document.getElementById('chestModal').classList.contains('hidden')"),{timeout:6000});

  /* Dash cooldown must be based on authoritative host time on both peers. */
  mark('multi:dash-clock-sync');
  await client.keyboard.press('Space');
  await host.waitForFunction(()=>eval("(g.players.p2.dashReadyAt||0)>g.t+1"),{timeout:4000});
  await sleep(350);
  const dashA=await Promise.all([
    host.evaluate(()=>eval("({t:g.t,ready:g.players.p2.dashReadyAt,remain:Math.max(0,g.players.p2.dashReadyAt-g.t)})")),
    client.evaluate(()=>eval("({t:g.t,ready:localPlayer().dashReadyAt,remain:Math.max(0,(localPlayer().dashReadyAt||0)-g.t)})"))
  ]);
  if(Math.abs(dashA[0].remain-dashA[1].remain)>.30)fail('dash cooldown clocks diverged',JSON.stringify(dashA));
  await sleep(700);
  const dashB=await Promise.all([
    host.evaluate(()=>eval("Math.max(0,g.players.p2.dashReadyAt-g.t)")),
    client.evaluate(()=>eval("Math.max(0,(localPlayer().dashReadyAt||0)-g.t)"))
  ]);
  if(Math.abs(dashB[0]-dashB[1])>.30||dashB[0]>=dashA[0].remain-.35||dashB[1]>=dashA[1].remain-.35)fail('dash cooldown did not count down consistently',JSON.stringify({dashA,dashB}));
  await sleep(1800);
  await host.waitForFunction(()=>eval("(g.players.p2.dashReadyAt||0)<=g.t+.08"),{timeout:3000});
  await client.waitForFunction(()=>eval("(localPlayer().dashReadyAt||0)<=g.t+.15"),{timeout:3000});
  mark(`multi:dash-sync PASS initial=${dashA[0].remain.toFixed(2)}/${dashA[1].remain.toFixed(2)} later=${dashB[0].toFixed(2)}/${dashB[1].toFixed(2)}`);

  mark('multi:client-input');
  const beforeMove=await host.evaluate(()=>eval('g.players.p2.x'));
  await client.keyboard.down('d');
  await sleep(750);
  await client.keyboard.up('d');
  await host.waitForFunction(x=>eval('g.players.p2.x')>x+15,{timeout:5000},beforeMove);
  const afterMove=await host.evaluate(()=>eval('g.players.p2.x'));
  if(afterMove<=beforeMove+15)fail('remote input not authoritative',`${beforeMove} -> ${afterMove}`);
  const stages=await Promise.all([host.evaluate(()=>eval('g.stage')),client.evaluate(()=>eval('g.stage'))]);
  if(stages[0]!==stages[1])fail('stage desync',stages.join('/'));
  if(hostPack.errors.length)fail('host browser errors',hostPack.errors.join(' | '));
  if(clientPack.errors.length)fail('client browser errors',clientPack.errors.join(' | '));
  mark(`multi:input PASS p2=${beforeMove.toFixed(1)}->${afterMove.toFixed(1)}`);
  await client.evaluate(()=>eval('netClose()')).catch(()=>{});
  await host.evaluate(()=>eval('netClose()')).catch(()=>{});
  await client.close();await host.close();

  /* Mobile portrait also needs growing population and controls. */
  const mobilePack=await openPage('mobile',true);
  const mobile=mobilePack.page;
  await startSolo(mobile,'mobile');
  mark('mobile:wait-controls-and-spawn');
  await mobile.waitForFunction(()=>{
    const j=document.getElementById('joystick'),r=j?.getBoundingClientRect();
    return !!j&&r.width>0&&r.height>0;
  },{timeout:5000});
  await mobile.waitForFunction(()=>eval("g.e.filter(e=>!e.dead&&!e.boss).length>=4"),{timeout:8000});
  const mobileState=await mobile.evaluate(()=>{
    const j=document.getElementById('joystick'),d=document.getElementById('raidDashBtn'),r=j?.getBoundingClientRect();
    return {mobile:document.documentElement.classList.contains('mobile-build'),joystick:!!j&&r.width>0&&r.height>0,dash:!!d,orientation:document.querySelector('meta[name="screen-orientation"]')?.content,hostiles:g.e.filter(e=>!e.dead&&!e.boss).length};
  });
  if(!mobileState.mobile||!mobileState.joystick||!mobileState.dash||mobileState.orientation!=='portrait'||mobileState.hostiles<4)fail('mobile spawn/control failed',JSON.stringify(mobileState));
  if(mobilePack.errors.length)fail('mobile browser errors',mobilePack.errors.join(' | '));
  mark(`mobile:PASS hostiles=${mobileState.hostiles}`);
  await mobile.close();

  console.log(`PASS browser:build-${expectedBuild} :: ${base}`);
  console.log(`PASS browser:solo-visible-horde :: total ${soloPop.hostiles}, visible ${soloPop.visible}`);
  console.log(`PASS browser:peerjs-2p-enemy-sync :: host ${hostPop.hostiles}, client ${clientPop.hostiles}, overlap ${overlap}`);
  console.log('PASS browser:peerjs-2p-party-boss-rewards');
  console.log('PASS browser:peerjs-2p-dash-clock-sync');
  console.log(`PASS browser:peerjs-2p-input :: ${beforeMove.toFixed(1)} -> ${afterMove.toFixed(1)}`);
  console.log(`PASS browser:mobile-spawn :: ${mobileState.hostiles}`);
  console.log('7/7 focused browser checks passed');
} finally {
  await browser.close().catch(()=>{});
}
