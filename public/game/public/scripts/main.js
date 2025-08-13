import { GFX } from './graphics.config.js';
import { HDRenderer } from './renderer/hdRenderer.js';

const canvas = document.getElementById('game-canvas');
let renderer, ASSETS = {};

async function j(url){const r=await fetch(url);return r.json();}
async function img(url){return new Promise(res=>{const i=new Image();i.src=url;i.onload=()=>res(i);});}

async function loadAssets(){
  const map = await j('./scripts/assets.hd.json');
  const out = {};
  for(const g of Object.keys(map)){ out[g]={}; for(const k of Object.keys(map[g])) out[g][k]=await img(map[g][k]); }
  return out;
}
function initRenderer(){
  renderer = new HDRenderer(canvas, ASSETS);
  const spawn = { x: 5*GFX.TILE_SIZE, y: 5*GFX.TILE_SIZE };
  renderer.camera.x = spawn.x - (window.innerWidth/2)/renderer.camera.zoom;
  renderer.camera.y = spawn.y - (window.innerHeight/2)/renderer.camera.zoom;
}
function drawWorld(){
  renderer.beginFrame();
  for(let y=0;y<12;y++) for(let x=0;x<20;x++) renderer.drawTile(ASSETS.tiles.grass,x,y);
  for(let y=3;y<9;y++) for(let x=12;x<18;x++){
    const t=(y===3||y===8||x===12||x===17)?ASSETS.tiles.bank_wall:ASSETS.tiles.bank_floor;
    renderer.drawTile(t,x,y);
  }
  renderer.compositeLights([{x:520,y:220,r:200}]);
  renderer.endFrame();
}
function loop(){ drawWorld(); requestAnimationFrame(loop); }
(async function boot(){ ASSETS=await loadAssets(); initRenderer(); loop(); })();
