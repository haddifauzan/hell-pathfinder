/**
 * GridManager – provides walkability information and grid editing for pathfinding.
 * Supports multiple infernal tile types according to PRD section 4.2:
 * 0 = Walkable Floor (Dark grey #1e1e24 + orange lava cracks)
 * 1 = Tile Lava Pit (#ff4d00 + glowing pulsing circle)
 * 2 = Tile Dinding Obsidian (#0d0d11 + double crimson border #ff0054)
 * 3 = Tile Kristal Magma (#ff9f1c rhombus/diamond spike with glowing stroke)
 */
export default class GridManager {
  constructor(width = 25, height = 18, map = null, collisionLayerName = 'Collision') {
    this.width = width;
    this.height = height;
    this.map = map;
    
    if (map && map.getLayer(collisionLayerName)) {
      this.layer = map.getLayer(collisionLayerName).tilemapLayer;
    } else {
      this.layer = null;
    }

    // 2D Array: 0 = Walkable, 1 = Lava Pit, 2 = Obsidian Wall, 3 = Magma Crystal
    this.grid = [];
    this.initGrid();
  }

  initGrid() {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        if (this.layer) {
          const tile = this.layer.getTileAt(x, y);
          row.push((tile && tile.index !== -1) ? 1 : 0);
        } else {
          row.push(0);
        }
      }
      this.grid.push(row);
    }
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.grid[y][x] === 0;
  }

  getTileType(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 2; // default wall
    return this.grid[y][x];
  }

  setTileType(x, y, type) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.grid[y][x] = type;
    }
  }

  setObstacle(x, y, isObstacle, type = 1) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.grid[y][x] = isObstacle ? type : 0;
    }
  }

  resetGrid() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 0;
      }
    }
  }

  getRandomWalkablePos(excludePosList = [], minDistance = 0, fromPos = null) {
    const walkableCells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isWalkable(x, y)) {
          const isExcluded = excludePosList.some(p => p && p.x === x && p.y === y);
          if (!isExcluded) {
            walkableCells.push({ x, y });
          }
        }
      }
    }
    if (walkableCells.length === 0) return { x: 0, y: 0 };

    // Filter by minimum Manhattan distance if requested
    if (fromPos && minDistance > 0) {
      const farCells = walkableCells.filter(cell => {
        const dist = Math.abs(cell.x - fromPos.x) + Math.abs(cell.y - fromPos.y);
        return dist >= minDistance;
      });
      if (farCells.length > 0) {
        const idx = Math.floor(Math.random() * farCells.length);
        return farCells[idx];
      }
    }

    const idx = Math.floor(Math.random() * walkableCells.length);
    return walkableCells[idx];
  }

  getNeighbors(x, y) {
    const dirs = [
      [0, -1], // up
      [1, 0],  // right
      [0, 1],  // down
      [-1, 0], // left
    ];
    const result = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isWalkable(nx, ny)) {
        result.push({ x: nx, y: ny, cost: 1 });
      }
    }
    return result;
  }
}
