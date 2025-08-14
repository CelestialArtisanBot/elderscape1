export const GFX = {
  TILE_SIZE: 64, BASE_SCALE: 1,
  DPR: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
  CAMERA: { zoom: 1, min: 0.5, max: 2.0 },
  SHADOW_ALPHA: 0.25, LIGHT_ALPHA: 0.18, VIGNETTE_ALPHA: 0.15,
  SMOOTHING: true, SPRITE_FILTER: "high-quality",
  FONT_FAMILY: "'Cinzel', 'Trajan Pro', Georgia, serif",
  UI_SCALE: 1,
};
