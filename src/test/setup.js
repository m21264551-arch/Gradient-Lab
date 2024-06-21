import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

let reducedMotion = true;

globalThis.__setReducedMotion = (value) => {
  reducedMotion = value;
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

globalThis.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(element) {
    this.callback([
      {
        contentRect: {
          width: element.clientWidth || 640,
          height: element.clientHeight || 560,
        },
      },
    ]);
  }

  disconnect() {}
};

const canvasContext = {
  rect: vi.fn(),
  clip: vi.fn(),
  setLineDash: vi.fn(),
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  measureText: vi.fn((text) => ({ width: String(text).length * 7 })),
  moveTo: vi.fn(),
  restore: vi.fn(),
  roundRect: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  set fillStyle(_value) {},
  set font(_value) {},
  set globalAlpha(_value) {},
  set lineCap(_value) {},
  set lineJoin(_value) {},
  set lineWidth(_value) {},
  set strokeStyle(_value) {},
  set textAlign(_value) {},
  set textBaseline(_value) {},
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  writable: true,
  value: vi.fn(() => canvasContext),
});

beforeEach(() => {
  reducedMotion = true;
  vi.restoreAllMocks();
});
