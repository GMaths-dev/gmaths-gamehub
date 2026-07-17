import { W, H, FONT, COLORS } from '../core/config.js';
import { QUESTIONS } from '../data/questions.js';
import { BaseScene } from './BaseScene.js';

export class GameScene extends BaseScene {
  constructor() { super('Game'); }

  init(data = {}) {
    this.questionIndex = data.questionIndex ?? 0;
    this.correctPlacements = data.correctPlacements ?? 0;
  }

  create() {
    this.addCover('gameBg');
    this.ensureBackgroundMusic();
    this.selected = null;
    this.busy = false;
    this.solved = 0;
    this.add.rectangle(W / 2, 63, W, 126, 0x5c2e18, 0.82);
    this.add.image(77, -6, 'sumPyramidLogo').setOrigin(0, 0).setDisplaySize(210, 140);
    this.add.text(W / 2, 59, `QUESTION ${this.questionIndex + 1} / ${QUESTIONS.length}`, {
      fontFamily: FONT, fontSize: '36px', color: '#fff0a0', stroke: '#5d2d08', strokeThickness: 5
    }).setOrigin(0.5);
    this.status = this.add.text(W - 53, 59, 'Choose a stone, then choose its place.', {
      fontFamily: FONT, fontSize: '28px', color: '#ffd96c'
    }).setOrigin(1, 0.5);
    this.add.rectangle(W / 2, 1028, W, 105, 0x3e1b0e, 0.72);

    this.puzzle = this.getPuzzle(this.questionIndex);
    this.slots = [];
    this.drawPyramid();
    this.drawPool();
    this.worker = this.add.image(-390, 720, 'workerBrick').setScale(0.345).setDepth(30);
    this.carried = this.add.container(-390, 630).setDepth(32).setVisible(false);
    this.carried.add([
      this.add.image(0, 0, 'brick').setDisplaySize(318, 174),
      this.add.text(0, -2, '', { fontFamily: FONT, fontSize: '58px', color: COLORS.ink }).setOrigin(0.5)
    ]);
  }

