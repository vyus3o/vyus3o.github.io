/* NEXUS SURVIVAL visual overhaul build 0.20
 * Distinct 5-biome monster silhouettes, 15 boss silhouettes and layered skill VFX.
 * Rendering only: combat/network authority stays untouched.
 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const theme=()=>Math.min(4,Math.floor((g?.stage||0)/10));
const within=()=>Math.max(0,(g?.stage||0)%10);
const vhash=n=>{const x=Math.sin((Number(n)||0)*91.731+17.17)*43758.5453;return x-Math.floor(x)};
function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function poly(points,fill,stroke=null,lw=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function line(x1,y1,x2,y2,c,w=2,a=1){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function ring(x,y,r,c,w=2,a=1,dash=null){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.restore()}
function glow(x,y,r,c,a=.18){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
function eye(x,y,c='#fff4a0',s=3){px(x-s/2,y-s/2,s,s,c)}
function horn(x,y,flip=1,c='#d8c6a1'){poly([[x,y],[x+8*flip,y-12],[x+4*flip,y+1]],c)}
function blade(x,y,len=28,c='#dce2df'){poly([[x,y-3],[x+len,y],[x,y+3],[x+5,y]],c);px(x-2,y-5,4,10,'#705640')}
function staff(x,y,h=34,c='#806443'){px(x-1,y-h,3,h,c);glow(x+1,y-h,6,'#ddf27d',.18)}
function bob(e,m=1.3){return Math.sin((e.anim||0)+(Number(e.id)||0)*.41)*m}
function normalScale(e){return clamp((e.r||18)/18,.82,1.48)*(e.elite?1.05:1)}

const PAL=[
 {body:'#667a45',dark:'#30402c',light:'#a7bd67',eye:'#ffe27b',fx:'#d7b367'},
 {body:'#536d4b',dark:'#263b31',light:'#8fa968',eye:'#d7ff6f',fx:'#8fbd64'},
 {body:'#7898a4',dark:'#354f5c',light:'#c9edf0',eye:'#e9ffff',fx:'#83d8ef'},
 {body:'#8e3b2d',dark:'#3c201d',light:'#ef8a42',eye:'#ffdd72',fx:'#ff7548'},
 {body:'#514061',dark:'#211b2c',light:'#9a73bd',eye:'#e3a8ff',fx:'#a47cff'}
];

/* ---------- normal monster silhouettes ---------- */
function plainsEnemy(t,b,p){
 if(t===0){ // goblin scout
  px(-9,-13+b,18,25,p.body);px(-7,-25+b,14,13,'#769052');eye(4,-20+b,p.eye,3);poly([[-8,-22+b],[-16,-27+b],[-10,-16+b]],'#55683b');poly([[8,-22+b],[15,-27+b],[10,-16+b]],'#55683b');px(-12,9+b,7,13,p.dark);px(5,9+b,7,13,p.dark);line(13,-12+b,13,22+b,'#9d7b4b',3);poly([[13,-20+b],[9,-10+b],[17,-10+b]],'#d6c08e');
 }else if(t===1){ // wolf
  px(-18,-7+b,29,14,'#6c6658');px(8,-13+b,15,13,'#7c715e');poly([[13,-13+b],[16,-22+b],[19,-12+b]],'#4b473f');poly([[4,-12+b],[7,-20+b],[11,-11+b]],'#4b473f');eye(17,-8+b,'#ffb35e',3);px(-14,6+b,5,13,'#4a463f');px(4,6+b,5,13,'#4a463f');poly([[-18,-5+b],[-29,-12+b],[-24,-2+b]],'#716959');
 }else if(t===2){ // stone beetle
  ctx.fillStyle='#52604b';ctx.beginPath();ctx.ellipse(0,b,18,13,0,0,TAU);ctx.fill();px(-4,-12+b,8,25,'#303a31');px(-13,-8+b,6,16,'#778365');px(7,-8+b,6,16,'#778365');for(let i=-1;i<=1;i++){line(-12,i*6+b,-23,i*10+b,p.dark,3);line(12,i*6+b,23,i*10+b,p.dark,3)}eye(-5,-8+b,p.eye,2);eye(5,-8+b,p.eye,2);
 }else if(t===3){ // goblin archer
  px(-8,-12+b,16,24,'#587044');px(-7,-24+b,14,13,'#799255');px(-12,8+b,6,13,p.dark);px(6,8+b,6,13,p.dark);ctx.strokeStyle='#c69c5f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(14,-5+b,12,-1.15,1.15);ctx.stroke();line(17,-16+b,17,7+b,'#e2c795',1);eye(3,-19+b,p.eye,3);poly([[-6,-22+b],[-13,-27+b],[-9,-16+b]],'#4a6037');
 }else{ // bomber
  px(-10,-10+b,20,22,'#62533f');px(-8,-22+b,16,13,'#8c6a4c');px(-13,8+b,7,12,p.dark);px(6,8+b,7,12,p.dark);ctx.fillStyle='#3a3027';ctx.beginPath();ctx.arc(16,2+b,9,0,TAU);ctx.fill();px(13,-9+b,5,6,'#d9a34c');line(16,-9+b,21,-17+b,'#e17a45',2);glow(22,-18+b,4,'#ffb24d',.5);eye(3,-17+b,p.eye,3);
 }
}
function plagueEnemy(t,b,p){
 if(t===0){ // spider
  ctx.fillStyle='#45583e';ctx.beginPath();ctx.ellipse(2,b,13,10,0,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-10,-1+b,8,0,TAU);ctx.fill();for(let i=-1;i<=1;i++){line(-3,i*5+b,-22,i*11+b,'#71805c',3);line(8,i*5+b,25,i*11+b,'#71805c',3)}eye(-13,-4+b,'#cfff69',2);eye(-7,-4+b,'#cfff69',2);
 }else if(t===1){ // rot zombie
  px(-10,-9+b,20,28,'#65715a');px(-8,-23+b,16,15,'#7d8067');px(-14,0+b,6,20,'#454c42');px(8,-3+b,7,22,'#454c42');px(-10,16+b,7,13,'#343a35');px(4,16+b,7,13,'#343a35');eye(4,-18+b,'#b8e567',3);px(-5,-11+b,8,3,'#394235');
 }else if(t===2){ // plague bat
  px(-5,-6+b,10,18,'#49404c');poly([[-4,-3+b],[-24,-14+b],[-17,7+b],[-4,5+b]],'#5d4c61');poly([[4,-3+b],[24,-14+b],[17,7+b],[4,5+b]],'#5d4c61');poly([[-4,-7+b],[-8,-17+b],[0,-10+b]],'#332c38');poly([[4,-7+b],[8,-17+b],[0,-10+b]],'#332c38');eye(-2,-5+b,'#d6ff65',2);eye(3,-5+b,'#d6ff65',2);
 }else if(t===3){ // toxic ooze
  ctx.fillStyle='#6c8750';ctx.beginPath();ctx.moveTo(-17,11+b);ctx.quadraticCurveTo(-18,-9+b,-5,-12+b);ctx.quadraticCurveTo(4,-18+b,14,-7+b);ctx.quadraticCurveTo(20,2+b,15,13+b);ctx.closePath();ctx.fill();glow(-7,-1+b,5,'#baf45e',.25);glow(8,4+b,4,'#a8df50',.25);eye(-5,-5+b,'#dfff80',3);eye(5,-5+b,'#dfff80',3);
 }else{ // swamp mage
  poly([[-13,18+b],[-8,-9+b],[0,-18+b],[9,-9+b],[14,18+b]],'#34483a');px(-8,-24+b,16,12,'#65755a');poly([[-15,-23+b],[0,-35+b],[15,-23+b]],'#26382f');eye(3,-19+b,'#d9ff75',3);staff(16,8+b,36,'#6f5941');glow(17,-29+b,7,'#9fd25b',.28);
 }
}
function iceEnemy(t,b,p){
 if(t===0){ // frost hound
  px(-18,-7+b,28,14,'#678994');px(8,-14+b,15,14,'#83a8b0');poly([[13,-14+b],[16,-24+b],[20,-13+b]],'#c0e7e9');poly([[5,-13+b],[8,-22+b],[12,-12+b]],'#a9d5da');eye(17,-8+b,'#eaffff',3);px(-14,6+b,5,13,'#46616b');px(4,6+b,5,13,'#46616b');poly([[-18,-5+b],[-29,-10+b],[-24,-1+b]],'#9ec8cf');
 }else if(t===1){ // frost skeleton
  ctx.strokeStyle='#bfd8dc';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-16+b,8,0,TAU);ctx.stroke();line(0,-8+b,0,12+b,'#c9dfe1',4);line(0,-2+b,-12,8+b,'#c9dfe1',3);line(0,-2+b,13,5+b,'#c9dfe1',3);line(0,11+b,-8,24+b,'#c9dfe1',3);line(0,11+b,9,24+b,'#c9dfe1',3);eye(-3,-17+b,'#8feaff',2);eye(4,-17+b,'#8feaff',2);blade(11,5+b,23,'#dff9ff');
 }else if(t===2){ // ice wisp
  glow(0,b,18,'#8de8ff',.18);poly([[0,-19+b],[12,-3+b],[7,13+b],[0,23+b],[-7,13+b],[-12,-3+b]],'#8bc7d5','#d9fbff',2);px(-3,-4+b,6,8,'#e8ffff');for(let i=0;i<3;i++){const a=(g?.t||0)*1.7+i*TAU/3;glow(Math.cos(a)*18,Math.sin(a)*10+b,3,'#dfffff',.6)}
 }else if(t===3){ // glacial golem
  px(-15,-8+b,30,30,'#607a84');px(-12,-28+b,24,22,'#9bc5ce');px(-22,-5+b,9,24,'#526a73');px(13,-5+b,9,24,'#526a73');px(-12,19+b,9,11,'#425963');px(3,19+b,9,11,'#425963');poly([[-9,-28+b],[-3,-39+b],[2,-28+b]],'#d9f7fb');poly([[4,-27+b],[11,-37+b],[12,-23+b]],'#b7e5eb');eye(-5,-20+b,'#efffff',3);eye(6,-20+b,'#efffff',3);
 }else{ // frost ghost
  ctx.save();ctx.globalAlpha=.82;poly([[-13,17+b],[-11,-13+b],[-4,-25+b],[6,-24+b],[12,-12+b],[14,15+b],[7,9+b],[1,18+b],[-5,10+b]],'#7899a7');ctx.restore();glow(0,-8+b,18,'#9deeff',.13);eye(-4,-11+b,'#eaffff',3);eye(5,-11+b,'#eaffff',3);
 }
}
function fireEnemy(t,b,p){
 if(t===0){ // imp
  px(-9,-11+b,18,25,'#8a342a');px(-7,-23+b,14,13,'#aa4932');horn(-5,-22+b,-1,'#e17b3c');horn(5,-22+b,1,'#e17b3c');eye(-3,-18+b,'#ffdc63',3);eye(4,-18+b,'#ffdc63',3);poly([[-10,1+b],[-20,-6+b],[-16,10+b]],'#6b2925');poly([[10,1+b],[20,-6+b],[16,10+b]],'#6b2925');glow(0,14+b,5,'#ff7a32',.4);
 }else if(t===1){ // hellhound
  px(-18,-7+b,28,14,'#703028');px(8,-14+b,15,14,'#96392d');poly([[13,-14+b],[17,-24+b],[20,-13+b]],'#d55831');eye(17,-8+b,'#ffdf65',3);px(-14,6+b,5,13,'#4b2320');px(4,6+b,5,13,'#4b2320');for(let i=0;i<3;i++)glow(-19-i*5,-4+b-i*2,5,'#ff6a2c',.22);
 }else if(t===2){ // demon warrior
  px(-12,-10+b,24,31,'#6d2c29');px(-10,-27+b,20,18,'#9c4030');horn(-6,-25+b,-1,'#d47742');horn(6,-25+b,1,'#d47742');px(-18,-5+b,7,24,'#3e2522');px(11,-5+b,7,24,'#3e2522');blade(14,1+b,30,'#f19c61');eye(-4,-20+b,'#ffcf5c',3);eye(5,-20+b,'#ffcf5c',3);
 }else if(t===3){ // demon archer
  poly([[-12,18+b],[-9,-10+b],[0,-23+b],[9,-10+b],[12,18+b]],'#572725');horn(-4,-20+b,-1,'#d16a37');horn(5,-20+b,1,'#d16a37');ctx.strokeStyle='#e49c57';ctx.lineWidth=2;ctx.beginPath();ctx.arc(15,-3+b,13,-1.2,1.2);ctx.stroke();line(19,-15+b,19,9+b,'#ffcf83',1);eye(3,-15+b,'#ffdc62',3);
 }else{ // fire shaman
  poly([[-14,18+b],[-9,-8+b],[0,-24+b],[10,-8+b],[14,18+b]],'#4f2725');px(-8,-28+b,16,11,'#8d392d');poly([[-13,-27+b],[0,-39+b],[13,-27+b]],'#6c2f28');staff(16,8+b,38,'#68432e');glow(17,-31+b,8,'#ff7a32',.42);eye(3,-21+b,'#ffd763',3);
 }
}
function voidEnemy(t,b,p){
 if(t===0){ // void reaper
  poly([[-13,20+b],[-9,-10+b],[0,-27+b],[10,-10+b],[14,20+b]],'#342943');px(-7,-27+b,14,8,'#604b78');eye(2,-21+b,'#df9cff',3);line(12,-5+b,23,-20+b,'#66566f',3);ctx.strokeStyle='#c898eb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(26,-20+b,12,1.7,4.5);ctx.stroke();glow(0,-7+b,18,'#a56ee5',.10);
 }else if(t===1){ // void crawler
  px(-16,-4+b,30,13,'#3c2f49');px(8,-10+b,14,12,'#59416b');for(let i=-1;i<=1;i++){line(-8,i*4+b,-24,i*9+b,'#6d527d',3);line(9,i*4+b,26,i*9+b,'#6d527d',3)}eye(15,-6+b,'#eca8ff',3);glow(2,b,20,'#8e63b8',.08);
 }else if(t===2){ // eye of deep
  glow(0,b,22,'#a96dd8',.13);ctx.fillStyle='#49345d';ctx.beginPath();ctx.ellipse(0,b,20,14,0,0,TAU);ctx.fill();ctx.fillStyle='#d69cff';ctx.beginPath();ctx.ellipse(0,b,10,12,0,0,TAU);ctx.fill();ctx.fillStyle='#24182f';ctx.beginPath();ctx.ellipse(0,b,4,9,0,0,TAU);ctx.fill();for(let i=0;i<5;i++){const a=i*TAU/5;line(Math.cos(a)*14,Math.sin(a)*9+b,Math.cos(a)*27,Math.sin(a)*18+b,'#72528b',2)}
 }else if(t===3){ // dimensional assassin
  poly([[-11,18+b],[-8,-9+b],[0,-24+b],[9,-9+b],[11,18+b]],'#2e2739');px(-9,-21+b,18,8,'#57426a');eye(4,-18+b,'#dfa2ff',3);blade(9,1+b,25,'#af8cc5');blade(-9,1+b,-25,'#7d5d96');glow(0,-5+b,16,'#a26dd5',.08);
 }else{ // abyss knight
  px(-13,-10+b,26,31,'#342c42');px(-11,-29+b,22,20,'#514262');px(-18,-4+b,7,24,'#272130');px(11,-4+b,7,24,'#272130');poly([[-9,-29+b],[-3,-38+b],[0,-29+b]],'#72578a');poly([[4,-28+b],[10,-37+b],[11,-24+b]],'#72578a');eye(-4,-22+b,'#e2a4ff',3);eye(5,-22+b,'#e2a4ff',3);blade(13,2+b,31,'#b89ac9');
 }
}

