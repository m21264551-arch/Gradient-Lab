# Gradient Lab

[Demo](https://gradient.m21264551.com/) · [Code](https://github.com/m21264551-arch/Gradient-Lab)

On the elliptic bowl, gradient descent approaches the minimum steadily. Heavy-ball momentum, using the same start and learning rate, crosses the minimum and oscillates before settling. The comparison makes an update rule’s behaviour visible without changing the underlying problem.

## Keep one thing fixed

Run an optimizer, add it to the comparison, then change a setting. The plot overlays the retained paths and the loss chart shows their progress. Step details expose the next update numerically. Starting coordinates, seeded noise and shareable configurations make an experiment repeatable.

## Let unstable runs fail

The simulation computes standard gradient descent, heavy-ball momentum and Adam separately from drawing and playback. Updates are not capped or projected into the viewport. A large learning rate can send a path beyond the plot; the trace records a numerical or safety stop instead of presenting that run as converged. Tests check analytic gradients, known minima, reference updates and identical traces across playback modes.

## A useful small problem

These are two-dimensional functions with analytic gradients, not neural-network training runs. Equal learning rates make a controlled comparison but do not mean each optimizer is equally tuned. A small gradient can indicate a saddle, so the interface distinguishes a stationary point from proximity to a known minimum.
