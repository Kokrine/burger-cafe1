// აგენერირებს ყველა SVG ასეტს public/assets-ში + manifest.json + tokens.css.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, saveManifest, writeTokensCss } from './assets/lib.mjs';
import { buildCharacters } from './assets/characters.mjs';
import { buildFood } from './assets/food.mjs';
import { buildFurniture } from './assets/furniture.mjs';
import { buildEquipment } from './assets/equipment.mjs';
import { buildIcons } from './assets/icons.mjs';
import { buildBench } from './assets/bench.mjs';

// ძველი ფაილები წავშალოთ, რომ გადარქმეული ასეტები არ დარჩეს.
const out = path.join(ROOT, 'public/assets');
if (fs.existsSync(out)) for (const f of fs.readdirSync(out)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(out, f));

writeTokensCss();
buildFurniture();
buildEquipment();
buildFood();
buildIcons();
buildBench();
buildCharacters();
const count = saveManifest();
console.log(`✔ ${count} SVG ასეტი შეიქმნა public/assets-ში`);

// აპის ხატულები (PNG) — იგივე SVG სტილით
await import('./build-icons.mjs');
