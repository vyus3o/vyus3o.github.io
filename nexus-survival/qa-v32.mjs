import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.32';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)};
async function page(label){const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text())});await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b,{timeout:15000},expected);await p.waitForFunction(()=>window.NEXUS_PIXEL_V32?.ready===true,{timeout:15000});return{p,errors,label}}
try{
 const hp=await page('host'),host=hp.p;
 const setup=await host.evaluate(()=>eval(`(()=>{
  function fake(peer){const ev={},sent=[];return{peer,open:true,playerId:null,clientKey:null,dataChannel:{bufferedAmount:0},sent,on:(n,f)=>ev[n]=f,send:m=>sent.push(JSON.parse(JSON.stringify(m))),close(){this.open=false},ev}}
  netClose();NET.mode='host';NET.localId='p1';NET.roomCode='QA32';NET.ready=true;NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST',connected:true}};NET.conns.clear();NET.inputs={};diff='NORMAL';cls='warrior';
  const cs=['qa2','qa3','qa4'].map(x=>fake(x));cs.forEach((c,i)=>{netAccept(c);netHostMessage(c,{t:'join',cls:'warrior',clientKey:'v32-client-'+(i+2),transport:'p2p'})});
  g=createRunFromLobby();g.localId='p1';state='play';Object.values(g.players).forEach(p=>{p.at=999;p.xp=0;p.pendingLevel=false});
  for(const id of ['p1','p2','p3','p4'])requestLevel(g.players[id]);
  const rounds=cs[0].sent.filter(m=>m.t==='v32LevelRound');const round=rounds.at(-1);return{round,lobby:NET.lobby,ids:cs.map(c=>c.playerId),roundCount:rounds.length,offers:cs.map(c=>c.sent.filter(m=>m.t==='v32LevelOffer').length)};
 })()`));
 if(!setup.round||setup.ids.join(',')!=='p2,p3,p4')fail('host 4P level round setup',JSON.stringify(setup));
 if(!['p1','p2','p3','p4'].every(id=>setup.round.pending.includes(id)&&Array.isArray(setup.round.choices[id])&&setup.round.choices[id].length))fail('round lacks per-player choices',JSON.stringify(setup.round));
 if(setup.roundCount<3)fail('round was not repeatedly broadcast during requests',String(setup.roundCount));

 const clients=[];for(const id of ['p2','p3','p4']){const pack=await page(id);clients.push(pack);await pack.p.evaluate(({id,lobby})=>{eval(`netClose();NET.mode='client';NET.localId='${id}';NET.ready=true;NET.roomCode='QA32';NET.transport='P2P'`);NET.lobby=lobby;eval(`g=createRunFromLobby();g.localId='${id}';state='play'`);window.__v32out=[];NET.hostConn={open:true,send:m=>window.__v32out.push(JSON.parse(JSON.stringify(m)))}},{id,lobby:setup.lobby})}

 for(const pack of clients.slice(0,2)){
  await pack.p.evaluate(r=>netClientMessage(r),setup.round);
  const ui=await pack.p.evaluate(()=>({state:eval('state'),pending:eval('localPlayer().pendingLevel'),hidden:document.getElementById('levelModal').classList.contains('hidden'),choices:document.querySelectorAll('#choices .choice').length,text:document.getElementById('choices').textContent}));
  if(ui.state!=='partyLevel'||!ui.pending||ui.hidden||ui.choices<1)fail(`${pack.label} lost-offer recovery failed`,JSON.stringify(ui));
 }

 const p4=clients[2].p,missing=JSON.parse(JSON.stringify(setup.round));delete missing.choices.p4;
 await p4.evaluate(r=>netClientMessage(r),missing);
 const miss=await p4.evaluate(()=>({text:document.getElementById('choices').textContent,out:window.__v32out.slice()}));
 if(!miss.text.includes('LEVEL DATA SYNC')||!miss.out.some(m=>m.t==='v32LevelSyncReq'))fail('missing choice did not request resync',JSON.stringify(miss));
 await p4.evaluate(r=>netClientMessage(r),setup.round);
 const repaired=await p4.evaluate(()=>({choices:document.querySelectorAll('#choices .choice').length,hidden:document.getElementById('levelModal').classList.contains('hidden'),pending:eval('localPlayer().pendingLevel')}));
 if(repaired.choices<1||repaired.hidden||!repaired.pending)fail('p4 repeated round did not repair UI',JSON.stringify(repaired));

 for(let i=0;i<clients.length;i++){
  const cp=clients[i].p;await cp.evaluate(()=>{window.__v32out=[];document.querySelector('#choices .choice')?.click()});
  const msg=await cp.evaluate(()=>window.__v32out.find(m=>m.t==='choice'));
  if(!msg)fail(`${clients[i].label} did not submit choice`);
  await host.evaluate(({peer,msg})=>{const c=NET.conns.get(peer);netHostMessage(c,msg)},{peer:'qa'+(i+2),msg});
 }
 const beforeHost=await host.evaluate(()=>({state:eval('state'),pending:Object.values(g.players).filter(p=>p.pendingLevel).map(p=>p.id),round:window.NEXUS_PARTY_SYNC_V32.hostRound?.id||null}));
 if(beforeHost.state!=='partyLevel'||beforeHost.pending.join(',')!=='p1'||!beforeHost.round)fail('host resumed before last player',JSON.stringify(beforeHost));
 await host.evaluate(()=>document.querySelector('#choices .choice')?.click());
 await host.waitForFunction(()=>eval("state==='play'&&!window.NEXUS_PARTY_SYNC_V32.hostRound"),{timeout:3000});
 const resumes=await host.evaluate(()=>[...NET.conns.values()].map(c=>c.sent.filter(m=>m.t==='v32LevelResume').at(-1)||null));
 if(resumes.some(x=>!x))fail('resume not broadcast to all clients',JSON.stringify(resumes));
 for(let i=0;i<clients.length;i++){await clients[i].p.evaluate(r=>netClientMessage(r),resumes[i]);const ok=await clients[i].p.evaluate(()=>eval("state==='play'&&document.getElementById('levelModal').classList.contains('hidden')&&!localPlayer().pendingLevel"));if(!ok)fail(`${clients[i].label} did not resume`)}

 const pixels=await host.evaluate(()=>eval(`(()=>{
  const marker=window.NEXUS_PIXEL_V32,preview=document.querySelectorAll('.pixelClassPreview32').length,p=g.players.p1;
  let draws=0;const real=ctx.drawImage.bind(ctx);ctx.drawImage=(...a)=>{draws++;return real(...a)};
  drawPlayer(p,true);
  g.cam.x=Math.max(0,Math.min(WORLD.w-W,p.x-W/2));g.cam.y=Math.max(0,Math.min(WORLD.h-H,p.y-H/2));
  const cam={x:g.cam.x,y:g.cam.y};
  const samples=[
   {e:{id:990,x:p.x+80,y:p.y,r:18,hp:10,max:10,type:0,grade:'common',variantRole:'hunter',anim:0},w:90,h:110},
   {e:{id:991,x:p.x+150,y:p.y,r:42,hp:100,max:100,type:0,boss:true,bossTier:'mid',anim:0},w:150,h:150}
  ];
  let enemyChanged=0;
  for(const s of samples){
   const screenX=s.e.x-cam.x,screenY=s.e.y-cam.y;
   const x=Math.max(0,Math.floor(screenX-s.w/2)),y=Math.max(0,Math.floor(screenY-s.h+24));
   const w=Math.max(1,Math.min(c.width-x,Math.floor(s.w))),h=Math.max(1,Math.min(c.height-y,Math.floor(s.h)));
   const before=ctx.getImageData(x,y,w,h).data;
   ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.translate(-cam.x,-cam.y);drawEnemy(s.e);ctx.restore();
   const after=ctx.getImageData(x,y,w,h).data;
   for(let i=0;i<after.length;i+=4){if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3])enemyChanged++}
  }
  ctx.drawImage=real;
  return{marker,preview,draws,enemyChanged,cam};
 })()`));
 if(!pixels.marker?.ready||pixels.marker.baseClasses!==7||pixels.marker.advancedClasses!==14||pixels.marker.bosses!==3||pixels.preview<7||pixels.draws<1||pixels.enemyChanged<20)fail('pixel/monster visibility not applied',JSON.stringify(pixels));
 const all=[hp,...clients];for(const x of all)if(x.errors.length)fail(`${x.label} browser errors`,x.errors.join(' | '));
 console.log('PASS v32: 4P level round survives missing one-off offers and resyncs missing choices');
 console.log('PASS v32: waits for all 4 players then resumes all clients');
 console.log('PASS v32: pixel classes + visible monster rendering',JSON.stringify({classPreviews:pixels.preview,drawCalls:pixels.draws,enemyChanged:pixels.enemyChanged,validEnemySprites:pixels.marker.validEnemySprites,enemyFallback:pixels.marker.enemyFallback,atlas:pixels.marker.atlas}));
}finally{await browser.close()}