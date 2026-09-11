import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.31';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage();await page.setViewport({width:1280,height:720});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text())});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b&&window.NEXUS_NETWORK_SMOOTH_V31,{timeout:15000},expected);
 const r=await page.evaluate(()=>eval(`(()=>{
  function fake(peer,meta=null,buffer=0){const ev={},sent=[];return {peer,open:true,metadata:meta,playerId:null,clientKey:null,dataChannel:{bufferedAmount:buffer},sent,on:(n,f)=>ev[n]=f,send:m=>sent.push(JSON.parse(JSON.stringify(m))),close(){this.open=false;ev.close?.()},ev}}
  netClose();NET.mode='host';NET.localId='p1';NET.roomCode='SMOOTH';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'}};NET.conns.clear();NET.inputs={};
  const controls=['c2','c3','c4','c5'].map(x=>fake(x));controls.forEach((c,i)=>{netAccept(c);netHostMessage(c,{t:'join',cls:'warrior',clientKey:'smooth-'+(i+2),transport:'p2p'})});
  const states=['p2','p3','p4','p5'].map(pid=>fake('state-'+pid,{nexusChannel:'state31smooth',pid,room:'SMOOTH'}));states.forEach(netAccept);
  diff='NORMAL';cls='warrior';g=createRunFromLobby();state='play';g.localId='p1';NET.localId='p1';Object.values(g.players).forEach(p=>p.at=999);
  g.e=Array.from({length:240},(_,i)=>({id:i+1,x:1300+Math.cos(i*.31)*(120+i%22*24),y:900+Math.sin(i*.29)*(90+i%19*22),r:18,hp:80,max:80,type:i%5,boss:i===0,anim:i*.1,grade:['common','uncommon','rare','epic','legendary'][i%5],variantRole:['swift','brute','hunter'][i%3],visualVariant:i%4,bossTier:i===0?'major':'normal',elite:i%7===0}));
  g.q=Array.from({length:180},(_,i)=>({x:1200+i%40*8,y:820+i%30*6,vx:200,vy:0,life:1,col:'#fff',size:4,source:'qa',ownerId:'p1',skill:'basic'}));
  g.gem=Array.from({length:220},(_,i)=>({x:1250+i%50*5,y:850+i%35*5,v:1,spin:.2}));
  g.zones=Array.from({length:30},(_,i)=>({type:'qa',x:1200+i*8,y:850+i*4,r:55,life:2,max:3,col:'#fff'}));
  for(let i=0;i<10;i++){g.t=i*.125;netSnapshotBroadcast(makeNetState())}
  const stateFast=states.map(c=>c.sent.filter(m=>m.t==='v31s').length),stateVisual=states.map(c=>c.sent.filter(m=>m.t==='v31v').length);
  const controlSnapshots=controls.map(c=>c.sent.filter(m=>m.t==='v31s'||m.t==='v31v'||m.t==='snap').length);
  const maxEnemies=Math.max(...states.flatMap(c=>c.sent.filter(m=>m.t==='v31s').map(m=>m.e.length)));
  const maxFast=Math.max(...states.flatMap(c=>c.sent.filter(m=>m.t==='v31s').map(m=>JSON.stringify(m).length)));
  const maxVisual=Math.max(...states.flatMap(c=>c.sent.filter(m=>m.t==='v31v').map(m=>JSON.stringify(m).length)));
  const before=states[0].sent.length;states[0].dataChannel.bufferedAmount=100000;g.t+=.125;netSnapshotBroadcast(makeNetState());const dropped=states[0].sent.length===before;states[0].dataChannel.bufferedAmount=0;
  states[0].close();g.t+=.125;const ctrlBefore=controls[0].sent.length;netSnapshotBroadcast(makeNetState());const fallback=controls[0].sent.length>ctrlBefore;
  const flags=window.NEXUS_NETWORK_SMOOTH_V31;
  return {stateFast,stateVisual,controlSnapshots,maxEnemies,maxFast,maxVisual,dropped,fallback,flags};
 })()`));
 if(r.stateFast.some(n=>n<9))fail('best-effort state cadence',JSON.stringify(r));
 if(r.stateVisual.some(n=>n<3))fail('separate visual cadence',JSON.stringify(r));
 if(r.controlSnapshots.some(n=>n!==0))fail('head-of-line isolation',JSON.stringify(r));
 if(r.maxEnemies>96||r.maxFast>40000||r.maxVisual>24000)fail('4-5P payload budget',JSON.stringify(r));
 if(!r.dropped)fail('state backpressure',JSON.stringify(r));
 if(!r.fallback)fail('reliable fallback when state lane closes',JSON.stringify(r));
 if(!r.flags?.dualP2PChannels||!r.flags?.bestEffortState||!r.flags?.reliableControl)fail('smooth flags',JSON.stringify(r.flags));
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('PASS smooth31: dual-lane 5P transport',JSON.stringify({fast:r.stateFast,visual:r.stateVisual,maxEnemies:r.maxEnemies,maxFast:r.maxFast,maxVisual:r.maxVisual}));
 console.log('PASS smooth31: HOL isolation/backpressure/fallback',JSON.stringify({dropped:r.dropped,fallback:r.fallback}));
}finally{await browser.close()}
