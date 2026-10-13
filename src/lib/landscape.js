import { buildSurface } from "./objectives";
export const RUN_COLORS = ["#254f9c", "#b34828", "#6f4d8c"];
export const runLabel = (config) =>
  `${{ gd: "Gradient descent", momentum: "Momentum", adam: "Adam" }[config.optimizer]} · α ${Number(config.learningRate.toPrecision(4))}`;
// Display geometry only; optimizer traces are never modified here.
export function displaySurface(objective, resolution = 60) {
  const surface = buildSurface(objective, resolution);
  const linear = objective.id === "bowl";
  const transform = linear
    ? (loss) => loss
    : (loss) => Math.log1p(Math.max(0, loss));
  const values = surface.rows.flat().map((p) => transform(p.loss));
  const minimum = Math.min(
    ...values,
    ...objective.minima.map((p) => transform(objective.f(p.x, p.y))),
  );
  const maximum = Math.max(...values);
  const height = (loss) =>
    (transform(loss) - minimum) / Math.max(1e-9, maximum - minimum);
  return {
    rows: surface.rows.map((row) =>
      row.map((p) => ({ ...p, z: height(p.loss) })),
    ),
    height,
    scaleLabel: linear ? "loss (linear scale)" : "log(1 + loss)",
  };
}
export function landscapeGeometry(objective, surface, width, height, mode) {
  const [a, b] = objective.domain,
    pad = width < 480 ? 28 : 40;
  const inDomain = (p) =>
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= a &&
    p.x <= b &&
    p.y >= a &&
    p.y <= b;
  if (mode === "contour") {
    const scale = Math.min(width - 2 * pad, height - 2 * pad) / (b - a);
    const left = (width - scale * (b - a)) / 2,
      top = (height - scale * (b - a)) / 2;
    return {
      scale,
      inDomain,
      bounds: { left, top, side: scale * (b - a) },
      project: (x, y) => ({
        x: left + (x - a) * scale,
        y: top + (b - y) * scale,
      }),
      unproject: (x, y) => {
        const p = { x: a + (x - left) / scale, y: b - (y - top) / scale };
        return inDomain(p) ? p : null;
      },
    };
  }
  // Orthographic camera: 45° azimuth, 30° elevation, one uniform fit scale.
  const raw = (x, y, z) => {
    const nx = (2 * (x - a)) / (b - a) - 1,
      ny = (2 * (y - a)) / (b - a) - 1;
    return {
      x: (nx - ny) * Math.SQRT1_2,
      y: (nx + ny) * Math.SQRT1_2 * 0.5 - (z * 1.7 * Math.sqrt(3)) / 2,
    };
  };
  const points = surface.rows.flat().map((p) => raw(p.x, p.y, p.z));
  for (const x of [a, b]) for (const y of [a, b]) points.push(raw(x, y, 0));
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min(
    (width - pad * 2) / (maxX - minX),
    (height - pad * 2) / (maxY - minY),
  );
  const ox = width / 2 - ((minX + maxX) * scale) / 2,
    oy = height / 2 - ((minY + maxY) * scale) / 2;
  return {
    scale,
    inDomain,
    project: (x, y, z = 0) => {
      const p = raw(x, y, z);
      return { x: ox + p.x * scale, y: oy + p.y * scale };
    },
    unproject: () => null,
  };
}
export function projectTracePoint(point, surface, geometry) {
  return geometry.project(point.x, point.y, surface.height(point.loss));
}
