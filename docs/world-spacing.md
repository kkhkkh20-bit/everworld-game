# Settlement distribution and map review

New worlds place the six founding settlements across both sides of the continent, rather than within the old central 40-tile cluster. Site selection searches for the matching biome while reserving 22 tiles between founding settlements. Twenty seeded worlds verify land, biome, spacing and coverage. Existing saves retain positions and borders.

Colonies search 11–18 tiles from the parent and reserve 10 tiles from existing settlements, including ruins. Selection favors space for growth and rejects direct corridors across open sea. This is a coastal barrier check, not full transport pathfinding. Colonization retains existing population and material costs.

World fit now uses the actual viewport and HUD margins rather than a fixed minimum zoom. Labels attempt alternate vertical placements before hiding, and six founding towns fit and open their cards on a 390×844 mobile viewport.

Review limitation: spreading settlements delays contact. In two five-year seeded runs, each world reached 12 living settlements, with over 640 trades and no original-town starvation deaths, but no battles. War remains driven by hostility and territorial contact; do not interpret a quiet first five years as a broken siege system. Trade still uses aggregate regional transfers rather than physically routed caravans.

Checks: tests/world-spacing.cjs, tests/world-spacing-ui.cjs, tests/terrain-war.cjs, tests/siege-assault.cjs and tests/simulate.mjs.
