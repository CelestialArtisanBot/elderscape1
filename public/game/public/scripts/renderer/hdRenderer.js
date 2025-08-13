import { GFX } from '../graphics.config.js';
export class HDRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.assets = assets;
    this.camera = { x: 0, y: 0, zoom: GFX.CAMERA.zoom };
    this.viewport = { w: 0, h: 0 };
    this.off = document.createElement('canvas');
    this.offCtx = this.off.getContext('2d');
    this.#configure(); window.addEventListener('resize', () => this.resize()); this.resize();
  }
  #configure(){ this.ctx.imageSmoothingEnabled = GFX.SMOOTHING; this.offCtx.imageSmoothingEnabled = GFX.SMOOTHING;
    this.ctx.imageSmoothingQuality = GFX.SPRITE_FILTER; this.offCtx.imageSmoothingQuality = GFX.SPRITE_FILTER; }
  resize(){
    const DPR = GFX.DPR;
    this.viewport.w = Math.floor(this.canvas.clientWidth || window.innerWidth);
    this.viewport.h = Math.floor(this.canvas.clientHeight || window.innerHeight);
    this.canvas.width = Math.floor(this.viewport.w * DPR);
    this.canvas.height = Math.floor(this.viewport.h * DPR);
    this.ctx.setTransform(DPR,0,0,DPR,0,0);
    this.off.width = this.viewport.w; this.off.height = this.viewport.h;
    const zoomX = (this.viewport.w / (12 * GFX.TILE_SIZE));
    this.camera.zoom = Math.min(GFX.CAMERA.max, Math.max(GFX.CAMERA.min, zoomX));
  }
  worldToScreen(x,y){ return { x: Math.floor((x-this.camera.x)*this.camera.zoom), y: Math.floor((y-this.camera.y)*this.camera.zoom) }; }
  beginFrame(){ this.offCtx.clearRect(0,0,this.off.width,this.off.height); }
  drawTile(img, tx, ty){ const s = Math.floor(GFX.TILE_SIZE*this.camera.zoom);
    const {x,y}=this.worldToScreen(tx*GFX.TILE_SIZE, ty*GFX.TILE_SIZE); this.offCtx.drawImage(img,x,y,s,s); }
  drawSprite(img, px, py, w=GFX.TILE_SIZE, h=GFX.TILE_SIZE){
    const {x,y}=this.worldToScreen(px,py); const sw=Math.floor(w*this.camera.zoom), sh=Math.floor(h*this.camera.zoom);
    this.offCtx.drawImage(img,x,y,sw,sh);
  }
  compositeLights(lights=[]){
    this.offCtx.save(); this.offCtx.globalAlpha=GFX.SHADOW_ALPHA; this.offCtx.globalCompositeOperation='multiply';
    this.offCtx.fillStyle='#1b1b1b'; this.offCtx.fillRect(0,0,this.off.width,this.off.height); this.offCtx.restore();
    this.offCtx.save(); this.offCtx.globalCompositeOperation='screen';
    lights.forEach(l=>{ const g=this.offCtx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r);
      g.addColorStop(0,`rgba(255,235,200,${GFX.LIGHT_ALPHA})`); g.addColorStop(1,'rgba(0,0,0,0)');
      this.offCtx.fillStyle=g; this.offCtx.beginPath(); this.offCtx.arc(l.x,l.y,l.r,0,Math.PI*2); this.offCtx.fill(); });
    this.offCtx.restore();
    const g=this.offCtx.createRadialGradient(this.off.width/2,this.off.height/2,Math.min(this.off.width,this.off.height)*0.4,
                                             this.off.width/2,this.off.height/2,Math.max(this.off.width,this.off.height)*0.6);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(0,0,0,${GFX.VIGNETTE_ALPHA})`);
    this.offCtx.fillStyle=g; this.offCtx.fillRect(0,0,this.off.width,this.off.height);
  }
  endFrame(){ this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.drawImage(this.off,0,0,this.canvas.width/GFX.DPR,this.canvas.height/GFX.DPR); }
}
