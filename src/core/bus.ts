// პატარა მოვლენების არხი UI-სა და Phaser-ის სცენას შორის.
type Handler = (...args: any[]) => void;

class Bus {
  private map = new Map<string, Set<Handler>>();
  on(ev: string, h: Handler) {
    if (!this.map.has(ev)) this.map.set(ev, new Set());
    this.map.get(ev)!.add(h);
  }
  off(ev: string, h: Handler) {
    this.map.get(ev)?.delete(h);
  }
  emit(ev: string, ...args: unknown[]) {
    for (const h of this.map.get(ev) ?? []) h(...args);
  }
}

export const bus = new Bus();
