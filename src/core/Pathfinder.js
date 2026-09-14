/**
 * Abstract Pathfinder base class.
 * Subclasses must implement `search(start, goal)` and should call
 * `this.recordNode()` whenever a node is expanded to keep metrics.
 */
export default class Pathfinder {
  /**
   * @param {GridManager} grid - instance providing `isWalkable`, `getNeighbors`.
   */
  constructor(grid) {
    this.grid = grid;
    this.nodesExpanded = 0;
  }

  /**
   * Increment the expanded‑node counter.
   */
  recordNode() {
    this.nodesExpanded++;
  }

  /**
   * Reconstruct the path from goal back to start using a `cameFrom` map.
   * @param {{x:number,y:number}} start
   * @param {{x:number,y:number}} goal
   * @param {Map<string,string>} cameFrom - map of "x,y" => "px,py"
   * @returns {Array<{x:number,y:number}>} ordered from start to goal
   */
  reconstructPath(start, goal, cameFrom) {
    const path = [];
    let current = `${goal.x},${goal.y}`;
    while (current !== `${start.x},${start.y}`) {
      const [cx, cy] = current.split(',').map(Number);
      path.push({ x: cx, y: cy });
      current = cameFrom.get(current);
      if (!current) break; // safety
    }
    // add start
    path.push({ x: start.x, y: start.y });
    return path.reverse();
  }

  /**
   * Must be overridden by subclasses.
   */
  search(start, goal) {
    throw new Error('search() not implemented');
  }
}
