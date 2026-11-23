# Mossfall original Blender landmarks

Authored locally for ROLL Race with Blender 5.2.1, using the existing half.family palette. These are original editable meshes, not downloaded models or raster stand-ins. No third-party textures or libraries are required.

## Assets

| Asset | Geometry | GLB size | Runtime meshes |
|---|---:|---:|---:|
| `mossfall-half-arch-shrine.glb` | 10,460 triangles | 791,912 bytes | 11 |
| `mossfall-rope-footbridge.glb` | 22,480 triangles | 854,524 bytes | 6 |

The corresponding `.blend` file is the native editable source. The generator retains the semantic crafting process; exported mesh objects are merged by material to reduce draw calls. No Draco decoder is required.

The shrine has individually rounded arch stones, three stepped terraces, inset cobalt details, a suspended two-part cobalt crystal, offering coins, moss cushions, folded vine leaves, roots, mushrooms and two framed lanterns. The crystal is an Ethereum-inspired cultural detail, not official branding or a claim of sponsorship. The arch and palette follow half.family's established shape language.

The bridge has 24 separate deck planks, nail heads, underside beams, eight posts, layered lashing coils, sagging handrails, woven rope sides, end caps and cobalt cloth ties. It is intended only for an actual crossing with supported endpoints.

## Placement

- GLB uses Y up. Shrine floor is Y=0, centered horizontally; approximate footprint 3.9 × 2.5, height 4.28. Its front faces +Z.
- Bridge runs along local X. Endpoint post centers are X=−3 and X=+3. Deck is approximately Y=0; underside reaches Y=−0.18. Total width is 3.04, height above deck 1.55. Apply a uniform scale where possible. Any longitudinal stretch should stay modest to keep plank proportions believable.
- Ground shrine feet on a locally flattened platform; do not bury its lower step or position its base on a steep sampled slope.
- Place bridge deck between two confirmed banks with endpoints supported by terrain or abutments. It does not create a crossing or alter game rules by itself.
- All surfaces are rough, opaque metallic-roughness materials. Lantern cores have a restrained emissive material; no dynamic lights are exported.
- Shadows are enabled by the scene integrator. Do not use the full detailed bridge repeatedly across the island; it is a single hero prop.

## Reproduce

From `roll-race/`, in PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/mossfall-blender/build_landmarks.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/mossfall-blender/render_previews.py
```

The generator uses a fixed random seed. `*-preview.png` files are standalone Blender asset renders, not screenshots of the integrated game. Bounds and counts are saved in each asset's `.json` file.
