import { useEffect, useMemo, useRef, useState } from "react";
import { buildSurface } from "../lib/objectives";
const COLORS = ["#254f9c", "#b34828", "#6f4d8c"];
export default function LandscapeCanvas({
  objective,
  runs,
  currentIndex,
  viewMode,
  onStart,
}) {
  const ref = useRef(null),
    [size, setSize] = useState({ w: 800, h: 280 });
  const surface = useMemo(() => buildSurface(objective, 60), [objective]);
  useEffect(() => {
    const canvas = ref.current,
      observer = new ResizeObserver((entries) => {
        const w = Math.max(240, entries[0].contentRect.width);
        setSize({ w, h: 280 });
      });
    observer.observe(canvas.parentElement);
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
    const [a, b] = objective.domain,
      pad = 40,
      project = (x, y, z = 0) =>
        viewMode === "contour"
          ? {
              x: pad + ((x - a) / (b - a)) * (w - 2 * pad),
              y: h - pad - ((y - a) / (b - a)) * (h - 2 * pad),
            }
          : {
              x: w / 2 + ((x - y) / (b - a)) * w * 0.35,
              y: h * 0.6 + ((x + y) / (b - a)) * h * 0.2 - z * h * 0.35,
            };
    ctx.fillStyle = "#fafbf9";
    ctx.fillRect(0, 0, w, h);
    const cells = [];
    for (let j = 0; j < surface.rows.length - 1; j++)
      for (let i = 0; i < surface.rows[j].length - 1; i++) {
        const q = [
          surface.rows[j][i],
          surface.rows[j][i + 1],
          surface.rows[j + 1][i + 1],
          surface.rows[j + 1][i],
        ];
        cells.push(q);
      }
    if (viewMode !== "contour")
      cells.sort((x, y) => x[0].x + x[0].y - y[0].x - y[0].y);
    for (const q of cells) {
      const z = q.reduce((s, p) => s + p.z, 0) / 4;
      ctx.beginPath();
      q.forEach((p, i) => {
        const v = project(p.x, p.y, p.z);
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fillStyle = `hsl(215 22% ${98 - 28 * z}%)`;
      ctx.fill();
    }
    // Marching-square segments at fixed normalized log-height levels.
    if (viewMode === "contour") {
      ctx.strokeStyle = "#63798d70";
      ctx.lineWidth = 0.7;
      for (const level of [0.04, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9])
        for (const q of cells) {
          const cross = [];
          for (let i = 0; i < 4; i++) {
            const p = q[i],
              r = q[(i + 1) % 4];
            if (p.z < level !== r.z < level) {
              const t = (level - p.z) / (r.z - p.z);
              cross.push(project(p.x + t * (r.x - p.x), p.y + t * (r.y - p.y)));
            }
          }
          for (let i = 0; i + 1 < cross.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(cross[i].x, cross[i].y);
            ctx.lineTo(cross[i + 1].x, cross[i + 1].y);
            ctx.stroke();
          }
        }
    }
    ctx.save();
    ctx.beginPath();
    if (viewMode === "contour") ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
    else ctx.rect(0, 0, w, h);
    ctx.clip();
    const inDomain = (p) => p.x >= a && p.x <= b && p.y >= a && p.y <= b;
    runs.forEach((r, i) => {
      ctx.strokeStyle = COLORS[i];
      ctx.fillStyle = COLORS[i];
      ctx.lineWidth = 2.5;
      ctx.setLineDash(i === 1 ? [7, 4] : i === 2 ? [2, 3] : []);
      ctx.beginPath();
      let connected = false;
      const trace = r.result.trace.slice(0, currentIndex + 1);
      for (const p of trace) {
        if (!inDomain(p)) {
          connected = false;
          continue;
        }
        const z =
            (Math.log1p(Math.max(0, p.loss)) - surface.minLog) /
            Math.max(1e-9, surface.maxLog - surface.minLog),
          v = project(p.x, p.y, z);
        if (connected) ctx.lineTo(v.x, v.y);
        else ctx.moveTo(v.x, v.y);
        connected = true;
      }
      ctx.stroke();
      const p = trace.at(-1);
      if (p && inDomain(p)) {
        const v = project(
          p.x,
          p.y,
          (Math.log1p(Math.max(0, p.loss)) - surface.minLog) /
            (surface.maxLog - surface.minLog),
        );
        ctx.beginPath();
        ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    for (const p of objective.minima) {
      const z =
          (Math.log1p(Math.max(0, objective.f(p.x, p.y))) - surface.minLog) /
          (surface.maxLog - surface.minLog),
        v = project(p.x, p.y, z);
      ctx.beginPath();
      ctx.moveTo(v.x - 6, v.y);
      ctx.lineTo(v.x + 6, v.y);
      ctx.moveTo(v.x, v.y - 6);
      ctx.lineTo(v.x, v.y + 6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#344050";
    ctx.font = "12px system-ui";
    ctx.fillText("x", w - 22, h - 20);
    ctx.fillText("y", 15, 24);
    if (viewMode === "contour") {
      ctx.fillText(String(a), pad, h - 15);
      ctx.fillText(String(b), w - pad, h - 15);
      ctx.fillText(String(b), 10, pad);
      ctx.fillText(String(a), 10, h - pad);
    }
    ctx.fillText("＋ known minimum", pad, 22);
  }, [size, surface, objective, runs, currentIndex, viewMode]);
  function place(event) {
    if (viewMode !== "contour") return;
    const rect = ref.current.getBoundingClientRect(),
      x = event.clientX - rect.left,
      y = event.clientY - rect.top,
      pad = 40,
      [a, b] = objective.domain;
    if (x < pad || x > size.w - pad || y < pad || y > size.h - pad) return;
    onStart({
      x: Number((a + ((x - pad) / (size.w - 2 * pad)) * (b - a)).toFixed(3)),
      y: Number((b - ((y - pad) / (size.h - 2 * pad)) * (b - a)).toFixed(3)),
    });
  }
  return (
    <div className="landscape-wrap">
      <canvas
        ref={ref}
        style={{ width: "100%", height: size.h }}
        role="img"
        aria-label="Loss landscape visualization"
        aria-describedby="landscape-summary"
        onPointerDown={place}
      />
      <p className="sr-only" id="landscape-summary">
        Loss landscape for {objective.name}. Step {currentIndex}. Numeric
        results and distance to the nearest known minimum are in the comparison
        table. Starting coordinates can be entered in Shared start.
      </p>
    </div>
  );
}
