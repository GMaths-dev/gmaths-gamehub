import { W, H, FONT, COLORS } from '../core/config.js';
import { BaseScene } from './BaseScene.js';

export class Intro extends BaseScene {
  constructor() { super('Intro'); }
  create() {
    this.addCover('introBg');
    this.ensureBackgroundMusic();
    this.add.rectangle(W / 2, H / 2, W, H, 0x1d0805, 0.08);
    this.add.image(80, 15, 'sumPyramidLogo').setOrigin(0, 0).setDisplaySize(210, 140).setDepth(7);
    this.typeText(960, 500, 'Long ago, there was a poor man in Egypt.', {
      fontSize: '72px', stroke: '#160a06', strokeThickness: 12,
      shadow: { offsetX: 7, offsetY: 7, color: '#000000', blur: 10, fill: true },
      wordWrap: { width: 1550 }
    });
    this.actionButton('NEXT  ›', () => this.stormTo('Command'));
    this.playNarration('voice1');
  }
}

export class Command extends BaseScene {
  constructor() { super('Command'); }
  create() {
    this.addCover('palaceBg');
    this.ensureBackgroundMusic();
    this.addVignette(0.12);
    this.add.image(1570, 610, 'pharaoh').setScale(0.353).setOrigin(0.5, 0.55);
    this.add.image(240, 930, 'architectCommand').setScale(0.323).setOrigin(0.5, 0.62);
    this.panel(903, 255);
    this.typeText(W / 2, 872,
      '“I want the best mathematician to build a great pyramid for me!\nEvery stone must follow the Rule of the Sum Pyramid.”',
      { fontSize: '47px', wordWrap: { width: 1410 } });
    this.actionButton('NEXT  ›', () => this.stormTo('Rule'));
    this.backButton('Intro');
    this.playNarration('voice2');
  }
}

export class Rule extends BaseScene {
  constructor() { super('Rule'); }
  create() {
    this.addCover('palaceBg');
    this.ensureBackgroundMusic();
    this.add.image(420, 665, 'architectThinking').setScale(0.331).setOrigin(0.5, 0.63);
    this.add.rectangle(1200, 525, 850, 535, 0xf8dfa2, 0.97)
      .setStrokeStyle(12, 0xb46b2b).setRotation(-0.012);
    this.add.text(1200, 315, 'THE RULE OF SUM PYRAMID', {
      fontFamily: FONT, fontSize: '50px', color: COLORS.red
    }).setOrigin(0.5);
    this.add.text(1200, 400, 'Each box equals the sum of\nthe two boxes directly below it.', {
      fontFamily: FONT, fontSize: '38px', color: COLORS.ink, align: 'center', lineSpacing: 7
    }).setOrigin(0.5);
    this.ruleBrick(1200, 535, '9');
    this.ruleBrick(1120, 593, '4');
    this.ruleBrick(1280, 593, '5');
    this.add.text(1200, 735, '4  +  5  =  9', {
      fontFamily: FONT, fontSize: '48px', color: COLORS.red
    }).setOrigin(0.5);
    this.actionButton('NEXT  ›', () => this.stormTo('CallToAction'));
    this.backButton('Command');
    this.playNarration('voice3');
  }

  ruleBrick(x, y, number) {
    this.add.image(x, y, 'brick').setDisplaySize(218, 114);
    this.add.text(x, y - 3, number, {
      fontFamily: FONT, fontSize: '54px', color: COLORS.ink
    }).setOrigin(0.5);
  }
}

export class CallToAction extends BaseScene {
  constructor() { super('CallToAction'); }
  create() {
    this.addCover('gameBg');
    this.ensureBackgroundMusic();
    this.add.rectangle(W / 2, H / 2, W, H, 0x7c4215, 0.06);
    const watcher = this.add.image(300, 590, 'architectWatching').setScale(0.3).setOrigin(0.5, 0.58);
    const workerPole = this.add.image(1100, 585, 'workerPole').setScale(0.45).setAlpha(0.88);
    const workerBrick = this.add.image(1320, 708, 'workerBrick').setScale(0.375).setAlpha(0.95);
    this.tweens.add({ targets: workerPole, x: 1350, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: workerBrick, x: 1580, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.inOut', flipX: true });
    this.tweens.add({ targets: watcher, y: 575, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.panel(924, 233);
    this.typeText(W / 2, 893,
      'Help the man and his team choose the correct stone for every empty place — and earn the Pharaoh’s reward!',
      { fontSize: '44px', wordWrap: { width: 1350 } });
    this.actionButton('START  ›', () => this.stormTo('Game'));
    this.backButton('Rule');
    this.playNarration('voice4');
  }
}

