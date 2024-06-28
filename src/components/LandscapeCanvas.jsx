import { useEffect, useMemo, useRef, useState } from "react";
import {
  displaySurface,
  landscapeGeometry,
  projectTracePoint,
  RUN_COLORS,
  runLabel,
} from "../lib/landscape";
function surfaceColor(z) {
  const stops = [
    [30, 107, 158],
    [116, 185, 203],
    [222, 232, 197],
    [242, 192, 94],
    [187, 76, 49],
  ];
  const t = Math.max(0, Math.min(1, z)) * (stops.length - 1),
    i = Math.min(stops.length - 2, Math.floor(t));
  return `rgb(${stops[i].map((v, c) => Math.round(v + (stops[i + 1][c] - v) * (t - i))).join(",")})`;
}
function label(
  ctx,
  point,
  text,
  canvasWidth,
  color = "#263842",
  below = false,
) {
  ctx.font = "600 12px system-ui";
  const width = ctx.measureText(text).width + 12;
  const x = Math.max(4, Math.min(canvasWidth - width - 4, point.x + 12)),
    y = Math.max(22, point.y + (below ? 32 : -10));
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.fillRect(x, y - 16, width, 23);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 6, y);
}
export default function LandscapeCanvas({
  objective,
  runs,
  currentIndex,
  viewMode,
  onStart,
}) {
  const ref = useRef(null),
    wrap = useRef(null),
    [size, setSize] = useState({ w: 800, h: 420 });
  const surface = useMemo(() => displaySurface(objective), [objective]);
  const geometry = useMemo(
    () => landscapeGeometry(objective, surface, size.w, size.h, viewMode),
    [objective, surface, size, viewMode],
  );
  const outside = runs.flatMap((run, i) => {
    const p =
      run.result.trace[Math.min(currentIndex, run.result.trace.length - 1)];
    return p && !geometry.inDomain(p) ? [`Run ${i + 1}`] : [];
  });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        w: Math.max(240, entry.contentRect.width),
        h: entry.contentRect.height,
      }),
    );
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = size,
      dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f8fbfc";
    ctx.fillRect(0, 0, w, h);
    const { project } = geometry,
      [a, b] = objective.domain;
    const polygon = (points) => {
      ctx.beginPath();
      points.forEach((p, i) => {
        const v = project(p.x, p.y, p.z);
        if (i) ctx.lineTo(v.x, v.y);
        else ctx.moveTo(v.x, v.y);
      });
      ctx.closePath();
    };
    polygon([
      { x: a, y: a, z: 0 },
      { x: b, y: a, z: 0 },
      { x: b, y: b, z: 0 },
      { x: a, y: b, z: 0 },
    ]);
    ctx.fillStyle = "#edf2f3";
    ctx.fill();
    ctx.strokeStyle = "#c9d4d9";
    ctx.stroke();
    const cells = [];
    for (let j = 0; j < surface.rows.length - 1; j++)
      for (let i = 0; i < surface.rows[j].length - 1; i++)
        cells.push([
          surface.rows[j][i],
          surface.rows[j][i + 1],
          surface.rows[j + 1][i + 1],
          surface.rows[j + 1][i],
        ]);
    if (viewMode === "3d")
      cells.sort((x, y) => x[0].x + x[0].y - y[0].x - y[0].y);
    for (const q of cells) {
      polygon(q);
      ctx.fillStyle = surfaceColor(q.reduce((s, p) => s + p.z, 0) / 4);
      if (viewMode === "contour") {
        const topLeft = project(q[3].x, q[3].y);
        const bottomRight = project(q[1].x, q[1].y);
        ctx.fillRect(
          topLeft.x,
          topLeft.y,
          bottomRight.x - topLeft.x + 0.5,
          bottomRight.y - topLeft.y + 0.5,
        );
      } else {
        ctx.fill();
      }
      if (viewMode === "3d") {
        ctx.strokeStyle = "rgba(28,55,64,.12)";
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
    }
    if (viewMode === "contour") {
      ctx.strokeStyle = "rgba(27,61,78,.48)";
      ctx.lineWidth = 0.8;
      for (const level of [0.05, 0.12, 0.23, 0.38, 0.56, 0.76, 0.94])
        for (const q of cells) {
          const crossings = [];
          for (let i = 0; i < 4; i++) {
            const p = q[i],
              r = q[(i + 1) % 4];
            if (p.z < level !== r.z < level) {
              const t = (level - p.z) / (r.z - p.z);
              crossings.push(
                project(p.x + t * (r.x - p.x), p.y + t * (r.y - p.y)),
              );
            }
          }
          for (let i = 0; i + 1 < crossings.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(crossings[i].x, crossings[i].y);
            ctx.lineTo(crossings[i + 1].x, crossings[i + 1].y);
            ctx.stroke();
          }
        }
    }
    runs.forEach((run, i) => {
      const points = run.result.trace.slice(0, currentIndex + 1);
      ctx.beginPath();
      let connected = false;
      for (const p of points) {
        if (!geometry.inDomain(p)) {
          connected = false;
          continue;
        }
        const v = projectTracePoint(p, surface, geometry);
        if (connected) ctx.lineTo(v.x, v.y);
        else ctx.moveTo(v.x, v.y);
        connected = true;
      }
      ctx.setLineDash((run.slot ?? i) === 1 ? [7, 4] : (run.slot ?? i) === 2 ? [2, 4] : []);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = RUN_COLORS[run.slot ?? i];
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
    });
    objective.minima.forEach((p, i) => {
      const v = projectTracePoint(
        { ...p, loss: objective.f(p.x, p.y) },
        surface,
        geometry,
      );
      ctx.beginPath();
      ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#12633f";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      label(
        ctx,
        v,
        objective.minima.length > 1 ? `Minimum ${i + 1}` : "Minimum",
        w,
        "#145537",
        true,
      );
    });
    runs.forEach((run, i) => {
      const p =
        run.result.trace[Math.min(currentIndex, run.result.trace.length - 1)];
      if (!p || !geometry.inDomain(p)) return;
      const v = projectTracePoint(p, surface, geometry);
      ctx.beginPath();
      ctx.arc(v.x, v.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = RUN_COLORS[run.slot ?? i];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (i === runs.length - 1)
        label(ctx, v, currentIndex === 0 ? "Start" : "Current", w);
    });
    ctx.fillStyle = "#344954";
    ctx.font = "12px system-ui";
    if (viewMode === "contour") {
      const r = geometry.bounds;
      ctx.fillText(String(a), r.left, r.top + r.side + 18);
      ctx.fillText(String(b), r.left + r.side - 8, r.top + r.side + 18);
      ctx.fillText(String(b), r.left - 22, r.top + 5);
      ctx.fillText(String(a), r.left - 22, r.top + r.side);
      ctx.fillText("x", r.left + r.side + 14, r.top + r.side);
      ctx.fillText("y", r.left - 20, r.top - 12);
    } else {
      const x = project(b, a, 0),
        y = project(a, b, 0);
      ctx.fillText("x", x.x + 8, x.y + 18);
      ctx.fillText("y", y.x - 18, y.y + 18);
    }
  }, [size, surface, objective, runs, currentIndex, viewMode, geometry]);
  function place(event) {
    const rect = ref.current.getBoundingClientRect(),
      p = geometry.unproject(
        ((event.clientX - rect.left) * size.w) / rect.width,
        ((event.clientY - rect.top) * size.h) / rect.height,
      );
    if (p) onStart({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) });
  }
  return (
    <>
      <div className="landscape-wrap" ref={wrap}>
        <canvas
          ref={ref}
          role="img"
          aria-label="Loss landscape visualization"
          aria-describedby="landscape-summary"
          onPointerDown={place}
        />
      </div>
      <p className="sr-only" id="landscape-summary">
        {viewMode === "3d"
          ? "Three-dimensional surface"
          : "Equal-scale contour map"}{" "}
        for {objective.name}. Step {currentIndex}. Height and colour show{" "}
        {surface.scaleLabel}. The white-ring point is the current position;
        green marks a known minimum. Starting coordinates can be entered in
        Starting point.
      </p>
      <div className="plot-key" aria-label="Path legend">
        {runs.map((run, i) => (
          <span key={i}>
            <i
              style={{
                borderColor: RUN_COLORS[run.slot ?? i],
                borderStyle: (run.slot ?? i) === 1 ? "dashed" : (run.slot ?? i) === 2 ? "dotted" : "solid",
              }}
            />{" "}
            {runLabel(run.config)}{run.current && runs.length > 1 ? " · current" : ""}
          </span>
        ))}
        <span>
          <b className="minimum-key" /> Known minimum
        </span>
      </div>
      {outside.length > 0 && (
        <p className="outside-view" role="status">
          {outside.join(", ")} outside the plotted area. The coordinates
          continue unchanged; inspect the loss or download the trace.
        </p>
      )}
    </>
  );
}
