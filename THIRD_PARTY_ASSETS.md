# Third-party assets

The game embeds these assets in index.html, so it does not need a third-party CDN at runtime.

- **Kenney Tiny Town 1.1**: https://kenney.nl/assets/tiny-town — Creative Commons Zero (CC0). The packed tile atlas is embedded as a PNG data URL. Buildings, vegetation, objects and terrain details use this atlas. Full distribution license: [Kenney-Tiny-Town.txt](licenses/Kenney-Tiny-Town.txt).
- **Lucide icons**: https://lucide.dev / https://github.com/lucide-icons/lucide — ISC, with Feather-derived icons under MIT. SVG symbols are embedded inline. The history icon comes from tag 0.468.0; other icons were retrieved on 2026-10-22. Both distribution notices are included in [Lucide.txt](licenses/Lucide.txt).

- **Kenney Tiny Dungeon 1.0**: https://kenney.nl/assets/tiny-dungeon — Creative Commons Zero (CC0). Guards and selected civic/specialist resident sprites are rendered from its packed atlas both on the map and in resident portraits. Sprite choice follows age, sex and role without consuming simulation randomness. Full distribution license: [Kenney-Tiny-Dungeon.txt](licenses/Kenney-Tiny-Dungeon.txt).
- **Kenney UI Pack Pixel Adventure 2.0**: https://kenney.nl/assets/ui-pack-pixel-adventure — Creative Commons Zero (CC0). Original thick-outline tiles 0000, 0001, 0006, 0039 and 0040 supply parchment panels, wooden buttons and round map pins. Images are embedded as CSS data URLs; panels/buttons use nine-slice border images rather than stretching their corners. Full distribution license: [Kenney-Pixel-Adventure-UI.txt](licenses/Kenney-Pixel-Adventure-UI.txt).

Resident movement, career decisions, simulation logic and save data remain part of this game. Portraits reuse the same resident sprite as the map, with a procedural background and leader marker.

- **Kenney Tiny Farm 1.0**: https://kenney.nl/assets/tiny-farm — Creative Commons Zero (CC0). The packed atlas is embedded in the HTML. Civilian work clothes, crops, livestock, grain barn and market produce use this matching 16px asset family. Full distribution license: [Kenney-Tiny-Farm.txt](licenses/Kenney-Tiny-Farm.txt).

The medieval release combines Tiny Town timber houses/stone halls, Tiny Farm civilian life and Tiny Dungeon guards/specialists. Seasonal ground, heraldic flags, workshop smoke, event UI and dynasty milestones are rendered by game code. Pixel Adventure UI remains embedded for legacy detailed panels; the main HUD now uses a compact timber/brass/linen palette with CSS borders.

## 새벽숲 / Frontier chapter

`frontier.html` uses extracted, unchanged PNG atlases from the existing embedded Kenney Tiny Town, Tiny Farm and Tiny Dungeon distributions under CC0 (`assets/frontier/`). Their original license notices above apply.

New icons downloaded from the official [Game-icons repository](https://github.com/game-icons/icons) on 2026-11-01:
- `assets/frontier/anvil.svg`: [anvil-impact](https://github.com/game-icons/icons/blob/master/lorc/anvil-impact.svg), icons made by **Lorc**.
- `assets/frontier/wheat.svg`: [wheat](https://github.com/game-icons/icons/blob/master/lorc/wheat.svg), icons made by **Lorc**.
- `assets/frontier/village.svg`: [village](https://github.com/game-icons/icons/blob/master/delapouite/village.svg), icons made by **Delapouite**.

SVG artwork is unmodified. Licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). The authors' distribution notice is retained in [Game-Icons.txt](licenses/Game-Icons.txt), and visible attribution is in the game's help/credits. No CDN or external asset requests are needed at runtime.

## 산들계곡 / Valley world (2026-11-01)

The new 3D world uses **KayKit Medieval Hexagon Pack 1.0.1**, created by **Kay Lousberg** ([creator](https://kaylousberg.itch.io/), [website](https://www.kaylousberg.com/)), under **CC0 1.0**. Eighteen selected building, construction, bridge, vegetation, rock and mountain models were retrieved from the [redistributable collection mirror](https://github.com/GeorgeQLe/assets-kaykit-3d-environments), commit `d5e6c73284e9385a389ac7181dec3d0dc9e9021d`, path `assets/kaykit/medieval-hexagon-pack-1.0.1/Assets/gltf/`. The collection's original creator notice and CC0 grant are retained verbatim in [KayKit-CC0.txt](licenses/KayKit-CC0.txt).

`assets/valley/models/*.glb` bundle the source glTF, original binary geometry and original PNG texture into single GLB files. Geometry and textures are unchanged; placement, lighting, scale and a subdued mountain tint are set by the renderer. No CDN is needed at runtime.

**Three.js 0.160.0** and its GLTFLoader/BufferGeometryUtils modules are vendored under `assets/vendor/three/`. Downloaded from the pinned npm distribution via jsDelivr. MIT license: [Three.txt](licenses/Three.txt). The rendering library and its loaders are unmodified.

Terrain, river ribbon, roads, lighting, worker figures, caravans and interface are game code. The official Kenney city-builder starter kit was evaluated during asset research; its modern buildings were not included in this medieval world.

Spring wells, barrels, deer habitat markers, log rafts, fishing skiffs, moorings, fishing rods and bows added for survival are procedural models authored in game code. They reuse Three.js primitives and introduce no additional third-party asset downloads.
