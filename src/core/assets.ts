// SVG ასეტების მანიფესტი (გენერირდება scripts/build-assets.mjs-ით).
import type { ChefLook } from './types';

export interface AssetEntry {
  file: string;
  w: number;
  h: number;
  anchor: [number, number];
  kind?: string;
  footprint?: [number, number];
  height?: number;
  slots?: [number, number][];
  steam?: [number, number][];
  stack?: number;
}
export type Manifest = Record<string, AssetEntry>;

const BASE = import.meta.env.BASE_URL;
export const assetUrl = (key: string) => `${BASE}assets/${key}.svg`;

let manifest: Manifest | null = null;
export async function loadManifest(): Promise<Manifest> {
  if (!manifest) manifest = (await (await fetch(`${BASE}assets/manifest.json`)).json()) as Manifest;
  return manifest;
}
export const getManifest = (): Manifest => {
  if (!manifest) throw new Error('manifest not loaded');
  return manifest;
};

export const chefKey = (c: ChefLook) => `chef_${c.gender}_${c.style}_${c.skin}_${c.hair}`;

export const CUSTOMER_IDS = ['nino', 'vano', 'ana', 'dato', 'tamari', 'luka'] as const;
export type CustomerId = (typeof CUSTOMER_IDS)[number];
