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

## Button reachability review

The inspector now reserves the right-side map-control rail instead of covering zoom, fit and help controls. Narrow landscape layouts reserve separate space for the card, rail, clock and dock; redundant resource/minimap overlays are hidden there. Close and occupation controls use 44 px touch targets. Hidden map pins explicitly use display:none so the authored flex style cannot resurrect off-screen controls.

`node tests/button-reachability.cjs` checks all persistent clock, dock and map-control hit targets with six inspector types at six viewport sizes, then uses real touch to zoom, open help, close cards, skip 30 days and select a career after scrolling. The existing time-controls audit separately checks 24x, pause, long-skip cancellation and exact calendar advancement.

## Resident visibility and village framing

Village entry, initial loading and map-fit now calculate the camera from the actual viewport, reserved HUD space and resident positions. Portrait phones previously cropped the sides of the fixed-width map, hiding fields and forest workers. Overview zoom can go below 0.5; resident sprites receive a modest size correction at low zoom. Selecting a person restores at least 0.9 zoom. Resize refits an overview, while manual pan/zoom and person selection retain their camera intent.

The population indicator and resident dock locate actual people. Empty original settlements open their status and extinction history instead of silently doing nothing. Invalid or implausibly out-of-map saved display coordinates are repaired to the actual destination without adding people or altering resources. Neighbor actors also have an asset-loading fallback.

`node tests/resident-visibility.cjs` checks that all residents or aggregate representatives fit on screen in all five villages across five viewport sizes, that touch selection zooms to a real person, that map-fit is restored, and that extinct villages explain their history without fabricating population. It also checks coordinate repair leaves resources, population and RNG unchanged.

## Play-through feedback

After a real mobile play-through with a calendar-year skip, time results now compare the observed settlement's actual resident and house counts and show changes in surviving world settlements plus battles during the skipped interval. These comparisons use the same settlement before and after the skip even if the observer changes views. The compact time panel keeps the result; completion notices clear after 2.5 seconds.

Diplomacy previews the exact conserved exchange from a shared read-only offer calculation also used by the trade engine. Blocked trades state the actual cause (cooldown days, embargo, relations, dispute, ruin or insufficient exchange stock), with the unavailable button disabled. A rejected campaign shows its actual reason and retains the diplomacy card. History entries display full year/month/day instead of grouping everything under a year.

`node tests/play-review.cjs` performs actual touch navigation to diplomacy, executes and verifies conserved trade, checks cooldown feedback and a rejected campaign, skips 30 days and a calendar year, verifies the resulting comparisons and checks a dated history entry.

The play-through also reproduced stale same-card results while paused: pointer/key hold protection deferred inspector updates during the click handler, but no later simulation tick refreshed the card. Releasing the tracked pointer/key now schedules a refresh after the activation event, preserving the pressed element and showing the completed action immediately even while paused. The trade/cooldown test exercises this path with the simulation timer stopped.

## Resident-first view and quieter HUD

The opening view and settlement entry now focus the densest real resident neighborhood at human scale rather than shrinking the whole village into a phone screen. Adult sprites use 40 logical pixels, and neighborhood zoom guarantees at least 40 CSS pixels for an adult at supported viewport sizes. The fit-map action remains an explicit overview; manual pan, zoom and person selection retain camera intent. Fresh residents begin at their actual assigned destinations, reducing overlapping spawn clusters. Existing resident identities and economic state remain intact.

The HUD now uses compact dark controls and a light resident card, removing the repeated parchment/wood nine-slice frames. Village mini-map and floating building pins no longer cover the scene; buildings remain selectable directly on the map. The world map retains settlement labels and its mini-map. Touch targets and the separate clock/dock/control rail remain available.

`node tests/life-ui.cjs` checks visible, human-scale residents in all five settlements across phone, landscape and desktop sizes, direct touch selection, simplified HUD styling and save identity preservation. `resident-visibility.cjs` checks whole-map visibility only after the explicit fit action. `map-surface.cjs` now selects buildings through actual canvas hit tests and expects the simplified controls.

## Living survivors and native canvas rendering

A legacy extinction path set `abandoned` with up to three people still alive. That stopped both home daily simulation and resident movement, while the HUD continued to show those people and neighboring-world time kept advancing. Loading such a save now reconciles the flag without changing identities, population, date, stock or RNG. A settlement with living residents remains a crisis settlement; extinction occurs at zero living residents. The repair records its correction and retains the legacy ruin reason separately. Visual movement no longer depends on a stale abandonment flag, and the ruin tint requires zero population.

Residents can take bounded local steps at home, civic and workshop destinations as well as fields/forest sites. These display-only steps preserve the actual home/work destination and do not add economic work. Pause still freezes every actor.

Active village/world canvases now allocate the framebuffer from the current CSS bounds and device pixel ratio, then draw the existing 900 × 570 logical cover projection into that native buffer with smoothing disabled. CSS no longer stretches a fixed-size framebuffer; hit testing retains the same logical projection. Painting is capped at 30 fps while motion integrates separately. The animation loop schedules the next frame in a finally block so a transient render error cannot permanently terminate animation.

`node tests/survivor-motion.cjs` optionally accepts `EVERWORLD_LEGACY_HTML` and builds the screenshot's 1871 / three-survivor contradictory save through the previous game. It verifies preserved identity/resources/date/RNG, movement while the economy clock is stopped, pause, crisis versus true extinction and native 3× framebuffer dimensions.

## Families, lineages and resident coalitions

Marriage now forms an independent household when either spouse lives with adult relatives. Parents retain their households and land; the couple receives a proportional share of stored food, coins and cattle. Dependent children move with their parent when appropriate. Empty/single-spouse households still merge their existing property. No stock is created by marriage. Close ancestors, siblings and first cousins are excluded from courtship and marriage. Older adults can form companionship households; births require eligible adult spouses, maternal age, health, food, housing and birth spacing.

Children retain actual parent IDs, generation and inherited lineage. Descendants who establish a home, raise a child and remain independent for at least 180 days can found a branch clan with a recorded parent clan. Housing planning now considers newly formed families with dependent children as well as total population capacity. Existing identities and historic lineages remain intact.

Every 30 days, living clans organize into livelihood, production/trade or civic coalitions according to actual members' occupations and affinities, with a small continuity preference. A coalition requires at least two clans and four adult members. Coalitions choose a real adult representative, distribute grain from a surplus household to a needy affiliated household without creating food, and provide a shared-support bonus in the existing representative election. Non-hereditary leadership elections occur every three years; the current governing coalition is reflected in home polity metadata and border color. Membership loss can dissolve a coalition. These resident coalitions differ from the existing world polities that own settlements and land.

The map's Relationships dock opens paginated family, clan, coalition and world-polity cards. Resident Family opens a real household card with clickable portraits and relationship labels (self, spouse, parent, child, sibling). Family → clan → coalition navigation uses actual IDs. Single-person households are labeled independent households; family counts distinguish them. Other settlements continue to use the existing aggregate model, so selecting their world polity does not invent individual genealogies. The world tab retains territory visibility controls.

`node tests/society.cjs` verifies independent marriage and property conservation, preserved parent households and deeds, a real third-generation child and kinship restrictions, branch formation, distinct clan coalitions, conserved grain aid, actual election ballots, touch navigation and save/reload. A natural 900-day run separately verifies autonomous births and coalition formation. The boundary/fixture checks create controlled ages, housing and review dates for deterministic validation; they do not force those outcomes into normal games.
