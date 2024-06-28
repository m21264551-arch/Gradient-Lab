import { DEFAULT_CONFIG, getObjective, simulateDescent } from "../lib/objectives";
const objective = getObjective("bowl");
const trace = simulateDescent({ ...DEFAULT_CONFIG, objective }).trace.slice(0, 31);
const x = (n) => 40 + (n + 2) * 60;
const y = (n) => 260 - (n + 2) * 60;
export default function LearningGuide() {
  return <section id="how-to-use" className="learning-guide" aria-labelledby="guide-title" tabIndex={-1}>
    <h2 id="guide-title">How to use Gradient Lab</h2>
    <div className="guide-layout">
      <figure className="guide-figure">
        <svg viewBox="0 0 400 310" role="img" aria-label="Thirty gradient descent updates on the default bowl, from the starting point toward the minimum">
          <defs><clipPath id="guide-bowl-clip"><rect x="20" y="20" width="280" height="270" /></clipPath></defs>
          <g clipPath="url(#guide-bowl-clip)">
            {[0.2, 0.7, 1.5, 2.8].map((loss) => <ellipse key={loss} cx={x(.25)} cy={y(-.45)} rx={Math.sqrt(loss / 1.1) * 60} ry={Math.sqrt(loss / .42) * 60} fill="none" stroke="#b6cad3" />)}
            <polyline points={trace.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")} fill="none" stroke="#254f9c" strokeWidth="3" />
            {trace.filter((_, i) => i % 3 === 0).map((p) => <circle key={p.iteration} cx={x(p.x)} cy={y(p.y)} r="3" fill="#254f9c" />)}
          </g>
          <circle cx={x(trace[0].x)} cy={y(trace[0].y)} r="6" fill="#254f9c" stroke="white" strokeWidth="3" />
          <circle cx={x(.25)} cy={y(-.45)} r="5" fill="#12633f" />
          <g fontSize="16" fill="#273844">
            <text x="80" y="44">Start</text><text x="204" y="186">Minimum</text>
            <path d={`M${x(trace[5].x)} ${y(trace[5].y)}L229 91`} stroke="#52606e" /><text x="232" y="88">One update</text>
            <text x="28" y="300">Contours join equal loss values</text>
          </g>
        </svg>
        <figcaption>Default bowl · gradient descent · α 0.08 · first 30 updates</figcaption>
      </figure>
      <div className="guide-copy">
        <p>Height is loss. The point is a pair of parameters, x and y; its path records optimizer updates. Cooler colours show lower loss.</p>
        <ol className="guide-steps">
          <li><strong>Run the bowl.</strong> Watch the point descend. Step advances one update; Reset returns to the same start.</li>
          <li><strong>Try Large learning rate.</strong> The point can overshoot and leave the picture. Its coordinates keep moving; a safety stop does not mean it found a minimum.</li>
          <li><strong>Compare momentum.</strong> Return to Stable descent, add the run to comparison, then select Momentum and Run. Compare its path and loss with the saved run.</li>
        </ol>
        <p>Neural-network training uses these update rules after computing gradients. These two-parameter examples expose their behaviour, but cannot represent an entire trained network. Equal learning rates also do not mean equally tuned optimizers.</p>
        <a href="#tool">Back to tool ↑</a>
      </div>
    </div>
  </section>;
}
