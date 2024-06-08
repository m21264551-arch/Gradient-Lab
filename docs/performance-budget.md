# Gradient Lab Performance Budget

## Static Build Budgets

| Asset | Budget | Enforced By |
| --- | ---: | --- |
| JavaScript gzip | 90 KB | `npm run budget` |
| CSS gzip | 10 KB | `npm run budget` |

These budgets are intentionally tight for a portfolio visualization. The app should stay fast enough to load comfortably on static hosting and remain easy to inspect in a recruiter review.

## Runtime Quality Checks

| Check | Enforced By |
| --- | --- |
| Accessibility regressions | `npm run test:a11y` |
| Core interaction regressions | `npm run test:e2e` |
| Visual regressions | `npm run test:visual` |

## Optimization Notes

- Loss surfaces and contour segments are memoized by objective so they are not rebuilt on every animation tick.
- Animation uses `requestAnimationFrame` and pauses when the page is hidden.
- `prefers-reduced-motion` starts the app paused to avoid unnecessary movement and make tests deterministic.
- Visual tests run in Chromium only to avoid false failures from browser-specific canvas rendering differences.

## Budget Change Policy

Budget increases should be documented in this file with the reason, expected user value, and any tradeoff. Prefer optimizing existing code before increasing the JavaScript budget.
