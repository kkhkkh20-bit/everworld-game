# Third-party assets

The game embeds these assets in index.html, so it does not need a third-party CDN at runtime.

- **Kenney Tiny Town 1.1**: https://kenney.nl/assets/tiny-town — Creative Commons Zero (CC0). The packed tile atlas is embedded as a PNG data URL. Buildings, vegetation, objects and terrain details use this atlas. Full distribution license: [Kenney-Tiny-Town.txt](licenses/Kenney-Tiny-Town.txt).
- **Lucide icons**: https://lucide.dev / https://github.com/lucide-icons/lucide — ISC, with Feather-derived icons under MIT. SVG symbols are embedded inline. The history icon comes from tag 0.468.0; other icons were retrieved on 2026-10-22. Both distribution notices are included in [Lucide.txt](licenses/Lucide.txt).

- **Kenney Tiny Dungeon 1.0**: https://kenney.nl/assets/tiny-dungeon — Creative Commons Zero (CC0). Guards and selected civic/specialist resident sprites are rendered from its packed atlas both on the map and in resident portraits. Sprite choice follows age, sex and role without consuming simulation randomness. Full distribution license: [Kenney-Tiny-Dungeon.txt](licenses/Kenney-Tiny-Dungeon.txt).
- **Kenney UI Pack Pixel Adventure 2.0**: https://kenney.nl/assets/ui-pack-pixel-adventure — Creative Commons Zero (CC0). Original thick-outline tiles 0000, 0001, 0006, 0039 and 0040 supply parchment panels, wooden buttons and round map pins. Images are embedded as CSS data URLs; panels/buttons use nine-slice border images rather than stretching their corners. Full distribution license: [Kenney-Pixel-Adventure-UI.txt](licenses/Kenney-Pixel-Adventure-UI.txt).

Resident movement, career decisions, simulation logic and save data remain part of this game. Portraits reuse the same resident sprite as the map, with a procedural background and leader marker.

- **Kenney Tiny Farm 1.0**: https://kenney.nl/assets/tiny-farm — Creative Commons Zero (CC0). The packed atlas is embedded in the HTML. Civilian work clothes, crops, livestock, grain barn and market produce use this matching 16px asset family. Full distribution license: [Kenney-Tiny-Farm.txt](licenses/Kenney-Tiny-Farm.txt).

The medieval release combines Tiny Town timber houses/stone halls, Tiny Farm civilian life and Tiny Dungeon guards/specialists. Seasonal ground, heraldic flags, workshop smoke, event UI and dynasty milestones are rendered by game code. Pixel Adventure UI remains embedded for legacy detailed panels; the main HUD now uses a compact timber/brass/linen palette with CSS borders.
