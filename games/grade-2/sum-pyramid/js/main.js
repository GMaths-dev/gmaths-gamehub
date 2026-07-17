import { W, H } from './core/config.js';
import { Boot } from './scenes/Boot.js';
import { Preloader } from './scenes/Preloader.js';
import { AccessGate } from './scenes/AccessGate.js';
import { Intro, Command, Rule, CallToAction } from './scenes/StoryScenes.js';
import { GameScene } from './scenes/GameScene.js';
import { SandstormTransition } from './scenes/SandstormTransition.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#120b09',
  render: { antialias: true, pixelArt: false, roundPixels: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { disableWebAudio: false },
  dom: { createContainer: true },
  scene: [
    Boot,
    Preloader,
    AccessGate,
    Intro,
    Command,
    Rule,
    CallToAction,
    GameScene,
    SandstormTransition
  ]
};

window.sumPyramidGame = new Phaser.Game(config);
