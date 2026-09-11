import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.30';
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
 const flags=await page.evaluate(()=>window.NEXUS_NETWORK_V30);
 if(!flags?.compactSnapshots||!flags.interestManagement||!flags.latestStateWins||!flags.clientExtrapolation||!flags.separateVisualStream||flags.maxPlayers!==5)fail('v30 flags',JSON.stringify(flags));
 console.log('PASS v30:compact-netcode-flags',JSON.stringify(flags));

 const payload=await page.evaluate(()=>{
  netClose();NET.mode='host';NET.localId='p1';NET.lobby={
   p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'P2'},p3:{id:'p3',cls:'archer',name:'P3'},p4:{id:'p4',cls:'rogue',name:'P4'},p5:{id:'p5',cls:'gunslinger',name:'P5'}
  };
  g=createRunFromLobby();state='play';
  for(let i=0;i<115;i++)spawn(false);
  const s=makeNetState(),direct={playerId:'p2',transport:'p2p'},relay={playerId:'p3',transport:'webrelay',peer:'ws:qa'};
  const a=window.NEXUS_PACK_FAST30(s,direct),b=window.NEXUS_PACK_FAST30(s,relay),full=JSON.stringify({t:'snap',state:s}).length,compact=JSON.stringify(a).length,relayBytes=JSON.stringify(b).length;
  return {full,compact,relayBytes,ratio:compact/full,directEnemies:a.e.length,relayEnemies:b.e.length,total:s.e.length};
 });
 if(payload.total<180||payload.directEnemies>120||payload.relayEnemies>72||payload.ratio>=.68||payload.compact>=payload.full)fail('payload compaction',JSON.stringify(payload));
 console.log('PASS v30:payload-compaction',JSON.stringify(payload));

 const five=await page.evaluate(()=>{
  const sent={};NET.mode='host';NET.conns=new Map();
  for(const id of ['p2','p3','p4','p5']){sent[id]=[];const c={playerId:id,peer:'qa-'+id,transport:'p2p',open:true,dataChannel:{bufferedAmount:0},send(m){sent[id].push(m)}};NET.conns.set(c.peer,c)}
  const s=makeNetState();netBroadcast({t:'snap',state:s});
  return Object.fromEntries(Object.entries(sent).map(([id,a])=>[id,{fast:a.filter(x=>x.t==='v30f').length,visual:a.filter(x=>x.t==='v30v').length,legacy:a.filter(x=>x.t==='snap').length,bytes:a.reduce((n,x)=>n+JSON.stringify(x).length,0)}]));
 });
 for(const [id,v] of Object.entries(five))if(v.fast!==1||v.legacy!==0||v.bytes>45000)fail('5p compact fanout '+id,JSON.stringify(five));
 console.log('PASS v30:5p-compact-fanout',JSON.stringify(five));

 const backpressure=await page.evaluate(()=>{
  let sent=0;const c={playerId:'p2',peer:'qa-buffer',transport:'p2p',open:true,dataChannel:{bufferedAmount:500000},send(){sent++}};NET.mode='host';NET.conns=new Map([[c.peer,c]]);const s=makeNetState();
  const before=window.NEXUS_NETWORK_V30.stats.bufferDrops;netBroadcast({t:'snap',state:s});const blocked=sent;c.dataChannel.bufferedAmount=0;netBroadcast({t:'snap',state:s});return{blocked,after:sent,drops:window.NEXUS_NETWORK_V30.stats.bufferDrops-before};
 });
 if(backpressure.blocked!==0||backpressure.after<1||backpressure.drops<1)fail('backpressure',JSON.stringify(backpressure));
 console.log('PASS v30:backpressure',JSON.stringify(backpressure));

 const client=await page.evaluate(()=>{
  const hostLobby={p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'P2'}};netClose();NET.mode='host';NET.localId='p1';NET.lobby=hostLobby;g=createRunFromLobby();state='play';for(let i=0;i<25;i++)spawn(false);const s=makeNetState();const packet=window.NEXUS_PACK_FAST30(s,{playerId:'p2',transport:'p2p'});
  netClose();NET.mode='client';NET.localId='p2';NET.lobby=hostLobby;g=createRunFromLobby();state='play';window.NEXUS_APPLY_FAST30(packet);const e=g.e[0];if(e){e._netBaseX30=e.tx;e._netBaseY30=e.ty;e._netVx30=180;e._netVy30=0;e._netRx30=performance.now()-120}const before=e?.tx||0;updateClient(.016);return{enemyCount:g.e.length,total:g._netTotalEnemies30,before,after:e?.tx||0,stage:g.stage,state};
 });
 if(client.enemyCount<1||client.total<client.enemyCount||client.after<=client.before||client.state!=='play')fail('client extrapolation/apply',JSON.stringify(client));
 console.log('PASS v30:client-extrapolation',JSON.stringify(client));

 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('5/5 build 0.30 4-5P bandwidth/smoothing checks passed');
}finally{await browser.close()}
