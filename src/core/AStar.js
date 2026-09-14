// src/core/AStar.js
import Pathfinder from './Pathfinder.js';
import PriorityQueue from '../utils/PriorityQueue.js';

/**
 * A* Search implementation with Manhattan heuristic (grid movement).
 * Returns {path, cost, explored} similar to UCS.
 */
export default class AStar extends Pathfinder {
  constructor(grid) {
    super(grid);
  }

  /** Manhattan distance heuristic */
  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * @param {{x:number, y:number}} start
   * @param {{x:number, y:number}} goal
   */
  search(start, goal) {
    const frontier = new PriorityQueue();
    const startKey = `${start.x},${start.y}`;
    const goalKey = `${goal.x},${goal.y}`;

    frontier.enqueue(startKey, 0);
    const cameFrom = new Map();
    const costSoFar = new Map();
    costSoFar.set(startKey, 0);

    const explored = new Set();

    while (!frontier.isEmpty()) {
      const currentKey = frontier.dequeue();
      const [cx, cy] = currentKey.split(',').map(Number);
      const current = { x: cx, y: cy };

      this.recordNode();
      explored.add(currentKey);

      if (currentKey === goalKey) break;

      const neighbors = this.grid.getNeighbors(cx, cy);
      for (const n of neighbors) {
        const neighborKey = `${n.x},${n.y}`;
        const newCost = costSoFar.get(currentKey) + n.cost;
        if (!costSoFar.has(neighborKey) || newCost < costSoFar.get(neighborKey)) {
          costSoFar.set(neighborKey, newCost);
          const priority = newCost + this.heuristic({ x: n.x, y: n.y }, goal);
          frontier.enqueue(neighborKey, priority);
          cameFrom.set(neighborKey, currentKey);
        }
      }
    }

    const path = this.reconstructPath(start, goal, cameFrom);
    const totalCost = costSoFar.get(goalKey) ?? Infinity;
    return {
      path,
      cost: totalCost,
      explored: Array.from(explored),
    };
  }
}
