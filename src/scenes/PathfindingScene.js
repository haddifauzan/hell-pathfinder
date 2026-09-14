import Phaser from 'phaser';
import GridManager from '../core/GridManager.js';
import UCS from '../core/UCS.js';
import AStar from '../core/AStar.js';

export default class PathfindingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PathfindingScene' });
    this.cellSize = 32;
    this.cols = 25;
    this.rows = 18;
    this.startPos = { x: 2, y: 2 }; // Player (Lost Soul #00f5d4)
    this.goalPos = { x: 22, y: 15 }; // NPC Demon (#ff0054)

    // Game Mode State (Pure Play Mode)
    this.isPaused = false;
    this.isGameOver = false;
    this.lastPlayerMove = 0;
    this.lastNpcMove = 0;
    this.playerMoveInterval = 130; // ms
    this.npcMoveInterval = 280; // ms
    this.isCaught = false;

    // Sprite bookkeeping
    this.tileSprites = [];
    this.lavaTiles = [];
  }

  preload() {
    this.load.on('loaderror', (fileObj) => {
      console.warn(`Asset load skipped: ${fileObj.key}`);
    });

    try {
      this.load.image('tiles', '/src/assets/tiles/tiles.png');
      this.load.tilemapTiledJSON('level', '/src/assets/maps/level.json');
    } catch (e) {
      // Ignored
    }

    // Real hell-themed tile art
    this.load.image('tile-lava', '/src/assets/tiles/lava.png');
    this.load.image('tile-obsidian', '/src/assets/tiles/obsidian.png');
    this.load.image('tile-crystal', '/src/assets/tiles/crystal.png');

    // Character sprite sheets (Knight = Player, Lich = NPC Demon)
    this.load.spritesheet('knight-idle', '/src/assets/sprites/knight_idle.png', {
      frameWidth: 80,
      frameHeight: 116,
    });
    this.load.spritesheet('knight-walk', '/src/assets/sprites/knight_walk.png', {
      frameWidth: 80,
      frameHeight: 116,
    });
    this.load.image('lich-idle', '/src/assets/sprites/lich_idle.png');
  }

  create() {
    this.cols = 25;
    this.rows = 18;

    let tilemap = null;
    if (this.cache.tilemap.has('level')) {
      try {
        tilemap = this.make.tilemap({ key: 'level' });
        const tileset = tilemap.addTilesetImage('tileset', 'tiles');
        if (tileset) {
          tilemap.createLayer('Ground', tileset, 0, 0);
          tilemap.createLayer('Collision', tileset, 0, 0);
        }
      } catch (err) {
        console.warn('Could not initialize Tiled map, using procedural grid', err);
      }
    }

    this.grid = new GridManager(this.cols, this.rows, tilemap, 'Collision');

    if (!tilemap) {
      this.generateRandomMap();
    }

    // Layers graphics (depth-ordered: floor -> tile art -> borders -> explored -> path -> characters)
    this.floorGraphics = this.add.graphics().setDepth(0);
    this.borderGraphics = this.add.graphics().setDepth(2);
    this.exploredGraphics = this.add.graphics().setDepth(3);
    this.pathGraphics = this.add.graphics().setDepth(4);

    this.tileLayer = this.add.layer().setDepth(1);

    this.createAnimations();

    // Player (Knight) & NPC (Lich) sprites replacing the old colored circles
    this.playerSprite = this.add.sprite(0, 0, 'knight-idle', 0).setDepth(5);
    this.playerSprite.setScale((this.cellSize * 1.5) / 116);
    this.playerSprite.play('knight-idle-anim');

    this.npcSprite = this.add.sprite(0, 0, 'lich-idle').setDepth(5);
    this.npcSprite.setScale((this.cellSize * 1.5) / 144);

    // Gentle eerie pulse on the Lich so it doesn't look static
    this.tweens.add({
      targets: this.npcSprite,
      alpha: 0.75,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Controls setup for Play Mode
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Pause Shortcuts (P and Spacebar)
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-SPACE', () => this.togglePause());

    this.drawGrid();
    this.bindUI();
    this.runPathfinding();
  }

  createAnimations() {
    if (!this.anims.exists('knight-idle-anim')) {
      this.anims.create({
        key: 'knight-idle-anim',
        frames: this.anims.generateFrameNumbers('knight-idle', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists('knight-walk-anim')) {
      this.anims.create({
        key: 'knight-walk-anim',
        frames: this.anims.generateFrameNumbers('knight-walk', { start: 0, end: 4 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const statusElem = document.getElementById('game-status');

    if (this.isPaused) {
      if (statusElem) statusElem.classList.add('paused');
      this.updateStatusText('<i class="fa-solid fa-circle-pause"></i> GAME PAUSED - Press P or Space to continue');
    } else {
      if (statusElem) statusElem.classList.remove('paused');
      this.updateStatusText('<i class="fa-solid fa-gamepad"></i> RUN! Evade the Demon with WASD or Arrow Keys');
    }
  }

  generateRandomMap() {
    this.grid.resetGrid();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (Math.random() < 0.28) {
          const obsType = Math.floor(Math.random() * 3) + 1;
          this.grid.setTileType(x, y, obsType);
        }
      }
    }
    // Random walkable spawn positions with distance threshold (>= 14 tiles)
    this.startPos = this.grid.getRandomWalkablePos();
    this.goalPos = this.grid.getRandomWalkablePos([this.startPos], 14, this.startPos);
  }

  respawnRandomPositions() {
    this.startPos = this.grid.getRandomWalkablePos();
    this.goalPos = this.grid.getRandomWalkablePos([this.startPos], 14, this.startPos);
    this.isCaught = false;
    this.updateStatusText('<i class="fa-solid fa-gamepad"></i> RUN! Evade the Demon with WASD or Arrow Keys');
    this.drawMarkers();
    this.runPathfinding();
  }

  // Builds the static floor layer + places real tile art images for
  // lava / obsidian / crystal cells. Only needs to run on init or when
  // the map changes (the old per-frame procedural redraw is no longer
  // needed now that tiles are textured images instead of vector shapes).
  drawGrid() {
    const cs = this.cellSize;

    // Clear any previously placed tile images
    if (this.tileLayer) {
      this.tileLayer.removeAll(true);
    }
    this.tileSprites = [];
    this.lavaTiles = [];

    this.floorGraphics.clear();
    this.borderGraphics.clear();

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tileType = this.grid.getTileType(x, y);
        const px = x * cs;
        const py = y * cs;

        if (tileType === 0) {
          // Walkable Tile: dark-grey floor + thin orange lava crack lines
          this.floorGraphics.fillStyle(0x1e1e24, 1);
          this.floorGraphics.fillRect(px, py, cs, cs);

          this.floorGraphics.lineStyle(1, 0xff5500, 0.45);
          this.floorGraphics.beginPath();
          this.floorGraphics.moveTo(px + 4, py + 8);
          this.floorGraphics.lineTo(px + 14, py + 18);
          this.floorGraphics.lineTo(px + 26, py + 12);
          this.floorGraphics.strokePath();

        } else if (tileType === 1) {
          // Lava Pit - real lava texture
          const img = this.add.image(px + cs / 2, py + cs / 2, 'tile-lava');
          img.setDisplaySize(cs, cs);
          this.tileLayer.add(img);
          this.lavaTiles.push(img);

        } else if (tileType === 2) {
          // Obsidian Wall - real rock texture + crimson double border (kept from legend design)
          const img = this.add.image(px + cs / 2, py + cs / 2, 'tile-obsidian');
          img.setDisplaySize(cs, cs);
          this.tileLayer.add(img);

          this.borderGraphics.lineStyle(2, 0xff0054, 1);
          this.borderGraphics.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
          this.borderGraphics.lineStyle(1, 0x990033, 0.8);
          this.borderGraphics.strokeRect(px + 5, py + 5, cs - 10, cs - 10);

        } else if (tileType === 3) {
          // Kristal Magma - real magma-spike crystal art
          this.floorGraphics.fillStyle(0x1a1020, 1);
          this.floorGraphics.fillRect(px, py, cs, cs);

          const img = this.add.image(px + cs / 2, py + cs / 2 + 2, 'tile-crystal');
          const scale = (cs * 0.92) / 221; // fit tall spike crop into the cell
          img.setScale(scale);
          this.tileLayer.add(img);

          this.borderGraphics.lineStyle(1, 0xffeb3b, 0.6);
          this.borderGraphics.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
        }

        // Subtle cell outline
        this.floorGraphics.lineStyle(1, 0x2e1c38, 0.4);
        this.floorGraphics.strokeRect(px, py, cs, cs);
      }
    }

    this.drawMarkers();
  }

  drawMarkers() {
    const cs = this.cellSize;

    if (this.playerSprite) {
      const sx = this.startPos.x * cs + cs / 2;
      const sy = this.startPos.y * cs + cs / 2;
      this.playerSprite.setPosition(sx, sy);
    }

    if (this.npcSprite) {
      const gx = this.goalPos.x * cs + cs / 2;
      const gy = this.goalPos.y * cs + cs / 2;
      this.npcSprite.setPosition(gx, gy);
    }
  }

  bindUI() {
    const burgerBtn = document.getElementById('burger-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const randomBtn = document.getElementById('random-btn');
    const algoSelect = document.getElementById('algorithm-select');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const gameOverMenuBtn = document.getElementById('game-over-menu-btn');
    const gameOverModal = document.getElementById('game-over-modal');

    const openSettings = () => {
      settingsModal?.classList.remove('hide');
      if (!this.isPaused && !this.isGameOver) {
        this.togglePause();
      }
    };

    const closeSettings = () => {
      settingsModal?.classList.add('hide');
      if (this.isPaused && !this.isGameOver) {
        this.togglePause();
      } else if (this.isGameOver) {
        gameOverModal?.classList.remove('hide');
      }
    };

    burgerBtn?.addEventListener('click', openSettings);
    closeSettingsBtn?.addEventListener('click', closeSettings);
    resumeBtn?.addEventListener('click', closeSettings);

    // Close when clicking outside card backdrop
    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });

    // Open settings from Game Over modal
    gameOverMenuBtn?.addEventListener('click', () => {
      gameOverModal?.classList.add('hide');
      openSettings();
    });

    // Settings action: New Random Map
    randomBtn?.addEventListener('click', () => {
      settingsModal?.classList.add('hide');
      gameOverModal?.classList.add('hide');
      this.isGameOver = false;
      this.isCaught = false;
      if (this.isPaused) {
        this.isPaused = false;
        document.getElementById('game-status')?.classList.remove('paused');
      }
      this.generateRandomMap();
      this.drawGrid();
      this.runPathfinding();
      this.updateStatusText('<i class="fa-solid fa-gamepad"></i> RUN! Evade the Demon with WASD or Arrow Keys');
    });

    algoSelect?.addEventListener('change', () => {
      this.runPathfinding();
    });

    // Game Over Try Again button
    tryAgainBtn?.addEventListener('click', () => {
      gameOverModal?.classList.add('hide');
      settingsModal?.classList.add('hide');
      this.isGameOver = false;
      this.isCaught = false;
      if (this.isPaused) {
        this.isPaused = false;
        document.getElementById('game-status')?.classList.remove('paused');
      }
      this.generateRandomMap();
      this.drawGrid();
      this.runPathfinding();
      this.updateStatusText('<i class="fa-solid fa-gamepad"></i> RUN! Evade the Demon with WASD or Arrow Keys');
    });
  }

  updateStatusText(msg, isCaught = false) {
    const statusElem = document.getElementById('game-status');
    const textElem = document.getElementById('status-text');
    if (textElem) textElem.innerHTML = msg;
    if (statusElem) {
      if (isCaught) statusElem.classList.add('caught');
      else statusElem.classList.remove('caught');
    }
  }

  clearPathVisualization() {
    this.exploredGraphics.clear();
    this.pathGraphics.clear();
    document.getElementById('nodes-expanded').textContent = '0';
    document.getElementById('path-cost').textContent = '0';
    document.getElementById('exec-time').textContent = '0';
  }

  runPathfinding() {
    const algo = document.getElementById('algorithm-select')?.value || 'astar';
    const badge = document.getElementById('active-algo-badge');
    if (badge) {
      badge.textContent = algo === 'ucs' ? 'UCS' : 'A*';
    }

    const PathfinderClass = algo === 'ucs' ? UCS : AStar;
    const finder = new PathfinderClass(this.grid);

    // NPC Demon (goalPos) searches path to Player (startPos)
    const t0 = performance.now();
    const result = finder.search(this.goalPos, this.startPos);
    const t1 = performance.now();

    this.currentPathResult = result;

    // Update Floating Metrics Panel
    const nodesElem = document.getElementById('nodes-expanded');
    const costElem = document.getElementById('path-cost');
    const timeElem = document.getElementById('exec-time');

    if (nodesElem) nodesElem.textContent = finder.nodesExpanded;
    if (costElem) costElem.textContent = result.cost === Infinity ? 'No Path' : result.cost;
    if (timeElem) timeElem.textContent = (t1 - t0).toFixed(2);

    // 1. Draw Explored Frontier Nodes (Translucent Soul Yellow #ffd166)
    this.exploredGraphics.clear();
    const cs = this.cellSize;
    this.exploredGraphics.fillStyle(0xffd166, 0.45);

    for (const key of result.explored) {
      const [x, y] = key.split(',').map(Number);
      if ((x === this.startPos.x && y === this.startPos.y) ||
          (x === this.goalPos.x && y === this.goalPos.y)) continue;
      this.exploredGraphics.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4);
    }

    // 2. Draw Final Path (Radiant Fiery Gold #ffee38)
    this.pathGraphics.clear();
    const path = result.path;
    if (path && path.length > 0 && result.cost !== Infinity) {
      this.pathGraphics.lineStyle(5, 0xffee38, 0.95);
      this.pathGraphics.beginPath();
      const first = path[0];
      this.pathGraphics.moveTo(first.x * cs + cs / 2, first.y * cs + cs / 2);

      for (let i = 1; i < path.length; i++) {
        const p = path[i];
        this.pathGraphics.lineTo(p.x * cs + cs / 2, p.y * cs + cs / 2);
      }
      this.pathGraphics.strokePath();

      // Highlight path nodes
      this.pathGraphics.fillStyle(0xfff566, 0.85);
      for (const p of path) {
        if ((p.x === this.startPos.x && p.y === this.startPos.y) ||
            (p.x === this.goalPos.x && p.y === this.goalPos.y)) continue;
        this.pathGraphics.fillCircle(p.x * cs + cs / 2, p.y * cs + cs / 2, 5);
      }
    }

    return result;
  }

  update(time, delta) {
    // Gentle breathing glow on lava tiles (cheap alpha oscillation, replaces the
    // old per-frame vector redraw now that lava uses a real textured image)
    if (this.lavaTiles && this.lavaTiles.length) {
      const glow = 0.85 + 0.15 * Math.sin(time / 260);
      for (const tile of this.lavaTiles) {
        tile.setAlpha(glow);
      }
    }

    if (this.isPaused || this.isGameOver) return;

    // Handle Player Movement (WASD or Arrow Keys)
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    const isMoveKeyHeld = dx !== 0 || dy !== 0;

    // Swap between idle / walk animation based on input, and face the
    // direction of travel (the `true` arg avoids restarting the anim every frame).
    if (this.playerSprite) {
      if (isMoveKeyHeld) {
        this.playerSprite.play('knight-walk-anim', true);
        if (dx !== 0) this.playerSprite.setFlipX(dx < 0);
      } else {
        this.playerSprite.play('knight-idle-anim', true);
      }
    }

    if (isMoveKeyHeld && time > this.lastPlayerMove + this.playerMoveInterval) {
      const newPx = this.startPos.x + dx;
      const newPy = this.startPos.y + dy;

      if (this.grid.isWalkable(newPx, newPy)) {
        this.startPos = { x: newPx, y: newPy };
        this.lastPlayerMove = time;
        this.drawMarkers();
        this.runPathfinding();
      }
    }

    // Check if Caught -> Stop Game and Show Modal (No auto-respawn)
    if (this.startPos.x === this.goalPos.x && this.startPos.y === this.goalPos.y) {
      if (!this.isGameOver) {
        this.isGameOver = true;
        this.isCaught = true;
        document.getElementById('game-over-modal')?.classList.remove('hide');
        this.updateStatusText('<i class="fa-solid fa-skull"></i> YOU WERE CAUGHT BY THE DEMON!', true);
      }
      return;
    }

    // Handle NPC Demon Chase Movement along calculated path
    if (time > this.lastNpcMove + this.npcMoveInterval) {
      this.lastNpcMove = time;

      const result = this.runPathfinding();
      const path = result.path;

      if (path && path.length > 1) {
        const nextStep = path[1];
        const ndx = nextStep.x - this.goalPos.x;
        if (this.npcSprite && ndx !== 0) {
          this.npcSprite.setFlipX(ndx < 0);
        }
        this.goalPos = { x: nextStep.x, y: nextStep.y };
        this.drawMarkers();
        this.runPathfinding();
      }
    }
  }
}
