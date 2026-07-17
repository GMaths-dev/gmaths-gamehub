import { W, H } from '../core/config.js';

export class SandstormTransition extends Phaser.Scene {
  constructor() { super('SandstormTransition'); }
  init(data) { this.from = data.from; this.to = data.to; }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    const storm = this.add.rectangle(W * 1.65, H / 2, W * 1.25, H * 1.35, 0xdba632, 0.97)
      .setDepth(100).setAngle(-2);
    const grit = this.game.renderer.type === Phaser.WEBGL
      ? this.add.particles(W * 1.03, H / 2, 'dust', {
          x: { min: -150, max: 180 }, y: { min: -H / 2, max: H / 2 },
          lifespan: { min: 500, max: 760 }, speedX: { min: -620, max: -280 },
          speedY: { min: -90, max: 90 }, scale: { start: 4, end: 1 },
          alpha: { start: 0.82, end: 0 }, tint: [0xf7d06a, 0xc48b2c, 0x8f5b20],
          maxParticles: 36, frequency: 110, quantity: 1, blendMode: 'NORMAL'
        }).setDepth(101)
      : this.add.rectangle(W * 1.03, H / 2, 210, H * 1.2, 0xf1c456, 0.55).setDepth(101);

    this.tweens.add({
      targets: [storm, grit], x: `-=${W * 1.15}`, duration: 720, ease: 'Cubic.inOut',
      onComplete: () => {
        if (this.scene.manager.isActive(this.from)) this.scene.manager.stop(this.from);
        this.scene.manager.start(this.to);
        this.scene.bringToTop('SandstormTransition');
        this.tweens.add({
          targets: [storm, grit], x: `-=${W * 1.5}`, duration: 760, ease: 'Cubic.inOut',
          onComplete: () => this.scene.stop()
        });
      }
    });
  }
}

