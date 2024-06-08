# Gradient Lab QA Report

## Current QA Scope

Gradient Lab is validated as a static, client-side educational visualization. The core workflow is:

1. Load the app.
2. Inspect the loss landscape, controls, metrics, and insight panel.
3. Adjust function, optimizer, learning rate, momentum, noise, speed, and view mode.
4. Run, pause, step, reset, and generate a new starting path.
5. Read the guide below the playground and expand FAQ answers.

## Edge-Case Matrix

| Area | Scenario | Expected Result | Automated Coverage |
| --- | --- | --- | --- |
| Objective math | Sample every objective at domain min/mid/max | Loss and gradients stay finite | `src/lib/objectives.test.js` |
| Optimizers | GD, Momentum, and Adam across low/high learning rates | Trace stays finite and bounded to the domain | `src/lib/objectives.test.js` |
| Numerical failure | Non-finite loss/gradient/start values | Simulation falls back to safe finite values | `src/lib/objectives.test.js` |
| Summary state | Converging, converged, diverging, oscillating, slow progress | Status and tone classify correctly | `src/lib/objectives.test.js` |
| Reduced motion | User prefers reduced motion | App starts paused | `src/App.test.jsx`, Playwright setup |
| Controls | Function, sliders, speed, view, run, step, reset, new path | Visible state and metrics update | `src/App.test.jsx`, `tests/e2e/gradient-lab.e2e.spec.js` |
| Layout | 390, 500, 768, 1024, 1280, 1440 width checks | No horizontal overflow or clipped primary UI | Playwright E2E |
| Learning guide | Guide is below the playground, visible on scroll, and FAQ answers expand | Explanatory content remains discoverable and usable | `src/App.test.jsx`, Playwright E2E |
| Accessibility | Desktop and mobile automated axe scans | No axe violations | `tests/e2e/gradient-lab.a11y.spec.js` |
| Visual regression | Desktop, tablet, mobile, contour, high-learning-rate state | Chromium screenshots match baselines | `tests/e2e/gradient-lab.visual.spec.js` |

## Heuristic Evaluation

| Heuristic | Evaluation |
| --- | --- |
| Visibility of system status | Running/Paused status is always visible and announced with `role="status"`. |
| Match with real-world concepts | Controls use ML terms directly: objective, optimizer, learning rate, momentum, noise, contour, loss, gradient. |
| User control and freedom | Run/Pause, Step, Reset, and New path are available without destructive side effects. |
| Consistency and standards | Selects, sliders, segmented controls, buttons, metrics, and chart use familiar patterns. |
| Error prevention | Simulation clamps points and sanitizes non-finite math output. |
| Recognition over recall | The legend, metric labels, and live insight keep the visualization interpretable. |
| Flexibility and efficiency | Users can compare optimizer behavior quickly via selectors and speed controls. |
| Aesthetic and minimalist design | Tool chrome stays compact so the loss landscape remains the focal point. |
| Help users recover | Reset returns to iteration 0; New path creates a fresh starting point. |
| Help and documentation | Insight copy explains the current behavior, and the below-playground guide explains gradient descent, usage, visuals, metrics, and FAQ content. |

## Usability Task Script

Ask a tester to complete these tasks without guidance:

1. Identify whether the optimizer is currently running or paused.
2. Switch from Rosenbrock to Elliptic Bowl.
3. Increase the speed to 2x.
4. Step the optimizer once and describe what changed.
5. Switch to Contour view.
6. Reset the path.
7. Generate a new path.
8. Explain what the loss chart represents.
9. Scroll to the guide and find the answer to "Is this a neural network?"

Passing signal: the tester completes tasks 1-7 without confusion, can describe task 8 as loss changing over iterations, and can use the FAQ in task 9 without assistance.

## Known Limitations

- The 3D surface is rendered on a 2D canvas, not a true rotatable WebGL scene.
- Visual baselines are Chromium-only to reduce noisy cross-browser canvas/font diffs.
- The keyboard-only tab path is validated in Chromium and Firefox. macOS WebKit skips that specific assertion because buttons are not tabbable unless Full Keyboard Access is enabled at the OS level.
- The app has no backend persistence; every run is local and deterministic except manually generated new paths.

## Acceptance Criteria

- `npm run qa` passes.
- Dependency audit remains clean with `npm audit`.
- Bundle budgets pass with `npm run budget`.
- Browser-level smoke tests pass in Chromium, Firefox, and WebKit.
- QA docs are updated whenever a new major control, objective, optimizer, or visualization mode is added.
