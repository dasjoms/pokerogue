import { JSDOM } from 'jsdom';

if (typeof globalThis.window === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // Expose common globals used by Phaser
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, enumerable: true, writable: true });
  globalThis.Image = dom.window.Image;
  globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  globalThis.Element = dom.window.Element as any;
  globalThis.screen = { width: 0, height: 0 } as any;
  globalThis.FontFace = class {
    constructor() {}
    load() {
      return Promise.resolve(this);
    }
  } as any;
  // Phaser checks for these properties
  (globalThis.window as any).canvas = {};
  // Prevent errors when calling getContext
  globalThis.HTMLCanvasElement.prototype.getContext = () => ({
    fillStyle: null,
    strokeStyle: null,
    font: '',
    canvas: {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    getImageData: () => ({ data: [0, 0, 0, 0] }),
    putImageData: () => {},
    drawImage: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    measureText: () => ({ width: 0 }),
    fillText: () => {},
    setTransform: () => {},
    getContextAttributes: () => ({}),
  }) as any;
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    } as any;
  }

  // Filter noisy asset warnings when running in headless mode
  const assetWarningPatterns = [
    /Texture ".*" not found/i,
    /variant icon does not exist/i,
  ];

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args[0];
    if (typeof msg === 'string' && assetWarningPatterns.some(p => p.test(msg))) {
      return;
    }
    originalWarn(...args);
  };

  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const msg = args[0];
    if (typeof msg === 'string' && assetWarningPatterns.some(p => p.test(msg))) {
      return;
    }
    originalLog(...args);
  };
}

export {};
