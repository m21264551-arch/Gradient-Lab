# Controlled optimizer experiments

**Question.** What changes when the objective and initial point are fixed and only the optimizer or its rate changes?

**Approach.** Separate exact simulation from Canvas drawing and React playback. Keep a versioned configuration, seeded noise, complete trace and explicit stop reason. Compare three traces in a contour view and loss chart; show the next numeric update.

**Result.** The reference test objective `f(x,y)=x²+y²`, start `(1,2)`, rate 0.1 gives GD `(0.8,1.6)` then `(0.64,1.28)`. Heavy-ball with β=0.9 gives `(0.8,1.6)` then `(0.46,0.92)`. Adam's first x update is `1 − 0.2/(2+10⁻⁸)`. Independent tests check these recurrences, analytic gradients and known minima.

**Failure analysis.** The previous step caps and viewport clamping made unstable runs appear bounded. Removing them means large-rate paths can leave the plot and stop at a documented safety limit. A small gradient at the Saddle + Walls origin is correctly shown as stationary without claiming a minimum.

**Tradeoff.** Precomputing a bounded trace makes animation reproducible and makes renderer or playback speed irrelevant to the result. It limits experiments to small two-dimensional problems. A future extension would need a separate numerical budget and reference tests before supporting new optimizers or objectives.
