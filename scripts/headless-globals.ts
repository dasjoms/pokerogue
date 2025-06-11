if (typeof globalThis.window === 'undefined') {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // Expose common globals used by Phaser
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;
  globalThis.Image = dom.window.Image;
  globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  // Phaser checks for these properties
  (globalThis.window as any).canvas = {};
  // Prevent errors when calling getContext
  globalThis.HTMLCanvasElement.prototype.getContext = () => null as any;
}

export {};
