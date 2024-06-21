import { describe, it, expect } from "vitest";
import {
  OBJECTIVES,
  DEFAULT_CONFIG,
  getObjective,
  simulateDescent,
  encodeExperiment,
  decodeExperiment,
} from "./objectives";
const run = (options = {}) =>
  simulateDescent({
    ...DEFAULT_CONFIG,
    objective: getObjective("bowl"),
    ...options,
  });
describe("objective mathematics", () => {
  it("analytic gradients agree with central finite differences", () => {
    for (const o of OBJECTIVES)
      for (const [x, y] of [
        [-0.7, 0.4],
        [1.1, -1.3],
        [0, 0],
      ]) {
        const h = 1e-5,
          g = o.grad(x, y);
        expect(g[0]).toBeCloseTo((o.f(x + h, y) - o.f(x - h, y)) / (2 * h), 5);
        expect(g[1]).toBeCloseTo((o.f(x, y + h) - o.f(x, y - h)) / (2 * h), 5);
      }
  });
  it("all marked minima are stationary and locally minimal", () => {
    for (const o of OBJECTIVES)
      for (const p of o.minima) {
        expect(Math.hypot(...o.grad(p.x, p.y))).toBeLessThan(1e-8);
        for (const [dx, dy] of [
          [0.001, 0],
          [-0.001, 0],
          [0, 0.001],
          [0, -0.001],
        ])
          expect(o.f(p.x + dx, p.y + dy)).toBeGreaterThan(o.f(p.x, p.y));
      }
  });
  it("keeps both saddle minima and identifies its origin as stationary", () => {
    const o = getObjective("saddle");
    expect(o.minima).toHaveLength(2);
    expect(run({ objective: o, startPoint: { x: 0, y: 0 } }).termination).toBe(
      "stationary",
    );
  });
});
describe("reference optimizer updates", () => {
  const o = {
    ...getObjective("bowl"),
    grad: (x, y) => [2 * x, 2 * y],
    f: (x, y) => x * x + y * y,
    start: { x: 1, y: 2 },
  };
  it("matches two hand-calculated GD updates", () => {
    const t = run({
      objective: o,
      startPoint: o.start,
      learningRate: 0.1,
      steps: 2,
    }).trace;
    expect(t[1].x).toBeCloseTo(0.8, 12);
    expect(t[2].x).toBeCloseTo(0.64, 12);
    expect(t[2].y).toBeCloseTo(1.28, 12);
  });
  it("matches heavy-ball velocity recurrence", () => {
    const t = run({
      objective: o,
      startPoint: o.start,
      optimizer: "momentum",
      learningRate: 0.1,
      momentum: 0.9,
      steps: 2,
    }).trace;
    expect(t[2].x).toBeCloseTo(0.46, 12);
    expect(t[2].y).toBeCloseTo(0.92, 12);
  });
  it("bias-corrects Adam and uses epsilon", () => {
    const t = run({
      objective: o,
      startPoint: o.start,
      optimizer: "adam",
      learningRate: 0.1,
      steps: 2,
    }).trace;
    expect(t[1].x).toBeCloseTo(1 - (0.1 * 2) / (2 + 1e-8), 12);
    const m = 0.9 * 0.2 + 0.1 * 1.8,
      v = 0.999 * 0.004 + 0.001 * 1.8 ** 2;
    expect(t[2].x).toBeCloseTo(
      0.9 -
        (0.1 * (m / (1 - 0.9 ** 2))) / (Math.sqrt(v / (1 - 0.999 ** 2)) + 1e-8),
      7,
    );
  });
  it("does not cap steps or project the result into the plot", () => {
    const t = run({
      objective: o,
      startPoint: { x: 2, y: 2 },
      learningRate: 1,
      steps: 2,
    }).trace;
    expect(t[1].x).toBe(-2);
    expect(t[0].dx).toBe(-4);
    const divergent = run({ learningRate: 1, steps: 220 });
    expect(divergent.trace.some((p) => Math.abs(p.x) > 2)).toBe(true);
    expect(divergent.termination).toBe("safety_limit");
  });
  it("preserves last valid state on numerical failure", () => {
    const result = run({
      objective: { ...o, f: (x) => (x === 1 ? 1 : Infinity) },
      startPoint: { x: 1, y: 2 },
    });
    expect(result.termination).toBe("numerical_failure");
    expect(result.trace).toHaveLength(1);
  });
  it("repeats seeded noise exactly", () => {
    expect(run({ noise: 0.2, seed: 3 })).toEqual(run({ noise: 0.2, seed: 3 }));
    expect(run({ noise: 0.2, seed: 4 })).not.toEqual(
      run({ noise: 0.2, seed: 3 }),
    );
  });
  it("round trips configuration and rejects invalid URLs", () => {
    expect(decodeExperiment(encodeExperiment(DEFAULT_CONFIG))).toEqual(
      DEFAULT_CONFIG,
    );
    expect(() => decodeExperiment('{"version":2}')).toThrow(/unsupported/);
    expect(() =>
      encodeExperiment({ ...DEFAULT_CONFIG, startPoint: { x: NaN, y: 0 } }),
    ).toThrow();
  });
});
