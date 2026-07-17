export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xf4c45d, 1).fillCircle(6, 6, 6);
    graphics.generateTexture('dust', 12, 12);
    graphics.destroy();
    this.scene.start('Preloader');
  }
}

