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
    // NO_CENTER on purpose: the page already centres the canvas with a CSS grid.
    // With both doing it the two offsets add up and the canvas sits off to one
    // side, which on a phone pushes the shoot button under the notch.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
  input: {
    /*
     * Phaser tracks ONE touch pointer unless told otherwise, and a touch that
     * finds no free pointer is dropped without emitting anything. A phone held
     * sideways has both thumbs on the glass, so the left one ate the only
     * pointer and the right one — the one pressing TIRAR — never existed. Three:
     * one per thumb and one for the finger that ends up resting on the screen.
     */
    activePointers: 3,
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene, CompareScene],
};

const boot = document.getElementById('boot-msg');
boot?.remove();

const game = new Phaser.Game(config);

/*
 * Turning the phone upright hides the game and asks for it back — but the canvas
 * is only hidden by CSS, so without this the minute went on running behind the
 * notice and a pair could lose its whole turn to somebody checking a message.
 */
const upright = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const followOrientation = (portrait: boolean): void => {
  for (const scene of game.scene.getScenes(true)) {
    if (portrait) scene.scene.pause();
    else scene.scene.resume();
  }
};
upright.addEventListener('change', (event) => followOrientation(event.matches));
if (upright.matches) followOrientation(true);

// Handle for the screenshot and smoke-test harness. It only exposes the game
// instance; the player never sees it and nothing in the game reads from it.
declare global {
  interface Window {
    __chubol?: { game: Phaser.Game };
  }
}
window.__chubol = { game };

/**
 * Registers the service worker so the game keeps working with no connection
 * once it has been added to a phone's home screen. It is generated at build
 * time, so there is nothing to register in development.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // An unavailable service worker only costs offline play, never the game.
    });
  });
}
