import { W, H, FONT, COLORS } from '../core/config.js';

export class BaseScene extends Phaser.Scene {
  addCover(key) {
    return this.add.image(0, 0, key).setDisplaySize(W, H).setOrigin(0, 0).setDepth(-10);
  }

  addVignette(alpha = 0.2) {
    const graphics = this.add.graphics().setDepth(2);
    graphics.fillStyle(0x190c08, alpha).fillRect(0, 0, W, 128).fillRect(0, H - 158, W, 158);
    return graphics;
  }

  ensureBackgroundMusic() {
    if (!this.cache.audio.exists('backgroundMusic')) return;
    let music = this.sound.get('backgroundMusic');
    if (!music) music = this.sound.add('backgroundMusic', { loop: true, volume: 0.12 });
    const startMusic = () => {
      if (!music.isPlaying) music.play({ loop: true, volume: 0.12 });
    };
    startMusic();
    if (!music.isPlaying) this.input.once('pointerdown', startMusic);
  }

  playNarration(key) {
    if (!this.cache.audio.exists(key)) return;
    this.narration = this.sound.add(key, { volume: 0.9 });
    this.narration.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!this.narration) return;
      this.narration.stop();
      this.narration.destroy();
      this.narration = null;
    });
  }

  typeText(x, y, copy, style = {}) {
    const text = this.add.text(x, y, '', {
      fontFamily: FONT, fontSize: '51px', color: COLORS.cream,
      align: 'center', wordWrap: { width: 1350 }, lineSpacing: 12,
      stroke: '#2b130c', strokeThickness: 9, ...style
    }).setOrigin(0.5).setDepth(5);
    let index = 0;
    const timer = this.time.addEvent({
      delay: 34, repeat: copy.length - 1,
      callback: () => text.setText(copy.slice(0, ++index))
    });
    text.setData('typeTimer', timer);
    return text;
  }

  actionButton(label, onClick) {
    const container = this.add.container(W - 203, H - 102).setDepth(20);
    const shadow = this.add.rectangle(8, 9, 285, 87, 0x2b1109, 0.45);
    const background = this.add.rectangle(0, 0, 285, 87, 0xc8752e).setStrokeStyle(5, 0xffdc75);
    const text = this.add.text(0, -3, label, {
      fontFamily: FONT, fontSize: '45px', color: COLORS.cream
    }).setOrigin(0.5);
    container.add([shadow, background, text]).setSize(285, 87).setInteractive({ useHandCursor: true });
    background.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    const activate = () => {
      if (this._transitioning) return;
      container.disableInteractive();
      background.disableInteractive();
      text.disableInteractive();
      container.setScale(0.96);
      onClick();
    };
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.06, duration: 100 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 100 }));
    container.on('pointerdown', activate);
    background.on('pointerdown', activate);
    text.on('pointerdown', activate);
    this.input.keyboard?.once('keydown-ENTER', activate);
    this.input.keyboard?.once('keydown-SPACE', activate);
    return container;
  }

  backButton(target) {
    const container = this.add.container(203, H - 102).setDepth(20);
    const shadow = this.add.rectangle(8, 9, 285, 87, 0x2b1109, 0.45);
    const background = this.add.rectangle(0, 0, 285, 87, 0x8f5428).setStrokeStyle(5, 0xffdc75);
    const text = this.add.text(0, -3, '‹  BACK', {
      fontFamily: FONT, fontSize: '45px', color: COLORS.cream
    }).setOrigin(0.5);
    container.add([shadow, background, text]).setSize(285, 87).setInteractive({ useHandCursor: true });
    background.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    const goBack = () => {
      if (this._transitioning) return;
      container.disableInteractive();
      background.disableInteractive();
      text.disableInteractive();
      container.setScale(0.96);
      this.stormTo(target);
    };
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.06, duration: 100 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 100 }));
    container.on('pointerdown', goBack);
    background.on('pointerdown', goBack);
    text.on('pointerdown', goBack);
    return container;
  }

  stormTo(target) {
    if (this._transitioning) return;
    this._transitioning = true;
    this.input.enabled = false;
    this.scene.launch('SandstormTransition', { from: this.scene.key, to: target });
    this.scene.bringToTop('SandstormTransition');
  }

  panel(y = 915, height = 225) {
    return this.add.rectangle(W / 2, y, 1545, height, 0x37170e, 0.86)
      .setStrokeStyle(5, 0xf4c35b, 0.9).setDepth(3);
  }
}

