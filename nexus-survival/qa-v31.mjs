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
 await page.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b,{timeout:15000},expected);
 const runtime=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!runtime.ok)fail('runtime',JSON.stringify(runtime.failed));
 const r=await page.evaluate(()=>eval(`(()=>{
  function fake(peer,buffer=0){const ev={},sent=[];return {peer,open:true,playerId:null,clientKey:null,dataChannel:{bufferedAmount:buffer},sent,on:(n,f)=>ev[n]=f,send:m=>sent.push(JSON.parse(JSON.stringify(m))),close(){this.open=false},ev}}
  netClose();NET.mode='host';NET.localId='p1';NET.roomCode='QA31';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'}};NET.conns.clear();NET.inputs={};
  const cs=['qa2','qa3','qa4','qa5'].map(x=>fake(x));cs.forEach((c,i)=>{netAccept(c);netHostMessage(c,{t:'join',cls:'warrior',clientKey:'client-'+(i+2),transport:'p2p'})});
  diff='NORMAL';cls='warrior';g=createRunFromLobby();state='play';g.localId='p1';NET.localId='p1';Object.values(g.players).forEach(p=>p.at=999);
  g.e=Array.from({length:220},(_,i)=>({id:i+1,x:1300+Math.cos(i)*((i%30)*22),y:900+Math.sin(i)*((i%25)*20),r:18,hp:80,max:80,type:i%5,boss:i===0,anim:i*.1,grade:['common','uncommon','rare','epic','legendary'][i%5],variantRole:['swift','brute','hunter'][i%3],visualVariant:i%4,bossTier:i===0?'major':'normal',elite:i%7===0}));
  g.q=Array.from({length:180},(_,i)=>({x:1200+i%40*8,y:820+i%30*6,vx:200,vy:0,life:1,col:'#fff',size:4,source:'qa',ownerId:'p1',skill:'basic'}));
  g.gem=Array.from({length:220},(_,i)=>({x:1250+i%50*5,y:850+i%35*5,v:1,spin:.2}));
  g.zones=Array.from({length:30},(_,i)=>({type:'qa',x:1200+i*8,y:850+i*4,r:55,life:2,max:3,col:'#fff'}));
  for(let i=0;i<8;i++){g.t=i*.125;netSnapshotBroadcast(makeNetState())}
  const per=cs.map(c=>({fast:c.sent.filter(m=>m.t==='v31s'),visual:c.sent.filter(m=>m.t==='v31v'),legacy:c.sent.filter(m=>m.t==='snap')}));
  const fastCounts=per.map(x=>x.fast.length),visualCounts=per.map(x=>x.visual.length),maxFast=Math.max(...per.flatMap(x=>x.fast.map(m=>JSON.stringify(m).length))),maxVisual=Math.max(...per.flatMap(x=>x.visual.map(m=>JSON.stringify(m).length))),enemyMax=Math.max(...per.flatMap(x=>x.fast.map(m=>m.e.length))),legacy=per.reduce((a,x)=>a+x.legacy.length,0);
  const packet=per[0].fast.at(-1);NET.mode='client';NET.localId='p2';g.localId='p2';state='partyLevel';netClientMessage(packet);const recovered=state==='play'&&g.e.length>0&&g.stage===packet.st;
  NET.mode='host';const before=cs[0].sent.length;cs[0].dataChannel.bufferedAmount=400000;g.t+=.125;netSnapshotBroadcast(makeNetState());const backpressure=cs[0].sent.length===before;
  netClose();const cleaned=NET.conns.size===0&&!NET.hostConn&&!NET.peer;
  return {ids:cs.map(c=>c.playerId),fastCounts,visualCounts,maxFast,maxVisual,enemyMax,legacy,recovered,backpressure,cleaned,flags:window.NEXUS_NETWORK_V31};
 })()`));
 if(r.ids.join(',')!=='p2,p3,p4,p5')fail('5P slot assignment',JSON.stringify(r));
 if(r.fastCounts.some(n=>n<7)||r.visualCounts.some(n=>n<3)||r.legacy!==0)fail('snapshot cadence/split',JSON.stringify(r));
 if(r.enemyMax>108||r.maxFast>50000||r.maxVisual>30000)fail('payload budget',JSON.stringify(r));
 if(!r.recovered)fail('client phase recovery',JSON.stringify(r));
 if(!r.backpressure)fail('buffer backpressure',JSON.stringify(r));
 if(!r.cleaned)fail('session cleanup',JSON.stringify(r));
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('PASS v31:5P transport',JSON.stringify({fast:r.fastCounts,visual:r.visualCounts,enemyMax:r.enemyMax,maxFast:r.maxFast,maxVisual:r.maxVisual}));
 console.log('PASS v31:recovery/backpressure/session',JSON.stringify({recovered:r.recovered,backpressure:r.backpressure,cleaned:r.cleaned}));
}finally{await browser.close()}