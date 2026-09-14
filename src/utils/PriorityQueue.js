// src/utils/PriorityQueue.js
// Binary Heap Min Priority Queue for UCS & A* Search algorithms
export default class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Add element to priority queue with given priority value (lower value = higher priority).
   * @param {any} element
   * @param {number} priority
   */
  enqueue(element, priority) {
    this.heap.push({ element, priority });
    this._siftUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with the lowest priority value.
   */
  dequeue() {
    if (this.isEmpty()) return undefined;
    const top = this.heap[0].element;
    const end = this.heap.pop();
    if (!this.isEmpty()) {
      this.heap[0] = end;
      this._siftDown(0);
    }
    return top;
  }

  push(element, priority = 0) {
    this.enqueue(element, priority);
  }

  pop() {
    return this.dequeue();
  }

  _siftUp(idx) {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[idx].priority < this.heap[parent].priority) {
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  _siftDown(idx) {
    const length = this.heap.length;
    while (true) {
      const left = idx * 2 + 1;
      const right = left + 1;
      let smallest = idx;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}
