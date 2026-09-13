import Phaser from 'phaser';
import PathfindingScene from './scenes/PathfindingScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 576,
  parent: 'game-container',
  backgroundColor: '#0d0914',
  scene: [PathfindingScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
};

window.addEventListener('load', () => {
  window.game = new Phaser.Game(config);
});