/* ---------- boss silhouettes: 3 variants per biome ---------- */
function bossBaseAura(col,r=62){const t=g?.t||0;ring(0,1,r+Math.sin(t*3)*3,col,2,.38,[8,6]);glow(0,-7,r*.8,col,.07)}
function plainsBoss(v,b){
 if(v===0){ // warlord ogre
  px(-31,-14+b,62,48,'#65503c');px(-25,-43+b,50,31,'#89694b');px(-42,-5+b,13,42,'#403a31');px(29,-5+b,13,42,'#403a31');horn(-17,-40+b,-1,'#cbb483');horn(17,-40+b,1,'#cbb483');eye(-10,-31+b,'#ffcd61',5);eye(11,-31+b,'#ffcd61',5);px(22,-29+b,10,62,'#7b5737');poly([[27,-38+b],[10,-52+b],[44,-53+b]],'#a07b50');bossBaseAura('#d1a05e',64);
 }else if(v===1){ // twin axe troll
  px(-34,-12+b,68,46,'#4d5940');px(-27,-43+b,54,33,'#71805a');px(-45,-7+b,14,44,'#344032');px(31,-7+b,14,44,'#344032');eye(-9,-31+b,'#eff087',5);eye(10,-31+b,'#eff087',5);line(-38,-10+b,-47,27+b,'#735638',6);line(38,-10+b,47,27+b,'#735638',6);poly([[-49,21+b],[-64,6+b],[-61,32+b]],'#d6c090');poly([[49,21+b],[64,6+b],[61,32+b]],'#d6c090');bossBaseAura('#9fb775',67);
 }else{ // war drummer
  px(-30,-13+b,60,47,'#72513a');px(-24,-42+b,48,31,'#a07550');px(-43,-3+b,13,38,'#45352b');px(30,-3+b,13,38,'#45352b');ctx.fillStyle='#503221';ctx.beginPath();ctx.arc(0,14+b,27,0,TAU);ctx.fill();ring(0,14+b,22,'#d9b26e',4,.85);line(-27,0+b,-48,-29+b,'#c8a568',5);line(27,0+b,48,-29+b,'#c8a568',5);eye(-8,-31+b,'#ffd56b',5);eye(9,-31+b,'#ffd56b',5);bossBaseAura('#e0ae67',70);
 }
}
function plagueBoss(v,b){
 if(v===0){ // plague witch
  poly([[-30,37+b],[-24,-5+b],[-10,-42+b],[12,-42+b],[26,-5+b],[31,37+b]],'#304536');px(-19,-46+b,38,19,'#6b765d');poly([[-36,-43+b],[0,-66+b],[36,-43+b]],'#24372d');eye(7,-38+b,'#d8ff70',5);line(28,-11+b,36,38+b,'#6f7e52',6);glow(29,-20+b,12,'#aada5c',.25);bossBaseAura('#9dc660',70);
 }else if(v===1){ // rot colossus
  px(-37,-17+b,74,55,'#4d5b47');px(-31,-48+b,62,34,'#70765d');px(-48,-7+b,13,43,'#39463a');px(35,-7+b,13,43,'#39463a');for(let i=0;i<5;i++)glow(-24+i*12,-6+(i%2)*15+b,5,'#a9d85b',.25);eye(-12,-35+b,'#dfff72',5);eye(12,-35+b,'#dfff72',5);poly([[-15,-48+b],[-7,-61+b],[0,-48+b]],'#8ea66b');poly([[7,-48+b],[16,-59+b],[18,-44+b]],'#8ea66b');bossBaseAura('#83aa5c',74);
 }else{ // spore oracle
  poly([[-27,39+b],[-21,-10+b],[0,-40+b],[21,-10+b],[27,39+b]],'#34493c');ctx.fillStyle='#6d7e58';ctx.beginPath();ctx.ellipse(0,-46+b,39,20,0,0,TAU);ctx.fill();for(let i=0;i<6;i++)glow(-25+i*10,-49+(i%2)*7+b,5,'#c7e66b',.22);eye(0,-31+b,'#e4ff82',5);line(25,-4+b,39,34+b,'#66543c',5);glow(40,-15+b,11,'#b9db62',.3);bossBaseAura('#a6c95f',72);
 }
}
function iceBoss(v,b){
 if(v===0){ // giant
  px(-37,-16+b,74,54,'#607780');px(-31,-50+b,62,36,'#9ec1c7');px(-49,-7+b,14,45,'#4d626a');px(35,-7+b,14,45,'#4d626a');poly([[-22,-48+b],[-13,-67+b],[-5,-49+b]],'#d9f7fa');poly([[7,-49+b],[18,-66+b],[22,-43+b]],'#c2edf0');eye(-12,-37+b,'#efffff',5);eye(13,-37+b,'#efffff',5);bossBaseAura('#8fe5f5',76);
 }else if(v===1){ // glacier queen
  poly([[-31,40+b],[-24,-3+b],[-12,-41+b],[12,-41+b],[25,-3+b],[31,40+b]],'#5f7e8c');px(-19,-50+b,38,16,'#b8dce2');poly([[-25,-51+b],[-14,-70+b],[-5,-50+b]],'#e1fbff');poly([[5,-50+b],[15,-71+b],[25,-51+b]],'#d3f6fb');eye(0,-37+b,'#f4ffff',5);for(let i=0;i<5;i++){const a=(g?.t||0)*.45+i*TAU/5;poly([[Math.cos(a)*46,Math.sin(a)*25-13+b],[Math.cos(a)*53-5,Math.sin(a)*30-17+b],[Math.cos(a)*53+5,Math.sin(a)*30-17+b]],'#a9e6ef')};bossBaseAura('#a5e9f2',74);
 }else{ // frost beast
  px(-39,-5+b,58,31,'#607d88');px(14,-19+b,28,28,'#8cabb3');poly([[23,-19+b],[27,-41+b],[35,-20+b]],'#d4f4f6');poly([[10,-18+b],[15,-37+b],[21,-17+b]],'#c4e9ed');px(-29,21+b,10,22,'#455e68');px(4,21+b,10,22,'#455e68');eye(33,-9+b,'#efffff',5);poly([[-39,-4+b],[-58,-22+b],[-51,1+b]],'#7897a1');bossBaseAura('#83d9ea',76);
 }
}
function fireBoss(v,b){
 if(v===0){ // flame lord
  px(-34,-15+b,68,51,'#632823');px(-27,-49+b,54,36,'#983b2d');px(-46,-5+b,13,43,'#3c211f');px(33,-5+b,13,43,'#3c211f');horn(-17,-46+b,-1,'#e06f34');horn(17,-46+b,1,'#e06f34');eye(-11,-36+b,'#ffdf69',5);eye(12,-36+b,'#ffdf69',5);line(31,-16+b,40,42+b,'#74452c',8);poly([[36,-28+b],[18,-61+b],[53,-49+b]],'#f08b46');bossBaseAura('#ff7642',76);
 }else if(v===1){ // infernal butcher
  px(-38,-15+b,76,52,'#672925');px(-30,-47+b,60,34,'#8f352b');px(-49,-4+b,14,42,'#40201f');px(35,-4+b,14,42,'#40201f');eye(-10,-35+b,'#ffd45d',5);eye(11,-35+b,'#ffd45d',5);line(-37,-8+b,-55,37+b,'#72503a',7);poly([[-54,20+b],[-74,7+b],[-67,45+b]],'#dda06a');line(38,-5+b,55,33+b,'#72503a',7);poly([[54,16+b],[72,1+b],[68,42+b]],'#dda06a');bossBaseAura('#ef5c3b',79);
 }else{ // ember archon
  poly([[-32,39+b],[-25,-9+b],[-11,-47+b],[11,-47+b],[26,-9+b],[32,39+b]],'#552621');px(-19,-54+b,38,17,'#a13d2c');horn(-13,-52+b,-1,'#ef7436');horn(13,-52+b,1,'#ef7436');eye(0,-40+b,'#fff07a',6);for(let i=0;i<6;i++){const a=(g?.t||0)*.8+i*TAU/6;glow(Math.cos(a)*48,Math.sin(a)*26-9+b,8,'#ff6a2f',.25)}bossBaseAura('#ff8b43',75);
 }
}
function voidBoss(v,b){
 if(v===0){ // abyss lord
  px(-35,-15+b,70,51,'#292233');px(-28,-49+b,56,36,'#503f64');px(-47,-6+b,13,44,'#201a2a');px(34,-6+b,13,44,'#201a2a');eye(-11,-36+b,'#e8a7ff',5);eye(12,-36+b,'#e8a7ff',5);for(let i=0;i<3;i++){const r=48+i*13;ctx.save();ctx.rotate((g?.t||0)*(.18+i*.05));ctx.globalAlpha=.35;ctx.strokeStyle='#a777d1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-12+b,r,.15,Math.PI*1.45);ctx.stroke();ctx.restore()}bossBaseAura('#a577d0',79);
 }else if(v===1){ // eye tyrant
  glow(0,-6+b,54,'#9d65c8',.13);ctx.fillStyle='#3f3150';ctx.beginPath();ctx.ellipse(0,-8+b,43,31,0,0,TAU);ctx.fill();ctx.fillStyle='#d092f3';ctx.beginPath();ctx.ellipse(0,-8+b,20,26,0,0,TAU);ctx.fill();ctx.fillStyle='#22172e';ctx.beginPath();ctx.ellipse(0,-8+b,8,20,0,0,TAU);ctx.fill();for(let i=0;i<8;i++){const a=i*TAU/8+(g?.t||0)*.08;line(Math.cos(a)*34,Math.sin(a)*24-8+b,Math.cos(a)*61,Math.sin(a)*44-8+b,'#75528d',5)}bossBaseAura('#b27bd7',80);
 }else{ // reaper monarch
  poly([[-34,41+b],[-27,-8+b],[-11,-51+b],[12,-51+b],[28,-8+b],[35,41+b]],'#292235');px(-20,-56+b,40,18,'#513e67');poly([[-22,-58+b],[0,-75+b],[22,-58+b]],'#6c4e83');eye(0,-43+b,'#eba7ff',6);line(28,-7+b,45,-36+b,'#665171',7);ctx.strokeStyle='#cc98e7';ctx.lineWidth=7;ctx.beginPath();ctx.arc(48,-38+b,22,1.55,4.65);ctx.stroke();bossBaseAura('#a779d1',80);
 }
}
function drawBossV20(e){
 const th=theme(),v=within()%3,b=bob(e,1.0),s=clamp((e.r||48)/48,.95,1.45);
 shadow(e.x,e.y,105*s);ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(s,s);
 if(th===0)plainsBoss(v,b);else if(th===1)plagueBoss(v,b);else if(th===2)iceBoss(v,b);else if(th===3)fireBoss(v,b);else voidBoss(v,b);
 ctx.restore();
 const hp=e.max?clamp(e.hp/e.max,0,1):1,phase=hp<=.35?3:hp<=.70?2:1,pal=PAL[th],pulse=.5+.5*Math.sin((g?.t||0)*4);
 ring(e.x,e.y,e.r+16+4*pulse,phase===3?'#ff7265':phase===2?'#ffd36d':pal.fx,phase===3?4:2,.28+.18*pulse,[10,8]);
 if(phase>=2)ring(e.x,e.y,e.r+28,pal.light,2,.22,[4,9]);
}
function drawEliteOverlay(e,th){
 const pulse=.5+.5*Math.sin((g?.t||0)*5+(Number(e.id)||0));
 ring(e.x,e.y,e.r+9+3*pulse,'#ffd96b',3,.45+.25*pulse,[5,4]);
 glow(e.x,e.y,e.r+16,'#e6a14f',.10+.05*pulse);
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#170f08dd';ctx.fillRect(e.x-27,e.y-e.r-20,54,6);ctx.fillStyle='#ffd96b';ctx.fillRect(e.x-27,e.y-e.r-20,54*clamp(e.hp/Math.max(1,e.max),0,1),6);ctx.font='900 8px Arial';ctx.textAlign='center';ctx.fillStyle='#fff0ab';ctx.fillText('ELITE',e.x,e.y-e.r-25);ctx.restore();
}
function drawMarked(e){if((e.markedUntil||0)>(g?.t||0)){const p=.5+.5*Math.sin((g?.t||0)*8);ring(e.x,e.y,e.r+8+p*3,'#ffe17b',2,.8,[5,4]);line(e.x-e.r-9,e.y,e.x-e.r-3,e.y,'#ffe17b',2);line(e.x+e.r+3,e.y,e.x+e.r+9,e.y,'#ffe17b',2)}}

const prevDrawEnemyV20=drawEnemy;
drawEnemy=function(e){
 if(!e)return;
 if(e.boss){drawBossV20(e);drawMarked(e);return}
 const th=theme(),p=PAL[th],b=bob(e),s=normalScale(e),t=((e.type||0)%5+5)%5;
 shadow(e.x,e.y,40*s);ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(s,s);
 if(th===0)plainsEnemy(t,b,p);else if(th===1)plagueEnemy(t,b,p);else if(th===2)iceEnemy(t,b,p);else if(th===3)fireEnemy(t,b,p);else voidEnemy(t,b,p);
 ctx.restore();
 drawMarked(e);if(e.elite)drawEliteOverlay(e,th);
};

/* ---------- zone polish ---------- */
const prevDrawZoneV20=drawZone;
drawZone=function(z){
 prevDrawZoneV20(z);if(!z)return;const t=g?.t||0,a=clamp(z.life/Math.max(.01,z.max||z.life||1),0,1),r=z.r||50,k=z.type||z.kind||'';
 ctx.save();ctx.lineCap='round';
 if(k==='blackhole'){
   for(let i=0;i<3;i++){ctx.globalAlpha=(.18+.14*i)*a;ctx.strokeStyle=i===2?'#d6b6ff':'#8c63c9';ctx.lineWidth=2+i;ctx.beginPath();ctx.arc(z.x,z.y,r*(.35+i*.18),t*(1.2+i*.25),t*(1.2+i*.25)+Math.PI*1.35);ctx.stroke()}
   glow(z.x,z.y,r*.34,'#5c358b',.18*a);
 }else if(k==='arrowrain'){
   ctx.strokeStyle='#d9f4aa';ctx.globalAlpha=.55*a;ctx.lineWidth=2;for(let i=0;i<9;i++){const q=i/8,xx=z.x-r*.75+q*r*1.5+Math.sin(t*3+i)*7,yy=z.y-r*.5+((i*37)%100)/100*r;ctx.beginPath();ctx.moveTo(xx-9,yy-18);ctx.lineTo(xx+5,yy+8);ctx.stroke()}
 }else if(k==='firewall'){
   ctx.globalAlpha=.28*a;for(let i=0;i<10;i++){const ang=i*TAU/10+t*.12,rr=r*(.65+.22*Math.sin(t*4+i));glow(z.x+Math.cos(ang)*rr,z.y+Math.sin(ang)*rr,7,'#ff7b37',.24*a)}
 }else if(k==='time'){
   ring(z.x,z.y,r*.72,'#a8bbff',2,.35*a,[3,7]);for(let i=0;i<6;i++){const ang=i*TAU/6-t*.35;line(z.x+Math.cos(ang)*r*.28,z.y+Math.sin(ang)*r*.28,z.x+Math.cos(ang)*r*.45,z.y+Math.sin(ang)*r*.45,'#c3ceff',2,.45*a)}
 }else if(k==='sanctuary'){
   ring(z.x,z.y,r*.65,'#fff1a5',2,.38*a,[8,6]);ring(z.x,z.y,r*.28,'#fff7ce',2,.45*a);for(let i=0;i<8;i++){const ang=i*TAU/8+t*.15;const x=z.x+Math.cos(ang)*r*.48,y=z.y+Math.sin(ang)*r*.48;line(x-3,y,x+3,y,'#fff5bf',2,.45*a);line(x,y-3,x,y+3,'#fff5bf',2,.45*a)}
 }
 ctx.restore();
};

/* ---------- projectile polish ---------- */
const prevDrawProjectileV20=drawProjectile;
drawProjectile=function(q){
 prevDrawProjectileV20(q);if(!q)return;const sk=q.skill||'',ang=Math.atan2(q.vy||0,q.vx||0),t=g?.t||0;
 ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.lineCap='round';
 if(sk==='RN01'||sk==='BASIC_ARCHER'){ctx.strokeStyle='#dfffb2';ctx.globalAlpha=.24;ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-20-i*8,(i-1)*3);ctx.lineTo(-4,(i-1)*2);ctx.stroke()}}
 else if(sk==='AW01'||sk==='AW03'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#d8c0ff';ctx.globalAlpha=.34;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(-6,0);ctx.stroke();ctx.rotate(t*3);for(let i=0;i<4;i++){const a=i*TAU/4;line(Math.cos(a)*7,Math.sin(a)*7,Math.cos(a)*13,Math.sin(a)*13,'#b994ff',2,.65)}}
 else if(sk==='BASIC_MAGE'){ring(0,0,14,'#cad4ff',1,.35);glow(-11,0,10,'#879cff',.09)}
 else if(sk==='BASIC_PRIEST'){ring(0,0,13,'#fff2ad',1,.38);line(-2,-9,-2,9,'#fff8d1',2,.55);line(-10,0,6,0,'#fff8d1',2,.55)}
 else if(sk==='M01'){glow(-12,0,15,'#ff7b35',.10);for(let i=0;i<3;i++)glow(-22-i*7,Math.sin(t*9+i)*3,3,'#ffc15f',.20)}
 else if(sk==='M12'){line(-31,-5,-8,0,'#c6f7ff',2,.32);line(-29,6,-8,0,'#9ae6f3',2,.28)}
 else if(sk==='P10'){line(-29,-5,-7,0,'#fff3ac',2,.35);line(-29,5,-7,0,'#f4d65f',2,.30)}
 ctx.restore();
};

