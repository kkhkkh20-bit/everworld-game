# Map-first surface

The game opens directly into the village map. The old fixed header, KPI strip, sidebar and footer no longer consume the viewport. An optional detailed-record overlay preserves access to the existing simulation records.

- Click residents: portrait, health, energy, household food, follow, highlight family, and actual career training.
- Click houses, crops, the granary, workshop, forest, river or hall: inspect the corresponding simulation state in a compact map popup.
- Click a settlement on the world map: enter it, inspect history or open trade/expedition actions. The source settlement is named explicitly; stock transfer and campaigns call the existing model.
- Drag either map, zoom with the wheel/buttons or two-finger touch, and use the minimap to change scale or recenter. Space pauses; M changes map scale; +/- zoom.
- Time controls and 30-day/1-year/10-year/100-year skips remain available on the map. During a long skip, speed changes and simulation mutations are blocked; the skip button cancels at the current date.

The individual-resident model still belongs to the original settlement. Other settlements use their existing population/facility model; their local maps show real facility totals, and do not fabricate individual residents. The UI change does not introduce player-character possession, family succession controls or direct walking orders.

## Assets

Kenney Tiny Town tiles and Lucide icons are embedded directly, without runtime CDN requests. See [third-party notices](../THIRD_PARTY_ASSETS.md). Simulation code and save migration remain in index.html.

## Validation

`node tests/simulate.mjs` runs the existing deterministic model audit.

For the optional browser audit, install Playwright and Chromium (`npm install --no-save playwright` and `npx playwright install chromium`), then run `node tests/map-surface.cjs`. A system Chromium can be supplied via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The audit checks actual map hit tests, all settlement entrances, real training and conserved trade, long-skip cancellation, drag and native touch zoom, responsive layouts and save/reload. Screenshots default to a temporary directory; set `EVERWORLD_TEST_ARTIFACTS` to choose a location.
