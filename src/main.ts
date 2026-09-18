import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './game/config/court';
import { BootScene } from './game/scenes/BootScene';
import { CompareScene } from './game/scenes/CompareScene';
import { GameScene } from './game/scenes/GameScene';
import { MenuScene } from './game/scenes/MenuScene';
import { ResultScene } from './game/scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14100d',
  pixelArt: true,
  scale: {
    // The logical canvas is fixed at the 3:2 size of the reference plate. FIT
    // letterboxes it on other screens: the artwork is never stretched, and the
    // hoop, the dog and the trophy are never cropped.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene, CompareScene],
};

const boot = document.getElementById('boot-msg');
boot?.remove();

const game = new Phaser.Game(config);

// Handle for the screenshot and smoke-test harness. It only exposes the game
// instance; the player never sees it and nothing in the game reads from it.
declare global {
  interface Window {
    __chubol?: { game: Phaser.Game };
  }
}
window.__chubol = { game };
