// აპის ხატულები: SVG → PNG (iPhone apple-touch-icon, Android/PWA 192 და 512, maskable).
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ROOT } from './assets/lib.mjs';
import { appIconSvg } from './assets/icons.mjs';

const out = path.join(ROOT, 'public/icons');
fs.mkdirSync(out, { recursive: true });

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
const targets = [
  ['apple-touch-icon.png', 'square', 180],
  ['icon-192.png', 'round', 192],
  ['icon-512.png', 'round', 512],
  ['icon-maskable-512.png', 'maskable', 512],
];
for (const [file, shape, size] of targets) fs.writeFileSync(path.join(out, file), png(appIconSvg(shape), size));
fs.writeFileSync(path.join(out, 'icon.svg'), appIconSvg('round'));
console.log(`✔ ${targets.length} PNG ხატულა შეიქმნა public/icons-ში`);
