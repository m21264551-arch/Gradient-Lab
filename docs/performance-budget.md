# Performance budgets

The production build enforces gzip limits of 90 KB JavaScript and 10 KB CSS with `npm run budget`. The research rebuild uses about 53 KB and 2 KB respectively.

Simulation traces and surface samples are memoized by mathematical configuration. A bounded timer advances the playback cursor. It never recomputes optimizer updates. The app starts paused in the 3D bowl view. Canvas rendering clips visually without projecting mathematical state.

Browser tests cover the main interactions in Chromium, Firefox and WebKit, with axe and reviewed screenshot checks in Chromium. Keep these checks and the build budget passing when adding features.
