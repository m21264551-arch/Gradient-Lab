// The viewport is a display choice. It never clips an optimizer update.
export const OBJECTIVES = [
  {
    id: "rosenbrock",
    name: "Rosenbrock (2D)",
    description:
      "A curved valley: progress along it can be much slower than progress across it.",
    domain: [-2, 2],
    start: { x: -1.42, y: 1.34 },
    minima: [{ x: 1, y: 1 }],
    defaultLearningRate: 0.001,
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  },
  {
    id: "bowl",
    name: "Elliptic Bowl",
    description:
      "A convex quadratic with different curvature along the two axes.",
    domain: [-2, 2],
    start: { x: -1.58, y: 1.45 },
    minima: [{ x: 0.25, y: -0.45 }],
    defaultLearningRate: 0.08,
    f: (x, y) => 1.1 * (x - 0.25) ** 2 + 0.42 * (y + 0.45) ** 2,
    grad: (x, y) => [2.2 * (x - 0.25), 0.84 * (y + 0.45)],
  },
  {
    id: "saddle",
    name: "Saddle + Walls",
    description:
      "A stationary saddle at the origin and two equally good minima.",
    domain: [-2, 2],
    start: { x: -1.2, y: 1.18 },
    minima: [
      { x: 0, y: Math.sqrt(5 / 3) },
      { x: 0, y: -Math.sqrt(5 / 3) },
    ],
    defaultLearningRate: 0.035,
    f: (x, y) =>
      0.18 * x ** 4 + 0.18 * y ** 4 + 0.62 * x * x - 0.6 * y * y + 0.55,
    grad: (x, y) => [0.72 * x ** 3 + 1.24 * x, 0.72 * y ** 3 - 1.2 * y],
  },
  {
    id: "ripple",
    name: "Ripple Basin",
    description:
      "A rippled surface with local traps. The marker identifies the global minimum.",
    domain: [-2, 2],
    start: { x: -1.55, y: -1.15 },
    minima: [{ x: rippleMinimum(), y: 0 }],
    defaultLearningRate: 0.035,
    f: (x, y) =>
      0.2 * (x * x + y * y) +
      0.32 * Math.sin(2.8 * x) * Math.cos(2.3 * y) +
      0.32,
    grad: (x, y) => [
      0.4 * x + 0.896 * Math.cos(2.8 * x) * Math.cos(2.3 * y),
      0.4 * y - 0.736 * Math.sin(2.8 * x) * Math.sin(2.3 * y),
    ],
  },
];
function rippleMinimum() {
  let a = -0.6,
    b = -0.4;
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    if (0.4 * m + 0.896 * Math.cos(2.8 * m) > 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}
export const OPTIMIZERS = [
  { id: "gd", name: "Gradient Descent" },
  { id: "momentum", name: "Momentum (Heavy-Ball)" },
  { id: "adam", name: "Adam" },
];
export const DEFAULT_CONFIG = {
  version: 1,
  objectiveId: "bowl",
  optimizer: "gd",
  learningRate: 0.08,
  momentum: 0.9,
  noise: 0,
  seed: 173,
  startPoint: { x: -1.58, y: 1.45 },
  steps: 220,
};
export function getObjective(id) {
  return OBJECTIVES.find((o) => o.id === id) ?? OBJECTIVES[1];
}
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let v = state;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
export function validateConfig(value) {
  if (!value || value.version !== 1)
    throw new Error("This experiment URL uses an unsupported version.");
  if (
    !OBJECTIVES.some((o) => o.id === value.objectiveId) ||
    !OPTIMIZERS.some((o) => o.id === value.optimizer)
  )
    throw new Error("Unknown objective or optimizer.");
  for (const [key, min, max] of [
    ["learningRate", 1e-5, 1],
    ["momentum", 0, 0.999],
    ["noise", 0, 0.3],
    ["steps", 1, 2000],
    ["seed", 0, 4294967295],
  ])
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max)
      throw new Error(`Invalid ${key}.`);
  if (!Number.isInteger(value.steps) || !Number.isInteger(value.seed))
    throw new Error("Steps and seed must be integers.");
  if (
    !value.startPoint ||
    !Number.isFinite(value.startPoint.x) ||
    !Number.isFinite(value.startPoint.y) ||
    Math.max(Math.abs(value.startPoint.x), Math.abs(value.startPoint.y)) > 10
  )
    throw new Error(
      "Starting coordinates must be finite and between −10 and 10.",
    );
  return { ...value, startPoint: { ...value.startPoint } };
}
export function encodeExperiment(config) {
  return JSON.stringify(validateConfig(config));
}
export function decodeExperiment(text) {
  return validateConfig(JSON.parse(text));
}
export function simulateDescent({
  objective = getObjective("bowl"),
  optimizer = "gd",
  learningRate = 0.08,
  momentum = 0.9,
  noise = 0,
  seed = 173,
  startPoint = objective.start,
  steps = 220,
}) {
  const random = seededRandom(seed);
  let { x, y } = startPoint;
  let vx = 0,
    vy = 0,
    mx = 0,
    my = 0,
    rx = 0,
    ry = 0;
  const trace = [];
  let termination = "iteration_limit";
  let attemptedIteration = 0;
  for (let iteration = 0; iteration <= steps; iteration++) {
    attemptedIteration = iteration;
    const [gradX, gradY] = objective.grad(x, y),
      loss = objective.f(x, y),
      gradNorm = Math.hypot(gradX, gradY);
    if (![x, y, loss, gradX, gradY, gradNorm].every(Number.isFinite)) {
      termination = "numerical_failure";
      break;
    }
    if (Math.max(Math.abs(x), Math.abs(y)) > 1e6 || Math.abs(loss) > 1e12) {
      termination = "safety_limit";
      break;
    }
    const point = { iteration, x, y, loss, gradX, gradY, gradNorm };
    trace.push(point);
    if (noise === 0 && gradNorm < 1e-8) {
      termination = "stationary";
      break;
    }
    if (iteration === steps) break;
    // Independent uniform noise U(-sigma, sigma), added to each gradient component.
    const gx = gradX + (random() * 2 - 1) * noise,
      gy = gradY + (random() * 2 - 1) * noise;
    let dx, dy;
    if (optimizer === "adam") {
      const beta1 = momentum,
        beta2 = 0.999,
        t = iteration + 1;
      mx = beta1 * mx + (1 - beta1) * gx;
      my = beta1 * my + (1 - beta1) * gy;
      rx = beta2 * rx + (1 - beta2) * gx * gx;
      ry = beta2 * ry + (1 - beta2) * gy * gy;
      dx =
        (-learningRate * (mx / (1 - beta1 ** t))) /
        (Math.sqrt(rx / (1 - beta2 ** t)) + 1e-8);
      dy =
        (-learningRate * (my / (1 - beta1 ** t))) /
        (Math.sqrt(ry / (1 - beta2 ** t)) + 1e-8);
    } else if (optimizer === "momentum") {
      vx = momentum * vx - learningRate * gx;
      vy = momentum * vy - learningRate * gy;
      dx = vx;
      dy = vy;
    } else {
      dx = -learningRate * gx;
      dy = -learningRate * gy;
    }
    Object.assign(point, { noisyGradX: gx, noisyGradY: gy, dx, dy });
    x += dx;
    y += dy;
  }
  return {
    trace,
    termination,
    attemptedIteration,
    diagnostics: {
      coordinateLimit: 1e6,
      lossLimit: 1e12,
      noiseDistribution: "Uniform(-sigma, sigma), independent by axis and step",
      beta2: 0.999,
      epsilon: 1e-8,
    },
  };
}
export function summarizeRun(trace, index, objective) {
  const current = trace[Math.min(index, trace.length - 1)];
  if (!current)
    return {
      status: "Numerical failure",
      bestLoss: null,
      minimumDistance: null,
      tone: "danger",
    };
  const minimumDistance = Math.min(
    ...objective.minima.map((p) =>
      Math.hypot(current.x - p.x, current.y - p.y),
    ),
  );
  return {
    status:
      index === 0
        ? "Ready"
        : minimumDistance < 1e-4
          ? "Near known minimum"
          : current.gradNorm < 1e-8
            ? "Stationary"
            : current.loss > trace[0].loss
              ? "Loss increased"
              : "Loss decreased",
    minimumDistance,
    bestLoss: Math.min(...trace.slice(0, index + 1).map((p) => p.loss)),
    tone: current.loss > trace[0].loss ? "warning" : "positive",
  };
}
export function buildSurface(objective, resolution = 48) {
  let minLog = Infinity,
    maxLog = -Infinity;
  const rows = Array.from({ length: resolution }, (_, j) =>
    Array.from({ length: resolution }, (_, i) => {
      const [a, b] = objective.domain,
        x = a + (i / (resolution - 1)) * (b - a),
        y = a + (j / (resolution - 1)) * (b - a),
        loss = objective.f(x, y),
        logLoss = Math.log1p(Math.max(0, loss));
      minLog = Math.min(minLog, logLoss);
      maxLog = Math.max(maxLog, logLoss);
      return { x, y, loss, logLoss, z: 0 };
    }),
  );
  for (const row of rows)
    for (const point of row)
      point.z = (point.logLoss - minLog) / Math.max(1e-9, maxLog - minLog);
  return { rows, minLog, maxLog, resolution };
}
