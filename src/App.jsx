import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  OBJECTIVES,
  OPTIMIZERS,
  getObjective,
  simulateDescent,
  summarizeRun,
  encodeExperiment,
  decodeExperiment,
  seededRandom,
} from "./lib/objectives";
import LandscapeCanvas from "./components/LandscapeCanvas";
import LearningGuide from "./components/LearningGuide";
import { RUN_COLORS as COLORS, runLabel } from "./lib/landscape";
import "./styles.css";
function initial() {
  try {
    const text = new URLSearchParams(window.location.search).get("experiment");
    return {
      config: text ? decodeExperiment(text) : DEFAULT_CONFIG,
      error: null,
    };
  } catch (e) {
    return { config: DEFAULT_CONFIG, error: e.message };
  }
}
const fmt = (n) =>
  Number.isFinite(n)
    ? Math.abs(n) > 1e5 || (Math.abs(n) < 1e-4 && n !== 0)
      ? n.toExponential(3)
      : Number(n.toPrecision(5)).toString()
    : "Unavailable";
export default function App() {
  const [boot] = useState(initial),
    [config, setConfig] = useState(boot.config),
    [error, setError] = useState(boot.error),
    [retained, setRetained] = useState([]),
    [cursor, setCursor] = useState(0),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [view, setView] = useState("3d"),
    [message, setMessage] = useState(""),
    [undo, setUndo] = useState(null),
    [currentSlot, setCurrentSlot] = useState(0);
  const configKey = (value) => encodeExperiment(value);
  const savedCurrent = retained.find((r) => r.key === configKey(config));
  const objective = getObjective(config.objectiveId);
  const result = useMemo(
    () =>
      simulateDescent({
        ...config,
        objective: getObjective(config.objectiveId),
      }),
    [config],
  );
  const runs = useMemo(
    () => [...retained.filter((r) => r.key !== encodeExperiment(config)),
      { config, result, slot: savedCurrent?.slot ?? currentSlot, current: true,
        key: encodeExperiment(config) }],
    [retained, config, result, savedCurrent, currentSlot],
  );
  const last = Math.max(...runs.map((r) => r.result.trace.length - 1));
  const current = result.trace[Math.min(cursor, result.trace.length - 1)],
    summary = summarizeRun(result.trace, cursor, objective);
  function update(changes) {
    const next = { ...config, ...changes };
    const compatible = next.objectiveId === config.objectiveId &&
      next.startPoint.x === config.startPoint.x && next.startPoint.y === config.startPoint.y;
    if (!compatible && retained.length) {
      setUndo({ config, retained, cursor, currentSlot });
      setRetained([]);
      setCurrentSlot(0);
      setMessage("The function or start changed. Saved comparisons were cleared.");
    } else {
      if (!undo) setMessage("");
      const existing = retained.find((r) => r.key === configKey(next));
      setCurrentSlot(existing?.slot ?? [0, 1, 2].find((slot) => !retained.some((r) => r.slot === slot)) ?? 0);
    }
    setConfig(next);
    setCursor(0);
    setRunning(false);
    setError(null);
  }
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      const next = Math.min(cursor + speed, last);
      setCursor(next);
      if (next >= last) setRunning(false);
    }, 80);
    return () => clearTimeout(id);
  }, [running, speed, last, cursor]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  function preset(name) {
    const rosen = name === "valley";
    update({
      ...DEFAULT_CONFIG,
      objectiveId: rosen ? "rosenbrock" : "bowl",
      startPoint: rosen ? OBJECTIVES[0].start : DEFAULT_CONFIG.startPoint,
      optimizer: rosen ? "momentum" : "gd",
      learningRate: rosen ? 0.001 : name === "unstable" ? 1 : 0.08,
    });
  }
  function setStart(startPoint) {
    update({ startPoint });
  }
  function newStart() {
    const random = seededRandom(config.seed + 1),
      [a, b] = objective.domain;
    update({
      seed: config.seed + 1,
      startPoint: { x: a + (b - a) * random(), y: a + (b - a) * random() },
    });
  }
  function retain() {
    if (savedCurrent || retained.length >= 2) return;
    setUndo(null);
    setRetained((r) => [...r, { config: { ...config }, result,
      key: configKey(config), slot: currentSlot }]);
    setMessage(`Added ${runLabel(config)} to comparison.`);
  }
  function restoreComparison() {
    setConfig(undo.config);
    setRetained(undo.retained);
    setCursor(undo.cursor);
    setCurrentSlot(undo.currentSlot);
    setRunning(false);
    setUndo(null);
    setMessage("Previous experiment and comparisons restored.");
  }
  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set("experiment", encodeExperiment(config));
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage(
        "Experiment link copied. It contains the current run and seed.",
      );
    } catch {
      setMessage(
        "Experiment saved in the address bar. Copy the URL to share it.",
      );
    }
  }
  function download() {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              schemaVersion: 1,
              runs: runs.map((r) => ({ config: r.config, ...r.result })),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "gradient-experiment.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="lab">
      <header>
        <a className="wordmark" href="/">
          Gradient Lab
        </a>
        <nav aria-label="Project links">
          <a href="#how-to-use">How to use</a>
          <a href="https://github.com/m21264551-arch/Gradient-Lab">Code ↗</a>
          <a href="https://m21264551.com">Portfolio ↗</a>
        </nav>
      </header>
      <section className="sr-only">
        <h1>Compare optimizers from the same starting point.</h1>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button
            onClick={() => {
              setError(null);
              setConfig(DEFAULT_CONFIG);
            }}
          >
            Use default experiment
          </button>
        </p>
      )}
      <div className="bench" id="tool" tabIndex={-1}>
        <section className="controls essential" aria-label="Basic settings">
          <h2>Settings</h2>
          <label>
            Function
            <select
              value={config.objectiveId}
              onChange={(e) => {
                const o = getObjective(e.target.value);
                update({
                  objectiveId: o.id,
                  startPoint: o.start,
                  learningRate: o.defaultLearningRate,
                });
              }}
            >
              {OBJECTIVES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Optimizer
            <select
              value={config.optimizer}
              onChange={(e) => update({ optimizer: e.target.value })}
            >
              {OPTIMIZERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="rate-control">
            <label htmlFor="learning-rate">Learning rate α</label>
            <LearningRateInput key={config.learningRate} value={config.learningRate} onCommit={(learningRate) => update({ learningRate })} />
            <input
              aria-label="Learning rate slider"
              aria-valuetext={String(config.learningRate)}
              type="range"
              min="-5"
              max="0"
              step=".01"
              value={Math.log10(config.learningRate)}
              onChange={(e) =>
                update({ learningRate: 10 ** Number(e.target.value) })
              }
            />
          </div>
          <div className="presets" role="group" aria-label="Experiment presets">
            <span className="preset-label">Try</span>
            <button onClick={() => preset("stable")}>Stable descent</button>
            <button onClick={() => preset("unstable")}>Large learning rate</button>
            <details><summary>More presets</summary>
              <button onClick={() => preset("valley")}>Rosenbrock momentum</button>
            </details>
          </div>
        </section>
        <section className="experiment" aria-label="Experiment visualization">
          <div className="plot-heading">
            <h2>{objective.name}</h2>
            <div role="group" aria-label="View mode">
              {["contour", "3d"].map((v) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {v === "contour" ? "Contour" : "3D View"}
                </button>
              ))}
            </div>
          </div>
          <div className="playback">
            <button
              className="primary"
              aria-label={running ? "Pause animation" : "Run animation"}
              onClick={() => {
                if (cursor >= last) setCursor(0);
                setRunning((r) => !r);
              }}
            >
              {running ? "Pause" : "Run"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setCursor((i) => Math.min(i + 1, last));
              }}
            >
              Step
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setCursor(0);
              }}
            >
              Reset
            </button>
            <span role="status">
              {running ? "Running" : "Paused"} · Step {cursor}
            </span>
            <strong className="live-loss">Loss {fmt(current?.loss)}</strong>
          </div>
          <div className="mobile-feedback">
            <LossTrend runs={runs} cursor={cursor} />
            <span>Lower on the surface means lower loss.</span>
          </div>
          <LandscapeCanvas
            objective={objective}
            runs={runs}
            currentIndex={cursor}
            viewMode={view}
            onStart={setStart}
          />
          <div className="comparison-action">
            <button disabled={!!savedCurrent || retained.length >= 2} onClick={retain}>
              {savedCurrent ? "Added to comparison" : "Add to comparison"}
            </button>
            {runs.length > 1 && <span>All runs at iteration {cursor}</span>}
          </div>
          <p className="caption">
            The point is a pair of parameters. {view === "contour" ? "Colour" : "Height and colour"}:{" "}
            {objective.id === "bowl" ? "loss (linear scale)" : "log(1 + loss)"}.
            {view === "contour"
              ? " Click inside the axes to set the starting point."
              : " Use Contour or Starting point to choose a new start."}
          </p>
          <label className="scrubber">
            Inspect iteration{" "}
            <input
              type="range"
              min="0"
              max={last}
              value={cursor}
              onChange={(e) => {
                setRunning(false);
                setCursor(Number(e.target.value));
              }}
            />
          </label>

              <details className="step-details">
                <summary>Step details</summary>
            <label>
              Speed{" "}
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[1, 2, 4].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
                <p className="equation">
                  {config.optimizer === "gd"
                    ? "θₜ₊₁ = θₜ − αgₜ"
                    : config.optimizer === "momentum"
                      ? "vₜ₊₁ = βvₜ − αgₜ; θₜ₊₁ = θₜ + vₜ₊₁"
                      : "θₜ₊₁ = θₜ − αm̂ₜ / (√v̂ₜ + ε)"}
                </p>
                {current?.dx !== undefined && (
                  <p>
                    Next x update: {fmt(current.x)} + ({fmt(current.dx)}) ={" "}
                    {fmt(current.x + current.dx)}. Gradient x:{" "}
                    {fmt(current.gradX)}
                    {config.noise > 0
                      ? `; after noise: ${fmt(current.noisyGradX)}`
                      : ""}
                    .
                  </p>
                )}
                <p>Gradient norm: {fmt(current?.gradNorm)}. Smaller does not by itself prove a minimum.</p>
              </details>

        </section>
          <section className="results" aria-label="Experiment results">
            <LossComparison runs={runs} cursor={cursor} />
            <div>
              <p className="result-label">Current run</p>
              <h2>{summary.status}</h2>
              <p>
                {current
                  ? `Loss ${fmt(current.loss)} · started at ${fmt(result.trace[0].loss)}.`
                  : "The initial state could not be evaluated."}{" "}
                {cursor >= result.trace.length - 1
                  ? `Stopped: ${result.termination.replaceAll("_", " ")}.`
                  : running
                    ? "Running."
                    : "Paused."}
              </p>

              {cursor >= result.trace.length - 1 && ["safety_limit", "numerical_failure"].includes(result.termination) &&
                <button onClick={() => preset("stable")}>Return to stable descent</button>}
            </div>
          <section className="saved-runs" aria-label="Saved comparisons">
            <h2>Saved comparisons</h2>
            <p>Saved settings replay alongside the current run at the same iteration.</p>
            <p>{retained.length} of 2 saved · current run also shown</p>
            {retained.map((run) => <div className="saved-run" key={run.key}>
              <span style={{ color: COLORS[run.slot] }}>{runLabel(run.config)}</span>
              <button aria-label={`Remove ${runLabel(run.config)}`} onClick={() => {
                setRetained((items) => items.filter((r) => r.key !== run.key));
                setMessage(`Removed ${runLabel(run.config)}.`);
              }}>Remove</button>
            </div>)}
          </section>
          <div className="comparison-notice"><p role="status">{message}</p>
            {undo && <button onClick={restoreComparison}>Undo</button>}</div>
          </section>
        <aside className="controls advanced-controls" aria-label="Advanced experiment controls">
          <details className="advanced">
            <summary>Advanced settings</summary>
            <button className="mobile-preset" onClick={() => preset("valley")}>Rosenbrock momentum</button>
            <label>
              {config.optimizer === "adam" ? "First moment β₁" : "Momentum β"}{" "}
              <span className="control-value">{fmt(config.momentum)}</span>
              <input
                type="range"
                min="0"
                max=".98"
                step=".01"
                value={config.momentum}
                disabled={config.optimizer === "gd"}
                onChange={(e) => update({ momentum: Number(e.target.value) })}
              />
            </label>
            <label>
              Gradient noise σ{" "}
              <span className="control-value">{fmt(config.noise)}</span>
              <input
                type="range"
                min="0"
                max=".3"
                step=".005"
                value={config.noise}
                onChange={(e) => update({ noise: Number(e.target.value) })}
              />
            </label>
            <p>Seed {config.seed}. Noise is uniform U(−σ, σ).</p>
          </details>
          <details>
            <summary>Starting point</summary>
            <fieldset>
              <legend>Shared start</legend>
              {["x", "y"].map((axis) => (
                <label key={axis}>
                  {axis}
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    step=".01"
                    value={config.startPoint[axis]}
                    onChange={(e) => {
                      if (
                        e.target.value !== "" &&
                        Number.isFinite(e.target.valueAsNumber) &&
                        Math.abs(e.target.valueAsNumber) <= 10
                      )
                        setStart({
                          ...config.startPoint,
                          [axis]: e.target.valueAsNumber,
                        });
                    }}
                  />
                </label>
              ))}
            </fieldset>
            <button onClick={newStart}>New start</button>
            <p>
              Seed {config.seed}. Changing the function or starting point clears
              comparisons.
            </p>
          </details>
        </aside>
      </div>

      {runs.length > 1 && (
        <div
          className="table-wrap"
          tabIndex="0"
          role="region"
          aria-label="Run comparison"
        >
          <table>
            <caption>Run comparison at the selected iteration</caption>
            <thead>
              <tr>
                <th>Run</th>
                <th>Optimizer / α</th>
                <th>Step</th>
                <th>Loss</th>
                <th>Gradient norm</th>
                <th>Nearest minimum</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => {
                const p =
                    r.result.trace[Math.min(cursor, r.result.trace.length - 1)],
                  s = summarizeRun(r.result.trace, cursor, objective);
                return (
                  <tr key={i}>
                    <th style={{ color: COLORS[r.slot] }}>
                      {r.current ? "Current" : "Saved"}
                    </th>
                    <td>{runLabel(r.config)}</td>
                    <td>{p?.iteration ?? "—"}</td>
                    <td>{fmt(p?.loss)}</td>
                    <td>{fmt(p?.gradNorm)}</td>
                    <td>{fmt(s.minimumDistance)}</td>
                    <td>
                      {cursor >= r.result.trace.length - 1
                        ? r.result.termination.replaceAll("_", " ")
                        : s.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="export">
        <button onClick={share}>Copy current run link</button>
        <button onClick={download}>Download traces</button>
      </div>
      <LearningGuide />
      <details className="method">
        <summary>Data and method</summary>
        <div>
          <p>
            These are exact two-dimensional objective functions, not a trained
            neural network. The gradient is analytic. The simulation does not
            clip updates or project parameters back into the picture.
          </p>
          <p>
            Noise is independent uniform U(−σ, σ) added to each gradient
            component. Adam uses β₂ = 0.999 and ε = 10⁻⁸. All runs use a seeded
            generator. Equal learning rates are a controlled comparison, not a
            claim that the algorithms are equally tuned.
          </p>
          <p>
            Known minima are marked in green. A stationary point can also be a
            saddle. Runs stop at 220 updates by default, a gradient norm below
            10⁻⁸ without noise, a non-finite value, or safety limits of
            |coordinate| &gt; 10⁶ / |loss| &gt; 10¹². A safety stop is not
            convergence.
          </p>
        </div>
      </details>
    </main>
  );
}
function LearningRateInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0.00001 || n > 1) { setInvalid(true); return; }
    setInvalid(false);
    if (n !== value) onCommit(n);
  }
  return <><input id="learning-rate" type="number" min="0.00001" max="1" step="any"
    value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    aria-invalid={invalid} aria-describedby={invalid ? "rate-error" : undefined} />
    {invalid && <p id="rate-error" role="alert">Enter a rate between 0.00001 and 1.</p>}</>;
}
function LossComparison({ runs, cursor }) {
  const chartRef = useRef(null);
  const [W, setWidth] = useState(600);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  const H = 220,
    P = 40,
    visible = runs.map((r) => r.result.trace.slice(0, cursor + 1)),
    points = visible.flat(),
    max = Math.max(1, ...points.map((p) => Math.log1p(Math.max(0, p.loss)))),
    steps = Math.max(1, cursor);
  return (
    <figure ref={chartRef}>
      <figcaption>Loss over iteration · log(1 + loss)</figcaption>
      {runs.length > 1 && <p className="comparison-clock">All runs at iteration {cursor}; stopped runs keep their last point.</p>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Loss comparison chart"
      >
        <path d={`M${P} 12V${H - P}H${W - 12}`} fill="none" stroke="#89929d" />
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={P}
              x2={W - 12}
              y1={H - P - t * (H - P - 12)}
              y2={H - P - t * (H - P - 12)}
              stroke="#e1e4e7"
            />
            <text x="0" y={H - P - t * (H - P - 12)} fontSize="12">
              {fmt(Math.expm1(t * max))}
            </text>
          </g>
        ))}
        {visible.map((trace, i) => (
          <g key={runs[i].key}>
          <polyline
            fill="none"
            stroke={COLORS[runs[i].slot]}
            strokeWidth="2"
            strokeDasharray={runs[i].slot === 1 ? "6 3" : runs[i].slot === 2 ? "2 2" : undefined}
            points={trace
              .map(
                (p) =>
                  `${P + (p.iteration / steps) * (W - P - 12)},${H - P - (Math.log1p(Math.max(0, p.loss)) / max) * (H - P - 12)}`,
              )
              .join(" ")}
          />
          <circle
            cx={P + (trace.at(-1).iteration / steps) * (W - P - 12)}
            cy={H - P - (Math.log1p(Math.max(0, trace.at(-1).loss)) / max) * (H - P - 12)}
            r="4" fill={COLORS[runs[i].slot]} stroke="white" strokeWidth="1.5"
          />
          </g>
        ))}
        <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="12">Iteration</text>
        <text x={P} y={H - 12} fontSize="12">
          0
        </text>
        <text x={W - 36} y={H - 12} fontSize="12">
          {steps}
        </text>
      </svg>
      <p>
        {runs.map((run, i) => (
          <span className="run-label" key={i} style={{ color: COLORS[run.slot] }}>
            {runLabel(run.config)}{run.current ? " · current" : " · saved"}
          </span>
        ))}
      </p>
    </figure>
  );
}

function LossTrend({ runs, cursor }) {
  const traces = runs.map(run => run.result.trace.slice(0, cursor + 1));
  const high = Math.max(1, ...traces.flat().map(point => Math.log1p(Math.max(0, point.loss))));
  return <figure className="loss-trend">
    <figcaption>Loss trend</figcaption>
    <svg viewBox="0 0 120 32" role="img" aria-label={`Loss trend through iteration ${cursor}; full chart below`}>
      {traces.map((trace, i) => <g key={runs[i].key}><polyline fill="none" stroke={COLORS[runs[i].slot]} strokeWidth="2"
        strokeDasharray={runs[i].slot === 1 ? "6 3" : runs[i].slot === 2 ? "2 2" : undefined}
        points={trace.map(point => `${2 + point.iteration / Math.max(1, cursor) * 116},${30 - Math.log1p(Math.max(0, point.loss)) / high * 28}`).join(" ")} />
        <circle cx={2 + trace.at(-1).iteration / Math.max(1,cursor) * 116} cy={30 - Math.log1p(Math.max(0,trace.at(-1).loss))/high*28} r="2" fill={COLORS[runs[i].slot]} />
      </g>)}
    </svg>
  </figure>;
}
