# Map-first surface

The game opens directly into the village map. The old fixed header, KPI strip, sidebar and footer no longer consume the viewport. An optional detailed-record overlay preserves access to the existing simulation records.

- Click residents: portrait, health, energy, household food, follow, highlight family, and actual career training.
- Click houses, crops, the granary, workshop, forest, river or hall: inspect the corresponding simulation state in a compact map popup.
- Click a settlement on the world map: enter it, inspect history or open trade/expedition actions. The source settlement is named explicitly; stock transfer and campaigns call the existing model.
- Drag either map, zoom with the wheel/buttons or two-finger touch, and use the minimap to change scale or recenter. Space pauses; M changes map scale; +/- zoom.
- Time controls and 30-day/1-year/10-year/100-year skips remain available on the map. During a long skip, speed changes and simulation mutations are blocked; the skip button cancels at the current date.

The individual-resident model still belongs to the original settlement. Other settlements use their existing population/facility model; their local maps show real facility totals, and do not fabricate individual residents. The UI change does not introduce player-character possession, family succession controls or direct walking orders.

## Assets

Kenney Tiny Town buildings/terrain, Tiny Dungeon human sprites, Pixel Adventure UI frames/buttons and Lucide icons are embedded directly, without runtime CDN requests. Map residents and card portraits use the same sprite; parchment/wood UI pieces use nine-slice borders. See [third-party notices](../THIRD_PARTY_ASSETS.md). Simulation code and save migration remain in index.html.

## Validation

`node tests/simulate.mjs` runs the existing deterministic model audit.

For the optional browser audit, install Playwright and Chromium (`npm install --no-save playwright` and `npx playwright install chromium`), then run `node tests/map-surface.cjs`. A system Chromium can be supplied via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The audit checks actual map hit tests, all settlement entrances, real training and conserved trade, long-skip cancellation, drag and native touch zoom, responsive layouts and save/reload. Screenshots default to a temporary directory; set `EVERWORLD_TEST_ARTIFACTS` to choose a location.

## Time controls and input fixes

- The clock occupies reserved screen space above map popups; its buttons have a minimum 44 × 44 px target. Tablet/landscape layouts keep the clock and map dock apart.
- Skip opens a dedicated panel with 30-day, 1-year, 10-year and 100-year choices. The map clock, progress notice and time panel provide cancellation during long skips. Progress notices have intrinsic height and do not intercept the map behind them.
- A 50 ms clock accumulates elapsed time at `speed / 700` simulated days per millisecond, with bounded batches for input responsiveness. The old 24x path advanced only two days per 150 ms (about 9.33x). Paused/skip intervals do not accumulate catch-up time.
- Map pin identities and unchanged inspector actions persist across simulation renders. Pressed/focused controls are preserved, and Space/Enter on buttons retain their normal keyboard behavior. An opened inspector stays in place instead of following a moving resident underneath the pointer. The canvas framebuffer is only resized when dimensions change.

Run `node tests/time-controls.cjs` after installing Playwright as above. It checks real touch input while resident cards are open across six viewport sizes, held actions across fast ticks, pause and cancellation, exact 1x/6x/24x clock advancement, and leap-year calendar skipping.

## Resident activity

Original-settlement residents now take short, bounded steps within their actual work site after arrival, with pauses between tasks. Farm movement stays inside the assigned plot; long journeys retain their road route and speed cap. Work tools animate while time is running.

Other settlements draw up to 64 visual representatives based on current population, homes, farms, schools and soldiers. They follow door-to-lane-to-work routes, work for a while, then return home. These are view-only actors rather than invented personal simulation records; selecting one opens aggregate population information. Visual actors are removed when population reaches zero, and other settlements remain animated after the original settlement is abandoned. Houses sit beside streets instead of directly on them.

`node tests/resident-activity.cjs` checks workplace bounds, visible movement in all four neighboring villages, pause/resume, unchanged economy and random state, continued activity after the original settlement falls, and removal of ghost residents. It uses the Playwright setup described above.

## Population and professions

New worlds start with 64 individually simulated residents, including six children with actual parents, and 25 occupations. Four neighboring settlements start with 56, 72, 88 and 104 people. Homes, fields, supplies and initial territory scale with the larger population. Existing saves retain their population, identities and resources; the settings action “64명 시작” explicitly creates a fresh world.

Eight added occupations perform actual model work: loggers harvest timber, quarriers produce stone, builders advance projects, smiths make existing tools, healers consume food to treat patients, teachers support research and child education, bakers convert grain into bread, and foresters restore woodland. Bread participates in food consumption, storage, spoilage and trade without adding calories during processing. New professions have workplace routes and map visuals using the existing embedded assets.

The resident inspector's “직업” action opens a categorized roster with real counts. Career training uses the same livelihood, production and community categories. Leadership and childhood appear in the roster but are not ordinary training choices. Neighbor sprites continue to represent aggregate settlement activity, rather than fabricated individual records.

Run `node tests/professions.cjs` with Playwright to verify starting scale, parents, actual profession output, food conservation, roster selection, career training and mobile input. Optionally set `EVERWORLD_LEGACY_HTML` to a previous index.html to verify that an old save's population, resources and identities survive loading.
