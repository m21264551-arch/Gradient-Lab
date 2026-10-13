import { describe, it, expect } from "vitest";
import { getObjective } from "./objectives";
import {
  displaySurface,
  landscapeGeometry,
  projectTracePoint,
} from "./landscape";
const objective = getObjective("bowl"),
  surface = displaySurface(objective);
describe("display geometry", () => {
  it.each([
    [940, 420],
    [358, 320],
  ])(
    "uses equal contour axis scales and an invertible click mapping at %s × %s",
    (w, h) => {
      const g = landscapeGeometry(objective, surface, w, h, "contour"),
        origin = g.project(0, 0),
        x = g.project(1, 0),
        y = g.project(0, 1);
      expect(x.x - origin.x).toBeCloseTo(origin.y - y.y, 10);
      const point = g.project(-1.3, 0.72);
      expect(g.unproject(point.x, point.y).x).toBeCloseTo(-1.3, 10);
      expect(g.unproject(point.x, point.y).y).toBeCloseTo(0.72, 10);
      expect(g.unproject(0, 0)).toBeNull();
    },
  );
  it("fits 3D uniformly, without changing projected shape when resized", () => {
    const a = landscapeGeometry(objective, surface, 940, 420, "3d"),
      b = landscapeGeometry(objective, surface, 358, 320, "3d");
    const p = { x: -1.2, y: 1, loss: objective.f(-1.2, 1) },
      q = { x: 0.5, y: -0.4, loss: objective.f(0.5, -0.4) };
    const ap = projectTracePoint(p, surface, a),
      aq = projectTracePoint(q, surface, a),
      bp = projectTracePoint(p, surface, b),
      bq = projectTracePoint(q, surface, b);
    expect((ap.x - aq.x) / a.scale).toBeCloseTo((bp.x - bq.x) / b.scale, 10);
    expect((ap.y - aq.y) / a.scale).toBeCloseTo((bp.y - bq.y) / b.scale, 10);
    for (const row of surface.rows)
      for (const p of row) {
        const v = b.project(p.x, p.y, p.z);
        expect(v.x).toBeGreaterThanOrEqual(27);
        expect(v.x).toBeLessThanOrEqual(331);
        expect(v.y).toBeGreaterThanOrEqual(27);
        expect(v.y).toBeLessThanOrEqual(293);
      }
  });
  it("uses the exact same height for surface samples and trace points", () => {
    const geometry = landscapeGeometry(objective, surface, 940, 420, "3d");
    for (const p of [
      surface.rows[0][0],
      surface.rows[20][30],
      surface.rows[59][59],
    ])
      expect(projectTracePoint(p, surface, geometry)).toEqual(
        geometry.project(p.x, p.y, p.z),
      );
    expect(surface.height(4)).toBeCloseTo(2 * surface.height(2), 10);
    const rosen = displaySurface(getObjective("rosenbrock"));
    expect(rosen.scaleLabel).toBe("log(1 + loss)");
  });
});