/* ---------- layered skill effects ---------- */
const prevDrawFxV20=drawFx;
function radialCracks(f,a,col){const n=8,r=f.r||70;for(let i=0;i<n;i++){const ang=i*TAU/n+.17*Math.sin((Number(f.x)||0)+i),r1=r*.18,r2=r*(.62+.24*vhash(i+f.x));const mx=f.x+Math.cos(ang)*r1,my=f.y+Math.sin(ang)*r1,ex=f.x+Math.cos(ang)*r2,ey=f.y+Math.sin(ang)*r2;line(mx,my,(mx+ex)*.5+Math.sin(i*2)*5,(my+ey)*.5+Math.cos(i*3)*5,col,2,a*.55);line((mx+ex)*.5+Math.sin(i*2)*5,(my+ey)*.5+Math.cos(i*3)*5,ex,ey,col,1,a*.35)}}
function burstBits(f,a,col,count=8){const p=1-a,r=f.r||45;for(let i=0;i<count;i++){const ang=i*TAU/count+vhash(i+f.x)*.4,rr=r*(.25+p*.85),x=f.x+Math.cos(ang)*rr,y=f.y+Math.sin(ang)*rr;line(x,y,x+Math.cos(ang)*(8+12*p),y+Math.sin(ang)*(8+12*p),col,2,a*.65)}}
function hexShield(x,y,r,col,a,rot=0){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();for(let i=0;i<6;i++){const ang=-Math.PI/2+i*TAU/6,xx=Math.cos(ang)*r,yy=Math.sin(ang)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.stroke();ctx.restore()}
drawFx=function(f){
 prevDrawFxV20(f);if(!f||!g)return;const a=clamp(f.life/Math.max(.01,f.max||1),0,1),p=1-a,t=g.t||0,r=f.r||45,c=f.col||'#fff';
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(['basicWarriorSlash','slash','slash360'].includes(f.type)){
   const base=f.angle||0;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.22*a;ctx.strokeStyle=c;ctx.lineWidth=f.type==='slash360'?8:5;ctx.beginPath();ctx.arc(f.x,f.y,r+8,base-.75+p*.9,base+.28+p*.9);ctx.stroke();burstBits(f,a,c,5);
 }else if(['quake','crush'].includes(f.type)){
   ring(f.x,f.y,r*(.35+.65*p),c,3,.45*a);radialCracks(f,a,c);
 }else if(f.type==='execute'){
   line(f.x-r*.5,f.y-r*.6,f.x+r*.5,f.y+r*.55,'#fff0dd',5,.55*a);line(f.x-r*.5,f.y+r*.55,f.x+r*.5,f.y-r*.6,c,4,.65*a);burstBits(f,a,c,7);
 }else if(['beam','charge'].includes(f.type)){
   ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.14*a;ctx.fillStyle=c;ctx.fillRect(0,-Math.max(5,(f.r2||8)*1.15),r,Math.max(10,(f.r2||8)*2.3));ctx.globalAlpha=.78*a;ctx.fillStyle='#fffbe9';ctx.fillRect(0,-1.2,r,2.4);ctx.restore();glow(f.x+Math.cos(f.angle||0)*r,f.y+Math.sin(f.angle||0)*r,12,c,.16*a);ctx.save();
 }else if(['chain','lightning','lightningStrike'].includes(f.type)){
   glow(f.x,f.y,18,'#b8eaff',.12*a);ring(f.x,f.y,12+p*18,'#e8fbff',2,.45*a);burstBits(f,a,'#d9f7ff',6);
 }else if(['meteor','explosion','arcaneexplode'].includes(f.type)){
   ring(f.x,f.y,r*(.25+.8*p),c,4,.55*a);ring(f.x,f.y,r*(.12+.55*p),'#fff0c3',2,.55*a);burstBits(f,a,c,10);glow(f.x,f.y,r*.55,c,.08*a);
 }else if(f.type==='iceburst'){
   ring(f.x,f.y,r*(.3+.65*p),'#d9fbff',3,.55*a);for(let i=0;i<8;i++){const ang=i*TAU/8,rr=r*(.25+.55*p),x=f.x+Math.cos(ang)*rr,y=f.y+Math.sin(ang)*rr;ctx.save();ctx.translate(x,y);ctx.rotate(ang);poly([[0,-7],[5,0],[0,11],[-5,0]],'#bcebf3','#efffff',1);ctx.restore()}
 }else if(['holyburst','judgment','holy','healwave','prayer'].includes(f.type)){
   ring(f.x,f.y,r*(.3+.62*p),c,3,.42*a,[7,6]);ring(f.x,f.y,r*.35,'#fff8cd',2,.48*a);for(let i=0;i<8;i++){const ang=i*TAU/8+t*.18,x=f.x+Math.cos(ang)*r*.55,y=f.y+Math.sin(ang)*r*.55;line(x-4,y,x+4,y,'#fff8d9',2,.40*a);line(x,y-4,x,y+4,'#fff8d9',2,.40*a)}if(r>250)burstBits(f,a,c,14);
 }else if(f.type==='shield'){
   hexShield(f.x,f.y,r*.62,c,.52*a,t*.25);hexShield(f.x,f.y,r*.44,'#effff4',.28*a,-t*.18);glow(f.x,f.y,r*.55,c,.05*a);
 }else if(['target','mark','judgemark'].includes(f.type)){
   const rr=r*(.75+.12*Math.sin(t*8));ring(f.x,f.y,rr,c,2,.72*a,[6,5]);for(let i=0;i<4;i++){const ang=i*Math.PI/2;line(f.x+Math.cos(ang)*rr*.65,f.y+Math.sin(ang)*rr*.65,f.x+Math.cos(ang)*rr*1.2,f.y+Math.sin(ang)*rr*1.2,c,3,.7*a)}
 }else if(['warcry','taunt'].includes(f.type)){
   for(let i=0;i<8;i++){const ang=i*TAU/8,rr=r*(.35+.45*p),x=f.x+Math.cos(ang)*rr,y=f.y+Math.sin(ang)*rr;line(x,y,x+Math.cos(ang)*15,y+Math.sin(ang)*15,c,3,.48*a)}ring(f.x,f.y,r*(.45+.35*p),c,2,.30*a);
 }else if(f.type==='mageCast'){
   ring(f.x,f.y,r*.72,'#c8d3ff',2,.55*a,[3,5]);for(let i=0;i<4;i++){const ang=t*1.7+i*TAU/4;glow(f.x+Math.cos(ang)*r*.55,f.y+Math.sin(ang)*r*.55,3,'#dfe5ff',.45*a)}
 }else if(f.type==='priestCast'){
   ring(f.x,f.y,r*.72,'#fff0a3',2,.55*a,[5,5]);line(f.x,f.y-r*.45,f.x,f.y+r*.45,'#fff9dc',2,.55*a);line(f.x-r*.45,f.y,f.x+r*.45,f.y,'#fff9dc',2,.55*a);
 }else if(f.type==='bowRelease'){
   for(let i=-2;i<=2;i++)line(f.x-8,f.y+i*4,f.x+20+8*p,f.y+i*2,'#dcf7ad',1.5,.38*a);
 }else if(f.type==='falcon'){
   ctx.globalAlpha=.65*a;ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.quadraticCurveTo(f.x-18,f.y-15,f.x-31,f.y-3);ctx.moveTo(f.x,f.y);ctx.quadraticCurveTo(f.x+18,f.y-15,f.x+31,f.y-3);ctx.stroke();
 }else if(f.type==='elemental'){
   const cols=['#ff8b4b','#9deaff','#ffe16b'];for(let i=0;i<3;i++){const ang=t*2+i*TAU/3,rr=r*.42;glow(f.x+Math.cos(ang)*rr,f.y+Math.sin(ang)*rr,7,cols[i],.34*a)}ring(f.x,f.y,r*.55,'#dbeaff',1,.30*a);
 }
 ctx.restore();
};

/* ---------- ultimate/subclass aura polish ---------- */
const prevDrawPlayerV20=drawPlayer;
drawPlayer=function(p,isLocal=false){
 prevDrawPlayerV20(p,isLocal);if(!p||!g||!p.subclass)return;const t=g.t||0,a=.5+.5*Math.sin(t*5);
 if(p.subclass==='berserker'&&(p._berserkUltUntil||0)>t){ring(p.x,p.y,34+a*5,'#ef5f52',3,.38);ring(p.x,p.y,45-a*4,'#ff9a6f',2,.18,[6,5]);for(let i=0;i<3;i++){const ang=t*2.4+i*TAU/3;line(p.x+Math.cos(ang)*20,p.y+Math.sin(ang)*14,p.x+Math.cos(ang)*43,p.y+Math.sin(ang)*31,'#ff7564',3,.45)}}
 else if(p.subclass==='guardian'&&(p._guardianUltUntil||0)>t){hexShield(p.x,p.y-2,38,'#bde4cc',.65,t*.15);hexShield(p.x,p.y-2,47,'#91bda8',.3,-t*.12)}
 else if(p.subclass==='ranger'&&(p._rangerUltUntil||0)>t){for(let i=0;i<3;i++){const ang=t*2+i*TAU/3;ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle='#c8f49b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,31+i*5,ang,ang+1.15);ctx.stroke();ctx.restore()}}
 else if(p.subclass==='elementalist'&&(p._elemUltUntil||0)>t){const cs=['#ff8650','#9fe8ff','#ffe263'];for(let i=0;i<3;i++){const ang=t*2.2+i*TAU/3;glow(p.x+Math.cos(ang)*34,p.y-5+Math.sin(ang)*22,6,cs[i],.42)}}
 else if(p.subclass==='warlock'&&(p._voidUltExplodeAt||0)>t){ring(p.x,p.y,36,'#c29cff',2,.28,[4,5])}
 else if(p.subclass==='seraph'&&((p._seraphWingUntil||0)>t||(p._blessUntil||0)>t)){ctx.save();ctx.globalAlpha=.28+.15*a;ctx.strokeStyle='#fff0a2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x-5,p.y-10);ctx.quadraticCurveTo(p.x-28,p.y-29,p.x-39,p.y-3);ctx.moveTo(p.x+5,p.y-10);ctx.quadraticCurveTo(p.x+28,p.y-29,p.x+39,p.y-3);ctx.stroke();ctx.restore()}
};

window.NEXUS_VISUAL_V20={build:'0.20',monsterSilhouettes:25,bossSilhouettes:15,layeredVfx:true};
})();
