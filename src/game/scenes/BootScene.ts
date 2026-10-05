// ჩატვირთვა: ყველა SVG ერთხელ (მზარეულები — საჭიროებისამებრ), პროგრესის ზოლით.
import Phaser from 'phaser';
import tokens from '../../design/tokens.json';
import { assetUrl, getManifest } from '../../core/assets';
import { S } from '../../i18n/strings.ka';
import { R, VIEW } from '../game';
import { bus } from '../../core/bus';

export const DEFAULT_CHEF = 'chef_girl_ponytail_s1_red';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const cam = this.cameras.main;
    cam.setZoom(R).centerOn(VIEW.w / 2, VIEW.h / 2);
    const ink = Phaser.Display.Color.HexStringToColor(tokens.color.ink).color;
    const fill = Phaser.Display.Color.HexStringToColor(tokens.color.primary).color;
    const W = 600, H = 34, x = VIEW.w / 2 - W / 2, y = VIEW.h / 2;
    const g = this.add.graphics();
    const label = this.add.text(VIEW.w / 2, y - 50, S.loading, {
      fontFamily: tokens.font.family.replace(/'/g, ''), fontSize: '34px', fontStyle: '900', color: tokens.color.ink,
    }).setOrigin(0.5).setResolution(R);
    const draw = (f: number) => {
      g.clear();
      g.fillStyle(0xffffff, 1).fillRoundedRect(x, y, W, H, H / 2);
      g.fillStyle(fill, 1).fillRoundedRect(x, y, Math.max(H, W * f), H, H / 2);
      g.lineStyle(5, ink, 1).strokeRoundedRect(x, y, W, H, H / 2);
    };
    draw(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { g.destroy(); label.destroy(); });

    for (const key of Object.keys(getManifest())) {
      if (key.startsWith('chef_') && key !== DEFAULT_CHEF) continue;
      this.load.svg(key, assetUrl(key), { scale: R });
    }
  }

  create() {
    bus.emit('assets-ready');
    this.scene.start('cafe');
  }
}
