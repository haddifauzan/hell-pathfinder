// src/utils/TextureFactory.js
// Generates procedural graphics for the Hell/Inferno theme.
// When real assets are ready, replace drawProcedural calls with loadTexture.

import Phaser from 'phaser';

export default class TextureFactory {
  constructor(scene) {
    this.scene = scene;
    // Cache for generated textures
    this.cache = {};
  }

  // Public method to get a texture key for a given type.
  // If the texture does not exist yet, it is created procedurally.
  getTextureKey(type, options = {}) {
    const key = `${type}-${JSON.stringify(options)}`;
    if (!this.scene.textures.exists(key)) {
      this._drawProcedural(type, key, options);
    }
    return key;
  }

  // ---------------------------------------------------------------
  // Procedural drawing implementations (private)
  // ---------------------------------------------------------------
  _drawProcedural(type, key, options) {
    const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const size = options.size || 32;
    switch (type) {
      case 'walkable':
        // Dark charcoal tile with thin orange crack line
        gfx.fillStyle(0x1e1e24, 1);
        gfx.fillRect(0, 0, size, size);
        gfx.lineStyle(2, 0xff4d00, 0.6);
        gfx.moveTo(0, size * 0.7);
        gfx.lineTo(size, size * 0.3);
        gfx.strokePath();
        break;
      case 'lava':
        // Pulsating red‑orange circle
        gfx.fillStyle(0xff4d00, 1);
        gfx.fillCircle(size / 2, size / 2, size * 0.35);
        // Simple glow effect by a lighter outer ring
        gfx.fillStyle(0xff8c42, 0.4);
        gfx.fillCircle(size / 2, size / 2, size * 0.45);
        break;
      case 'obsidian':
        // Black rectangle with red border
        gfx.fillStyle(0x0d0d11, 1);
        gfx.fillRect(0, 0, size, size);
        gfx.lineStyle(3, 0xff0015, 0.9);
        gfx.strokeRect(0, 0, size, size);
        break;
      case 'crystal':
        // Golden‑orange rhombus (diamond) shape
        gfx.fillStyle(0xff9f1c, 1);
        const half = size / 2;
        gfx.beginPath();
        gfx.moveTo(half, 0);
        gfx.lineTo(size, half);
        gfx.lineTo(half, size);
        gfx.lineTo(0, half);
        gfx.closePath();
        gfx.fillPath();
        // Outline glow
        gfx.lineStyle(2, 0xffd166, 0.7);
        gfx.strokePath();
        break;
      case 'player':
        // Cyan glowing circle (Lost Soul) with soft aura
        gfx.fillStyle(0x00f5d4, 1);
        gfx.fillCircle(size / 2, size / 2, size * 0.35);
        // Aura – larger, semi‑transparent
        gfx.fillStyle(0x00f5d4, 0.2);
        gfx.fillCircle(size / 2, size / 2, size * 0.45);
        break;
      case 'npc':
        // Crimson polygon (Demon) with yellow eyes
        gfx.fillStyle(0xff0054, 1);
        const pts = [
          { x: size * 0.2, y: size * 0.8 },
          { x: size * 0.5, y: size * 0.2 },
          { x: size * 0.8, y: size * 0.8 },
        ];
        gfx.beginPath();
        pts.forEach((p, i) => (i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y)));
        gfx.closePath();
        gfx.fillPath();
        // Eyes
        gfx.fillStyle(0xffd166, 1);
        gfx.fillCircle(size * 0.4, size * 0.45, size * 0.07);
        gfx.fillCircle(size * 0.6, size * 0.45, size * 0.07);
        break;
      default:
        console.warn('TextureFactory: unknown type', type);
    }
    // Generate texture from graphics and store it
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }

  // ---------------------------------------------------------------
  // Stub for loading real assets – used when final PNGs are ready.
  // ---------------------------------------------------------------
  loadTexture(key, url) {
    // Simple wrapper around Phaser's loader; call before scene start.
    this.scene.load.image(key, url);
    // After loading, you can use `this.scene.textures.get(key)` directly.
  }
}
