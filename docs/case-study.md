# Gradient Lab

[Demo](https://gradient.m21264551.com/) · [Code](https://github.com/m21264551-arch/Gradient-Lab)

On the elliptic bowl, gradient descent approaches the minimum steadily. Heavy-ball momentum, using the same start and learning rate, crosses the minimum and oscillates before settling. The objective and starting point are the same for both runs.

## Compare optimizer paths

Run an optimizer, add it to the comparison, then change a setting. The plot overlays the retained paths and the loss chart shows their progress. Step details show the numbers in the next update. Starting coordinates, seeded noise and shareable configurations make an experiment repeatable.

## Handling unstable runs

The simulation computes standard gradient descent, heavy-ball momentum and Adam separately from drawing and playback. Updates are not capped or projected into the viewport. A large learning rate can send a path beyond the plot. The trace records any numerical failure or safety stop. Tests check analytic gradients, known minima, reference updates and identical traces across playback modes.

## What two dimensions leave out

These are two-dimensional functions with analytic gradients, not neural-network training runs. Equal learning rates make a controlled comparison but do not mean each optimizer is equally tuned. A small gradient can indicate a saddle, so the interface distinguishes a stationary point from proximity to a known minimum.
