import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||'nexus-survival';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=f=>fs.existsSync(path.join(root,f));
const results=[];
const check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});

const required=[
  'index.html','manifest.webmanifest','game-core.js','game-multi.js','game-render.js',
  'game-elite-v9.js','game-vfx-v10.js','game-raid-v11.js','game-mobile-v12.js',
  'game-classes-v13.js','game-progression-v13.js','game-balance-fix-v13.js',
  'game-runtime-fix-v14.js','game-spawn-v18.js','game-multiplayer-v19.js','game-visual-v20.js','game-swarm-v21.js','game-power-v22.js',
  'game-verify-v16.js','game-verify-v19.js'
];
for(const f of required)check(`file:${f}`,exists(f));

const index=read('index.html');
const manifest=JSON.parse(read('manifest.webmanifest'));
const classes=read('game-classes-v13.js');
const progression=read('game-progression-v13.js');
const verify=read('game-verify-v16.js');
const verify22=read('game-verify-v19.js');
const spawnFix=read('game-spawn-v18.js');
const multiFix=read('game-multiplayer-v19.js');
const visual20=read('game-visual-v20.js');
const swarm21=read('game-swarm-v21.js');
const power22=read('game-power-v22.js');
const raid=read('game-raid-v11.js');
const mobile=read('game-mobile-v12.js');

check('build:0.22',index.includes('BUILD 0.22')&&index.includes('PROTOCOL // 22'));
check('cache:v22',/game-power-v22\.js\?v=22/.test(index)&&/game-verify-v19\.js\?v=22/.test(index));
check('verify:last-script',index.lastIndexOf('game-verify-v19.js')>index.lastIndexOf('game-power-v22.js'));
check('mobile:portrait-meta',index.includes('name="screen-orientation" content="portrait"'));
check('mobile:portrait-manifest',manifest.orientation==='portrait',`orientation=${manifest.orientation}`);
check('mobile:smooth-dash',mobile.includes('startSmoothDash')&&mobile.includes('smoothDash12'));
check('raid:telegraph-execution',raid.includes('function executeTg')&&raid.includes('raidTelegraphs'));
check('raid:legacy-disabled-by-v13',progression.includes('b.raid.cd=999'));

const ids=[...classes.matchAll(/\b(BZ|GD|RN|SN|EL|AW|SE|IQ)\d{2}\s*:/g)].map(m=>m[0].replace(/\s*:/,''));
const uniqueIds=[...new Set(ids)];
check('adv:40-skill-ids',uniqueIds.length===40,`count=${uniqueIds.length}`);
const subclasses=['berserker','guardian','ranger','sniper','elementalist','warlock','seraph','inquisitor'];
check('adv:8-classes',subclasses.every(s=>new RegExp(`\\b${s}:\\{base:`).test(classes)));
check('adv:all-have-ult',subclasses.every(s=>new RegExp(`\\b${s}:\\{[\\s\\S]{0,500}?ult:`).test(classes)));

check('progression:50-stages',progression.includes('for(let i=0;i<50;i++)')&&progression.includes('window.NEXUS_MAX_STAGE=50'));
check('progression:stage10-adv',progression.includes("if(s===10){beginAdvancement();return}"));
check('progression:stage30-awaken',progression.includes("if(s===30){beginAwakening();return}"));
check('progression:stage50-end',progression.includes("if(s===50){endGame"));
check('progression:max-fallback',progression.includes("type:'endless'")&&progression.includes('MAX BUILD BONUS'));
check('progression:R-input',progression.includes("e.code==='KeyR'")&&progression.includes("t:'v13Ult'"));
check('progression:multiplayer-resume',progression.includes("t:'v13Resume'"));
check('progression:spawn-timer-floor',progression.includes('g.nextEnemyId>beforeNextEnemyId')&&!progression.includes("if(!g.boss)g.spawn=Math.max(g.spawn,spawnFloor());"));

