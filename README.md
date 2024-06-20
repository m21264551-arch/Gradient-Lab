# Gradient Lab

Gradient Lab is an interactive gradient descent visualizer built with React, Vite, SVG, and Canvas.

[Live demo](https://data-visualisation-gamma.vercel.app)

The app lets visitors change the loss surface, optimizer, learning rate, momentum, noise, speed, and view mode while the optimizer path moves across the landscape.

## Why this project exists

I built this as a small teaching tool and portfolio piece. It turns a topic that often sits in equations into something you can poke at directly.

## Features

- Rosenbrock, elliptic bowl, saddle, and other objective surfaces
- Gradient descent, momentum, and Adam simulations
- 3D-style landscape view and contour view
- Live metrics for loss, gradient size, step count, and run status
- Below-the-playground guide for the core concepts
- Unit, accessibility, visual, and browser tests

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run test:a11y
npm run test:visual
npm run perf
npm run qa
```

## Deploy

The app is configured for Vercel in `vercel.json`.

- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

```bash
vercel build
vercel deploy --prebuilt
```
