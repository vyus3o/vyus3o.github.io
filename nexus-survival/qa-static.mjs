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
  'game-runtime-fix-v14.js','game-verify-v16.js'
];
for(const f of required)check(`file:${f}`,exists(f));

const index=read('index.html');
const manifest=JSON.parse(read('manifest.webmanifest'));
const classes=read('game-classes-v13.js');
const progression=read('game-progression-v13.js');
const verify=read('game-verify-v16.js');
const raid=read('game-raid-v11.js');
const mobile=read('game-mobile-v12.js');

check('build:0.16',index.includes('BUILD 0.16')&&index.includes('PROTOCOL // 16'));
check('cache:v16',/game-verify-v16\.js\?v=16/.test(index)&&/game-progression-v13\.js\?v=16/.test(index));
check('verify:last-script',index.lastIndexOf('game-verify-v16.js')>index.lastIndexOf('game-runtime-fix-v14.js'));
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

check('fix:transient-cleanup',verify.includes('_rangerUltUntil')&&verify.includes('_voidUltExplodeAt')&&verify.includes('_smoothDash'));
check('fix:elite-50-curve',verify.includes('targetEliteProbability')&&verify.includes('for(let i=0;i<50;i++)'));
check('runtime:self-qa',verify.includes('window.NEXUS_RUN_QA=qa')&&verify.includes("build:'0.16'"));

const failed=results.filter(x=>!x.ok);
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}${r.detail?' · '+r.detail:''}`);
console.log(`\n${results.length-failed.length}/${results.length} checks passed`);
if(failed.length){
  console.error('FAILED:',failed.map(x=>x.name).join(', '));
  process.exit(1);
}
