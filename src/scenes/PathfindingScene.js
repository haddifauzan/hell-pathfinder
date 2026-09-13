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

    // Layers graphics
    this.gridGraphics = this.add.graphics();
    this.exploredGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
    this.nodesGraphics = this.add.graphics();

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

  drawGrid(time = 0) {
    this.gridGraphics.clear();
    const cs = this.cellSize;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tileType = this.grid.getTileType(x, y);

        if (tileType === 0) {
          // 1. Walkable Tile: 32x32px dark-grey (#1e1e24) + thin orange lava crack lines
          this.gridGraphics.fillStyle(0x1e1e24, 1);
          this.gridGraphics.fillRect(x * cs, y * cs, cs, cs);

          // Lava crack lines (#ff5500)
          this.gridGraphics.lineStyle(1, 0xff5500, 0.45);
          this.gridGraphics.beginPath();
          this.gridGraphics.moveTo(x * cs + 4, y * cs + 8);
          this.gridGraphics.lineTo(x * cs + 14, y * cs + 18);
          this.gridGraphics.lineTo(x * cs + 26, y * cs + 12);
          this.gridGraphics.strokePath();

        } else if (tileType === 1) {
          // 2. Tile Lava Pit: Merah-oranye membara (#ff4d00) + pulsing glowing circle in center
          this.gridGraphics.fillStyle(0xff4d00, 1);
          this.gridGraphics.fillRect(x * cs, y * cs, cs, cs);

          // Pulsing circle (#ffe600)
          const pulseScale = 0.5 + 0.15 * Math.sin((time + (x + y) * 200) / 300);
          this.gridGraphics.fillStyle(0xffe600, 0.85);
          this.gridGraphics.fillCircle(x * cs + cs / 2, y * cs + cs / 2, (cs / 3) * pulseScale);

        } else if (tileType === 2) {
          // 3. Tile Dinding Obsidian: Rect hitam pekat (#0d0d11) + double border crimson (#ff0054)
          this.gridGraphics.fillStyle(0x0d0d11, 1);
          this.gridGraphics.fillRect(x * cs, y * cs, cs, cs);

          // Outer crimson border (#ff0054)
          this.gridGraphics.lineStyle(2, 0xff0054, 1);
          this.gridGraphics.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);

          // Inner crimson stroke
          this.gridGraphics.lineStyle(1, 0x990033, 0.8);
          this.gridGraphics.strokeRect(x * cs + 5, y * cs + 5, cs - 10, cs - 10);

        } else if (tileType === 3) {
          // 4. Tile Kristal Magma: Rhombus/Diamond shape kuning-oranye terang (#ff9f1c) + glowing stroke
          this.gridGraphics.fillStyle(0x1a1020, 1);
          this.gridGraphics.fillRect(x * cs, y * cs, cs, cs);

          // Diamond shape (#ff9f1c)
          const cx = x * cs + cs / 2;
          const cy = y * cs + cs / 2;
          const r = cs / 2.5;

          this.gridGraphics.fillStyle(0xff9f1c, 0.95);
          this.gridGraphics.beginPath();
          this.gridGraphics.moveTo(cx, cy - r);
          this.gridGraphics.lineTo(cx + r, cy);
          this.gridGraphics.lineTo(cx, cy + r);
          this.gridGraphics.lineTo(cx - r, cy);
          this.gridGraphics.closePath();
          this.gridGraphics.fillPath();

          // Glowing stroke (#ffffff)
          this.gridGraphics.lineStyle(2, 0xffeb3b, 1);
          this.gridGraphics.strokePath();
        }

        // Subtly outline cell
        this.gridGraphics.lineStyle(1, 0x2e1c38, 0.4);
        this.gridGraphics.strokeRect(x * cs, y * cs, cs, cs);
      }
    }

    this.drawMarkers();
  }

  drawMarkers() {
    this.nodesGraphics.clear();
    const cs = this.cellSize;

    // Player / Lost Soul (#00f5d4 Cyan / Soul Blue)
    const sx = this.startPos.x * cs + cs / 2;
    const sy = this.startPos.y * cs + cs / 2;
    this.nodesGraphics.fillStyle(0x00f5d4, 1);
    this.nodesGraphics.fillCircle(sx, sy, cs / 3);
    this.nodesGraphics.lineStyle(2, 0xffffff, 0.95);
    this.nodesGraphics.strokeCircle(sx, sy, cs / 3);

    // NPC Demon / Hellhound (#ff0054 Red Crimson Glow)
    const gx = this.goalPos.x * cs + cs / 2;
    const gy = this.goalPos.y * cs + cs / 2;
    this.nodesGraphics.fillStyle(0xff0054, 1);
    this.nodesGraphics.fillCircle(gx, gy, cs / 3);
    this.nodesGraphics.lineStyle(2, 0xffee38, 1);
    this.nodesGraphics.strokeCircle(gx, gy, cs / 3);
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
    // Redraw pulsing lava animation in background (if not paused or game over)
    if (!this.isPaused && !this.isGameOver && Math.floor(time / 200) % 2 === 0) {
      this.drawGrid(time);
    }

    if (this.isPaused || this.isGameOver) return;

    // Handle Player Movement (WASD or Arrow Keys)
    if (time > this.lastPlayerMove + this.playerMoveInterval) {
      let dx = 0;
      let dy = 0;

      if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
      else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

      if (dx !== 0 || dy !== 0) {
        const newPx = this.startPos.x + dx;
        const newPy = this.startPos.y + dy;

        if (this.grid.isWalkable(newPx, newPy)) {
          this.startPos = { x: newPx, y: newPy };
          this.lastPlayerMove = time;
          this.drawMarkers();
          this.runPathfinding();
        }
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
        this.goalPos = { x: nextStep.x, y: nextStep.y };
        this.drawMarkers();
        this.runPathfinding();
      }
    }
  }
}
