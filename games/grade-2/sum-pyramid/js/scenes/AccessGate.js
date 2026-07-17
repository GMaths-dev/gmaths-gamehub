import { FONT, ACCESS_DIGEST } from '../core/config.js';
import { BaseScene } from './BaseScene.js';

export class AccessGate extends BaseScene {
  constructor() { super('AccessGate'); }

  create() {
    this.addCover('accessBg');
    this.ensureBackgroundMusic();
    this._checkingPassword = false;
    this.passwordField = this.add.dom(960, 726).createFromHTML(`
      <input type="password" aria-label="Game password" autocomplete="current-password"
        placeholder="ENTER THE SECRET PASSWORD" maxlength="64" spellcheck="false"
        style="width:510px;height:66px;box-sizing:border-box;outline:0;
        border:3px solid #b97a2d;border-radius:18px;
        background:linear-gradient(180deg,rgba(255,225,154,.92),rgba(181,119,50,.92));
        color:#3a1b0c;font:25px 'Germania One',Georgia,serif;letter-spacing:1px;
        text-align:center;padding:5px 25px;caret-color:#54260d;
        box-shadow:0 4px 0 #5b2a13,0 8px 18px rgba(20,8,3,.55),
        inset 0 2px 0 rgba(255,244,198,.85),inset 0 -5px 10px rgba(85,39,13,.25);" />
    `).setDepth(10);
    const input = this.passwordField.node.querySelector('input');
    input.addEventListener('pointerdown', () => this.ensureBackgroundMusic());

    this.accessMessage = this.add.text(960, 814, '', {
      fontFamily: FONT, fontSize: '31px', color: '#ffd982',
      stroke: '#2b130c', strokeThickness: 6
    }).setOrigin(0.5).setDepth(11);

    const startButton = this.add.container(960, 930).setDepth(12).setSize(164, 164)
      .setInteractive({ useHandCursor: true });
    const buttonShadow = this.add.circle(7, 10, 77, 0x120906, 0.72);
    const outerRing = this.add.circle(0, 0, 76, 0x2f190f).setStrokeStyle(6, 0x9c6a31);
    const stoneFace = this.add.circle(0, -2, 64, 0x603820).setStrokeStyle(3, 0xb7833d);
    const startText = this.add.text(0, -3, 'START', {
      fontFamily: FONT, fontSize: '34px', color: '#e7c77e',
      stroke: '#3a190b', strokeThickness: 5
    }).setOrigin(0.5);
    startButton.add([buttonShadow, outerRing, stoneFace, startText]);
    startButton.on('pointerover', () => {
      stoneFace.setFillStyle(0x754728);
      this.tweens.add({ targets: startButton, scale: 1.06, duration: 120 });
    });
    startButton.on('pointerout', () => {
      stoneFace.setFillStyle(0x603820);
      this.tweens.add({ targets: startButton, scale: 1, duration: 120 });
    });
    startButton.on('pointerdown', () => this.submitPassword(input, startButton));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.submitPassword(input, startButton);
    });
    this.time.delayedCall(150, () => input.focus());
  }

  async submitPassword(input, startButton) {
    if (this._checkingPassword) return;
    this._checkingPassword = true;
    this.accessMessage.setText('CHECKING ACCESS…');
    try {
      const bytes = new TextEncoder().encode(input.value);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (actual === ACCESS_DIGEST) {
        input.value = '';
        this.passwordField.destroy();
        this.scene.start('Intro');
        return;
      }
      input.value = '';
      this.accessMessage.setText('THE PASSWORD IS NOT CORRECT');
      this.tweens.add({ targets: startButton, x: { from: 950, to: 970 }, duration: 55, yoyo: true, repeat: 3 });
      input.focus();
    } catch (_) {
      this.accessMessage.setText('PASSWORD CHECK IS NOT AVAILABLE');
    }
    this._checkingPassword = false;
  }
}