  getPuzzle(index) {
    const spec = QUESTIONS[index];
    const hidden = [];
    spec.rows.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
      if (!spec.visible[rowIndex][colIndex]) hidden.push(value);
    }));
    return {
      rows: spec.rows.map(row => [...row]),
      visible: spec.visible.map(row => [...row]),
      hidden
    };
  }

  drawPyramid() {
    const positions = [
      { y: 695, count: 3 }, { y: 495, count: 2 }, { y: 295, count: 1 }
    ];
    positions.forEach((position, row) => {
      const gap = 330;
      const start = W / 2 - ((position.count - 1) * gap) / 2;
      for (let column = 0; column < position.count; column++) {
        const x = start + column * gap;
        const value = this.puzzle.rows[row][column];
        if (this.puzzle.visible[row][column]) this.makeFilledBrick(x, position.y, value, 1);
        else this.makeSlot(x, position.y, value);
      }
    });
  }

  makeFilledBrick(x, y, value, alpha = 1) {
    const container = this.add.container(x, y).setDepth(8).setAlpha(alpha);
    container.add([
      this.add.image(0, 0, 'brick').setDisplaySize(318, 174),
      this.add.text(0, -2, String(value), {
        fontFamily: FONT, fontSize: '58px', color: COLORS.ink
      }).setOrigin(0.5)
    ]);
    return container;
  }

  makeSlot(x, y, answer) {
    const container = this.add.container(x, y).setDepth(7).setSize(318, 174)
      .setInteractive({ useHandCursor: true });
    const shape = this.add.image(0, 0, 'brick').setDisplaySize(318, 174).setTint(0xe8c17b).setAlpha(0.48);
    const questionMark = this.add.text(0, -2, '?', {
      fontFamily: FONT, fontSize: '58px', color: '#8b5524'
    }).setOrigin(0.5);
    container.add([shape, questionMark]);
    container.setData({ answer, solved: false, shape, q: questionMark });
    container.on('pointerover', () => !container.getData('solved') && shape.setTint(0xffd568).setAlpha(0.72));
    container.on('pointerout', () => !container.getData('solved') && shape.setTint(0xe8c17b).setAlpha(0.48));
    container.on('pointerdown', () => this.trySlot(container));
    this.slots.push(container);
  }

  drawPool() {
    const answers = Phaser.Utils.Array.Shuffle([...this.puzzle.hidden]);
    const forbidden = new Set(answers);
    const distractors = [];
    while (distractors.length < 2) {
      const number = Phaser.Math.Between(1, 35);
      if (!forbidden.has(number) && !distractors.includes(number)) distractors.push(number);
    }
    const values = Phaser.Utils.Array.Shuffle([...answers, ...distractors]);
    const gap = 370;
    const startX = W / 2 - ((values.length - 1) * gap) / 2;
    values.forEach((value, index) => {
      const x = startX + index * gap;
      const y = 905;
      const container = this.add.container(x, y).setDepth(15).setSize(318, 174)
        .setInteractive({ useHandCursor: true });
      const image = this.add.image(0, 0, 'brick').setDisplaySize(318, 174);
      const text = this.add.text(0, -2, String(value), {
        fontFamily: FONT, fontSize: '58px', color: COLORS.ink
      }).setOrigin(0.5);
      container.add([image, text]);
      container.setData({ value, img: image, homeX: x, homeY: y, used: false });
      container.on('pointerdown', () => this.selectBrick(container));
      container.on('pointerover', () => !container.getData('used') && this.tweens.add({ targets: container, y: y - 11, duration: 100 }));
      container.on('pointerout', () => !container.getData('used') && container !== this.selected && this.tweens.add({ targets: container, y, duration: 100 }));
    });
  }

  selectBrick(brick) {
    if (this.busy || brick.getData('used')) return;
    if (this.selected && this.selected !== brick) {
      this.selected.setScale(1).setAlpha(1).setY(this.selected.getData('homeY'));
    }
    this.selected = brick;
    brick.setScale(1.1).setAlpha(0.92).setY(brick.getData('homeY') - 15);
    this.status.setText(`Stone ${brick.getData('value')} selected — now choose an empty place.`);
  }

  trySlot(slot) {
    if (this.busy || slot.getData('solved')) return;
    if (!this.selected) {
      this.status.setText('First, choose a numbered stone from the pool.');
      this.tweens.add({ targets: slot, scale: 1.08, duration: 90, yoyo: true, repeat: 1 });
      return;
    }
    this.busy = true;
    const brick = this.selected;
    const value = brick.getData('value');
    brick.setVisible(false);
    this.carried.list[1].setText(String(value));
    this.carried.setVisible(true);
    const targetX = slot.x - 233;
    const targetY = slot.y + 173;
    this.tweens.add({
      targets: [this.worker, this.carried], x: targetX, duration: 850, ease: 'Sine.inOut',
      onUpdate: tween => {
        const bob = Math.sin(tween.progress * Math.PI * 8) * 6;
        this.worker.y = targetY + bob;
        this.carried.y = targetY - 93 + bob;
      },
      onComplete: () => value === slot.getData('answer')
        ? this.correctPlacement(slot, brick, value)
        : this.incorrectPlacement(slot, brick)
    });
  }

  correctPlacement(slot, brick, value) {
    this.correctPlacements++;
    this.playFeedback(true);
    slot.getData('shape').setVisible(false);
    slot.getData('q').setVisible(false);
    slot.setData('solved', true).disableInteractive();
    const placed = this.makeFilledBrick(slot.x, slot.y, value, 0).setScale(0.7);
    this.tweens.add({ targets: placed, alpha: 1, scale: 1, duration: 360, ease: 'Back.out' });
    brick.setData('used', true).destroy();
    this.selected = null;
    this.solved++;
    this.status.setText('Correct! The two stones below add to this number.');
    this.returnWorker(() => {
      this.busy = false;
      if (this.solved === this.slots.length) this.completeQuestion();
    });
  }

  incorrectPlacement(slot, brick) {
    this.playFeedback(false);
    this.status.setText('Not quite — add the two stones directly below that place.');
    this.cameras.main.shake(180, 0.004);
    this.tweens.add({ targets: slot, angle: { from: -3, to: 3 }, duration: 55, yoyo: true, repeat: 3 });
    this.returnWorker(() => {
      brick.setVisible(true).setAlpha(1).setScale(1)
        .setPosition(brick.getData('homeX'), brick.getData('homeY'));
      this.selected = null;
      this.busy = false;
    });
  }

  returnWorker(done) {
    this.tweens.add({
      targets: [this.worker, this.carried], x: -405, duration: 700, ease: 'Sine.in',
      onComplete: () => { this.carried.setVisible(false); done(); }
    });
  }

  playFeedback(correct) {
    const key = correct
      ? (this.correctPlacements >= 2 ? 'feedbackPerfect' : 'feedbackKeepGoing')
      : 'feedbackAgain';
    if (this.cache.audio.exists(key)) { this.sound.play(key, { volume: 0.9 }); return; }
    try {
      const context = this.sound.context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = correct ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(correct ? 520 : 180, context.currentTime);
      if (correct) oscillator.frequency.exponentialRampToValueAtTime(780, context.currentTime + 0.16);
      gain.gain.setValueAtTime(0.09, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
    } catch (_) { /* Audio feedback is decorative. */ }
  }

  completeQuestion() {
    this.busy = true;
    if (this.questionIndex < QUESTIONS.length - 1) {
      this.status.setText(`Question ${this.questionIndex + 1} complete! Preparing the next pyramid...`);
      this.time.delayedCall(900, () => this.scene.restart({
        questionIndex: this.questionIndex + 1,
        correctPlacements: this.correctPlacements
      }));
      return;
    }
    this.win();
  }

  win() {
    this.busy = true;
    this.time.delayedCall(350, () => {
      const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x281108, 0).setDepth(50);
      this.tweens.add({ targets: shade, fillAlpha: 0.82, duration: 500 });
      const hero = this.add.image(480, 655, 'architectReward').setScale(0.34).setDepth(52).setAlpha(0);
      const chest = this.add.image(1440, 680, 'treasure').setScale(0.135).setDepth(52).setAlpha(0);
      const title = this.add.text(W / 2, 165, 'THE PYRAMID IS COMPLETE!', {
        fontFamily: FONT, fontSize: '83px', color: '#ffdc6b',
        stroke: '#602419', strokeThickness: 12
      }).setOrigin(0.5).setDepth(54).setScale(0.6).setAlpha(0);
      // Keep the reward message 80px right of the screen center so it does not
      // overlap the architect artwork.
      const copy = this.add.text(W / 2 + 450, 479, 'The Pharaoh rewards his master mathematician.', {
        fontFamily: FONT, fontSize: '42px', color: COLORS.cream, align: 'center'
      }).setOrigin(0.5).setDepth(54).setAlpha(0);
      this.tweens.add({ targets: [hero, chest, copy], alpha: 1, duration: 650, delay: 250 });
      this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 650, ease: 'Back.out', delay: 100 });
      this.tweens.add({ targets: chest, y: 660, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }
}
