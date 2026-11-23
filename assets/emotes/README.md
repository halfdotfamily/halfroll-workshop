# Emote props

`paper-plane.glb` is a 2,908-byte adaptation of **Paper Airplane**, Clint Bellanger (2010).

- Author/source: https://opengameart.org/content/paper-airplane
- Original: https://opengameart.org/sites/default/files/paper_airplane_0.blend
- License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Changes: normalized to a 1.5-unit glTF model, centered, cream/fold materials; original folded geometry retained. Nose points along +Z, up +Y.
- Rebuild with Blender: `blender -b --python tools/export-emote-plane.py -- source.blend`.

Optional model load has a folded geometry fallback. No external runtime requests.
Bubble spheres/highlights and Critter-specific attached hands are original procedural geometry.

Research considered Quaternius Universal Animation Library (https://quaternius.com/packs/universalanimationlibrary.html) and Kenney Particle Pack (https://kenney.nl/assets/particle-pack). Neither is bundled: humanoid rigs do not match these Critters; actual spheres preserve bubble depth under camera rotation.