check('spawn:visible-edge',spawnFix.includes('randEdgeSpawn=function()')&&spawnFix.includes('halfW=W/2+mx')&&spawnFix.includes('halfH=H/2+my'));
check('spawn:watchdog',spawnFix.includes('minPopulation')&&spawnFix.includes('g.t-g._spawnWatchAt>1.25')&&spawnFix.includes('spawn(false)'));
check('multi:all-boss-rewards',multiFix.includes("NET.mode!=='host'")&&multiFix.includes("for(const [pid,r] of Object.entries(rewards))")&&multiFix.includes("t:'v19Chest'"));
check('multi:client-chest',multiFix.includes("state='chest'")&&multiFix.includes('REWARD RECEIVED // 방장 대기'));
check('multi:no-double-reward',multiFix.includes('g.pendingChestRewards={}'));
check('multi:dash-host-clock',multiFix.includes('d.dashReadyAt=')&&multiFix.includes('d.dashInvulUntil='));
check('multi:fix-marker',multiFix.includes("build:'0.19'")&&multiFix.includes('partyBossRewards:true')&&multiFix.includes('dashClockSync:true'));

check('visual:v20-marker',visual20.includes("build:'0.20'")&&visual20.includes('monsterSilhouettes:25')&&visual20.includes('bossSilhouettes:15'));
check('visual:5-biomes',visual20.includes('plainsEnemy')&&visual20.includes('plagueEnemy')&&visual20.includes('iceEnemy')&&visual20.includes('fireEnemy')&&visual20.includes('voidEnemy'));
check('visual:boss-variety',visual20.includes('plainsBoss')&&visual20.includes('plagueBoss')&&visual20.includes('iceBoss')&&visual20.includes('fireBoss')&&visual20.includes('voidBoss'));
check('visual:skill-vfx',visual20.includes('drawFx=function')&&visual20.includes('radialCracks')&&visual20.includes('hexShield')&&visual20.includes('burstBits'));
check('visual:zone-vfx',visual20.includes("k==='blackhole'")&&visual20.includes("k==='arrowrain'")&&visual20.includes("k==='sanctuary'"));
check('visual:ultimate-aura',visual20.includes("p.subclass==='berserker'")&&visual20.includes("p.subclass==='guardian'")&&visual20.includes("p.subclass==='elementalist'"));

check('swarm:v21-marker',swarm21.includes("build:'0.21'")&&swarm21.includes('spawnMultiplier:2'));
check('swarm:2x-batch',swarm21.includes('for(let i=0;i<2;i++')&&swarm21.includes('oldSpawn21(false)'));
check('swarm:5-grades',['common','uncommon','rare','epic','legendary'].every(x=>swarm21.includes(`${x}:{name:`)));
check('swarm:3-roles',['swift','brute','hunter'].every(x=>swarm21.includes(`${x}:{name:`)));
check('swarm:grade-xp',swarm21.includes('gradeXp=')&&swarm21.includes("g.gem[i].v=Math.max(1,Math.round"));
check('swarm:grade-colors',swarm21.includes("'#7ed36e'")&&swarm21.includes("'#62b9ff'")&&swarm21.includes("'#c47cff'")&&swarm21.includes("'#ffbd55'"));
check('swarm:network-sync',swarm21.includes('d.grade=e.grade')&&swarm21.includes('e.grade=d.grade'));
check('swarm:faster-entry',swarm21.includes('mx=26+Math.random()*42')&&swarm21.includes('my=22+Math.random()*38'));

check('power:v22-marker',power22.includes("build:'0.22'")&&power22.includes('stagePower'));
check('power:gentle-start',power22.includes('const START=1.04'));
check('power:per-stage',power22.includes('const PER_STAGE=.004'));
check('power:cap',power22.includes('const CAP=1.24'));
check('power:preserve-upgrades',power22.includes('/prev*next'));
check('power:host-authoritative',power22.includes('const oldUpdateHost22=updateHost')&&power22.includes("state==='play'"));

check('fix:transient-cleanup',verify.includes('_rangerUltUntil')&&verify.includes('_voidUltExplodeAt')&&verify.includes('_smoothDash'));
check('fix:elite-50-curve',verify.includes('targetEliteProbability')&&verify.includes('for(let i=0;i<50;i++)'));
check('runtime:self-qa-22',verify22.includes("build:'0.22'")&&verify22.includes('powerBuild')&&verify22.includes('gentlePowerStart')&&verify22.includes('gentlePowerCap'));

const failed=results.filter(x=>!x.ok);
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}${r.detail?' · '+r.detail:''}`);
console.log(`\n${results.length-failed.length}/${results.length} checks passed`);
if(failed.length){
  console.error('FAILED:',failed.map(x=>x.name).join(', '));
  process.exit(1);
}
