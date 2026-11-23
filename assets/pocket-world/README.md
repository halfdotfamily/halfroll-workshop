# Pocket Woods — original cottage and village

`pocket-cottage.glb` is an original editable Blender model created for this project, with the source scene in `pocket-cottage.blend`. Reproduce with Blender 5.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/pocket-world/build.py
```

The cottage uses actual individual staggered shingles, oak structural beams, cream limewash, inset framed windows, flower boxes, a round loft window, masonry chimney and porch steps. It is exported in 11 material batches, with no external texture or network requirements.

`world/pocket.js` places five cottages on sampled terrain foundations, stone stair approaches and gardens. A local plot search favors lower-slope sites. Cobalt, sage and terracotta roof variants, differing building heights and rotations distinguish homes. Rooted climbing ivy, boulders and grouped shrubs blend masonry into its hillside. Village props include picket fences, lantern posts, barrels, beehives, vegetable patches, a handcart and stacked firewood. All repeated meshes use Three.js instancing. Forest assets are the already downloaded **Kenney Nature Kit** CC0 GLBs from `assets/nature-mossfall`; see that folder's license and provenance. No new third-party models were obtained.

Placement metadata and verification are in `checks.json`. `pocket-preview.png` is an actual Three.js render of the isolated village over the shared terrain sampler; it intentionally excludes the other biomes and board sections. Regenerate with `node tools/pocket-world/check.mjs` and the project's local Playwright browser path. Ground clearance is checked against the complete route centerline, including each prop/plant's footprint radius. The village is decorative and adds no unimplemented gameplay effects.

## Woodland detail pass

The integrated world now has 55 trees and 560 plants, concentrated in irregular groves with shrub and mushroom understory. Six original faceted animals (two deer, two foxes and two rabbits) have pointed ears, muzzles, antlers or long tails, with gently animated heads and a static update(0) reduced-motion pose. Animal material geometry is merged; tree and plant geometry remains instanced. A single small timber woodland refuge carries an original copper Z seal inspired by Zcash, as an environmental legend only. The full fox-tail and deer-head footprint is included in route clearance checks.

CPU validation: node tools/pocket-world/check-cpu.mjs. It checks all six animals, the refuge, increased forest density, route clearance, and reduced-motion head reset. Last measured: 780 grounded placements, 92 region draw calls, about 115k triangles. New wildlife is authored directly in pocket.js and uses no downloaded models.
