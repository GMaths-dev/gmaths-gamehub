import { W, FONT, COLORS } from '../core/config.js';

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }

  preload() {
    this.cameras.main.setBackgroundColor('#341b12');
    this.add.text(W / 2, 375, 'Preparing the royal expedition…', {
      fontFamily: FONT, fontSize: '54px', color: COLORS.cream
    }).setOrigin(0.5);
    const frame = this.add.rectangle(W / 2, 510, 975, 57, 0x1b0e09, 0.7).setStrokeStyle(5, 0xf7c65b);
    const bar = this.add.rectangle(W / 2 - 472, 510, 0, 36, 0xf7c65b).setOrigin(0, 0.5);
    const percent = this.add.text(W / 2, 608, '0%', {
      fontFamily: FONT, fontSize: '39px', color: '#f7c65b'
    }).setOrigin(0.5);
    this.load.on('progress', value => {
      bar.width = 945 * value;
      percent.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on('complete', () => frame.setStrokeStyle(3, 0xffffff));

    const assets = 'assets/';
    this.load.image('introBg', assets + 'Mở đầu.png');
    this.load.image('palaceBg', assets + 'Back cung điện.png');
    this.load.image('gameBg', assets + 'Back Game.png');
    this.load.image('pharaoh', assets + 'Pharaoh.png');
    this.load.image('architectThinking', assets + 'KTS suy tư.png');
    this.load.image('architectWatching', assets + 'KTS xem thợ.png');
    this.load.image('architectCommand', assets + 'KTS Nhận lệnh.png');
    this.load.image('architectReward', assets + 'KTS nhận thưởng.png');
    this.load.image('workerPole', assets + 'Thợ đeo gánh.png');
    this.load.image('workerBrick', assets + 'Thợ chở gạch.png');
    this.load.image('brick', assets + 'Gạch.png');
    this.load.image('treasure', assets + 'Kho báu.png');
    this.load.image('sumPyramidLogo', assets + 'sum-pyramid.png');
    this.load.image('accessBg', assets + 'intro-back.png');
    this.load.audio('backgroundMusic', assets + 'background_music.mp3');
    this.load.audio('voice1', assets + 'voice_1.mp3');
    this.load.audio('voice2', assets + 'voice_2.mp3');
    this.load.audio('voice3', assets + 'voice_3.mp3');
    this.load.audio('voice4', assets + 'voice_4.mp3');
    this.load.audio('feedbackPerfect', assets + 'feedback_perfect.mp3');
    this.load.audio('feedbackAgain', assets + 'feedback_again.mp3');
    this.load.audio('feedbackKeepGoing', assets + 'feedback_keepgoing.mp3');
  }

  create() { this.scene.start('AccessGate'); }
}
