import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.29';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage();
await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('console: '+m.text())});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b,{timeout:15000},expected);
 const runtime=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!runtime.ok)fail('runtime',JSON.stringify(runtime.failed));
 const flags=await page.evaluate(()=>({network:window.NEXUS_NETWORK_V29,stability:window.NEXUS_STABILITY_V29,sync:window.NEXUS_SYNC_STABILITY29}));
 if(!flags.network?.p2pPrimary||!flags.network?.webRelayFallback||flags.network.webRelayBrokers<2||flags.network.stunUrls<3||flags.network.maxPlayers!==5||flags.network.joinAttempts<5)fail('network flags',JSON.stringify(flags.network));
 if(!flags.stability?.singleChoice||!flags.stability?.nexusLock||!flags.stability?.duplicateChoiceGuard||!flags.stability?.disconnectPauseRecovery||!flags.stability?.multiReplayCleanup)fail('stability flags',JSON.stringify(flags.stability));
 if(!flags.sync?.resumeEpoch||!flags.sync?.stageEpoch||!flags.sync?.controlReplay||!flags.sync?.snapshotBackpressure||!flags.sync?.fullSyncProbe||!flags.sync?.staleStateRecovery)fail('sync recovery flags',JSON.stringify(flags.sync));
 console.log('PASS v29:network-stability-sync-flags',JSON.stringify(flags));

 let relay=await page.evaluate(()=>window.NEXUS_TEST_WS_RELAY29(12000));
 if(!relay?.ok)relay=await page.evaluate(()=>window.NEXUS_TEST_WS_RELAY29(12000));
 if(!relay?.ok)fail('websocket relay roundtrip',JSON.stringify(relay));
 console.log('PASS v29:websocket-relay-roundtrip',JSON.stringify(relay));

 const nexus=await page.evaluate(()=>{
  netSetMode('solo');g=createRunFromLobby();state='play';
  const p=localPlayer();p.pendingLevel=true;p.l=Math.max(2,p.l||1);g.n.core=0;g.n.next=999999;
  showLevelChoices(p,makeChoices(p));
  const b=document.getElementById('nexusBtn');b.onclick?.({type:'click'});b.onclick?.({type:'click'});
  return {core:g.n.core,pending:p.pendingLevel,locked:document.getElementById('levelModal').dataset.choiceLocked,disabled:b.disabled};
 });
 if(nexus.core!==100||nexus.pending!==false||nexus.locked!=='1'||!nexus.disabled)fail('nexus single choice',JSON.stringify(nexus));
 console.log('PASS v29:nexus-single-choice',JSON.stringify(nexus));

 const remote=await page.evaluate(()=>{
  netClose();NET.mode='host';NET.localId='p1';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'PLAYER 2'}};
  g=createRunFromLobby();state='partyLevel';g.n.core=0;g.n.next=999999;
  const p=g.players.p2;p.pendingLevel=true;p.l=7;
  const conn={playerId:'p2',peer:'qa-p2',open:true,send(){}};
  const msg={t:'choice',choice:{type:'nexus'},choiceToken:'qa-level-7'};
  netHostMessage(conn,msg);netHostMessage(conn,msg);
  return {core:g.n.core,pending:p.pendingLevel,state};
 });
 if(remote.core!==100||remote.pending!==false||remote.state!=='play')fail('duplicate remote choice guard',JSON.stringify(remote));
 console.log('PASS v29:duplicate-remote-choice',JSON.stringify(remote));

 const deadlock=await page.evaluate(()=>{
  netClose();NET.mode='host';NET.localId='p1';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'PLAYER 2'}};
  g=createRunFromLobby();state='partyLevel';g.players.p2.pendingLevel=true;delete NET.lobby.p2;
  const resumed=window.NEXUS_RECONCILE_PARTY29('qa-disconnect');
  return {resumed,state,hasP2:!!g.players.p2,p1Pending:!!g.players.p1.pendingLevel};
 });
 if(!deadlock.resumed||deadlock.state!=='play'||deadlock.hasP2)fail('pause disconnect recovery',JSON.stringify(deadlock));
 console.log('PASS v29:pause-deadlock-recovery',JSON.stringify(deadlock));

 /* Reproduce the reported bug: client remains in chest while host advanced. */
 const stageRecovery=await page.evaluate(()=>{
  netClose();NET.mode='host';NET.localId='p1';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'}};
  g=createRunFromLobby();state='play';const before=g.stage;
  advanceStage();const snap=makeNetState(),authoritativeStage=snap.stage,meta=snap.sync29;
  g.stage=before;state='chest';document.getElementById('chestModal').classList.remove('hidden');NET.mode='client';NET.localId='p1';
  netClientMessage({t:'snap',state:snap});
  return {state,stage:g.stage,authoritativeStage,chestHidden:document.getElementById('chestModal').classList.contains('hidden'),meta,stats:{...window.NEXUS_SYNC_STABILITY29.stats}};
 });
 if(stageRecovery.state!=='play'||stageRecovery.stage!==stageRecovery.authoritativeStage||!stageRecovery.chestHidden||!(stageRecovery.stats.recoveries>=1))fail('missed resume stage recovery',JSON.stringify(stageRecovery));
 console.log('PASS v29:missed-resume-stage-recovery',JSON.stringify(stageRecovery));

 const backpressure=await page.evaluate(async()=>{
  netClose();NET.mode='host';NET.localId='p1';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'}};g=createRunFromLobby();state='play';
  let sent=0;const relay={peer:'ws:qa',playerId:'p2',open:true,transport:'webrelay',send(){sent++}};NET.conns=new Map([['ws:qa',relay]]);
  const snap=makeNetState();netBroadcast({t:'snap',state:snap});netBroadcast({t:'snap',state:snap});
  const immediate=sent;await new Promise(r=>setTimeout(r,240));netBroadcast({t:'snap',state:makeNetState()});
  const afterGap=sent,stats={...window.NEXUS_SYNC_STABILITY29.stats};NET.conns.clear();return{immediate,afterGap,stats};
 });
 if(backpressure.immediate!==1||backpressure.afterGap!==2||backpressure.stats.snapSkippedRate<1)fail('snapshot backpressure',JSON.stringify(backpressure));
 console.log('PASS v29:snapshot-backpressure',JSON.stringify(backpressure));

 const replay=await page.evaluate(async()=>{
  const RealPeer=window.Peer,peers=[];
  class FakeConn{
   constructor(){this.open=false;this.peer='qa-host';this.handlers={};this.peerConnection={iceConnectionState:'connected',connectionState:'connected',getStats:async()=>new Map()}}
   on(k,fn){this.handlers[k]=fn;return this}
   send(msg){if(msg?.t==='join')setTimeout(()=>this.handlers.data?.({t:'welcome',id:'p2',room:'ABC123',lobby:{p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'PLAYER 2'}},diff:'NORMAL'}),0)}
   close(){this.open=false;this.handlers.close?.()}
  }
  class FakePeer{
   constructor(){this.handlers={};this.destroyed=false;peers.push(this);setTimeout(()=>this.handlers.open?.('qa-client'),0)}
   on(k,fn){this.handlers[k]=fn;return this}
   connect(){const c=new FakeConn();setTimeout(()=>{c.open=true;c.handlers.open?.()},0);return c}
   destroy(){this.destroyed=true} reconnect(){}
  }
  window.Peer=FakePeer;
  try{
   g=null;state='menu';netJoin('ABC123');await new Promise(r=>setTimeout(r,120));const first=NET.peer,firstReady=NET.localId==='p2';
   netClose();netJoin('ABC123');await new Promise(r=>setTimeout(r,120));const second=NET.peer,secondReady=NET.localId==='p2';
   const out={peerCount:peers.length,firstDestroyed:first?.destroyed===true,different:first!==second,firstReady,secondReady};
   netClose();return out;
  }finally{window.Peer=RealPeer;NET.mode='solo'}
 });
 if(replay.peerCount<2||!replay.firstDestroyed||!replay.different||!replay.firstReady||!replay.secondReady)fail('multi replay cleanup',JSON.stringify(replay));
 console.log('PASS v29:multi-replay-cleanup',JSON.stringify(replay));

 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('8/8 build 0.29 network/stability/sync checks passed');
}finally{await browser.close()}
