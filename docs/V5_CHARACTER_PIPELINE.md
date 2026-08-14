# V5 Character 3D Pipeline

V5 proves the runtime independently from any cloud generator. The browser does **not** generate 3D assets. It renders and animates prepared character assets.

## Runtime contract

```text
Character source
  -> articulated runtime
  -> narrative state machine
  -> rope-aligned hand target
  -> Three.js renderer
  -> experience
```

Current V5 source: `AYA_3D`, a procedural articulated Three.js template with explicit pelvis, torso, neck, head, shoulders, elbows, hands, hips, knees and feet.

States:

```text
idle -> grab -> pull/effort -> release -> satisfaction -> idle
```

## Authoring controls

- Character ON/OFF
- Renderer: `AYA 3D` or V4 vector fallback
- Motion intensity
- Character scale
- Grip height calibration
- Character depth

## Future generated-asset path

Primary generation donors already available in Juanmaes83 GitHub:

1. `TRELLIS.2` — high-quality image-to-3D, PBR GLB target.
2. `ComfyUI-Trellis2` — Windows production workflow, remesh/simplify/multiview/projection tooling.
3. `Hunyuan3D-2` — lower hardware fallback for image-to-shape + texture.
4. `img2threejs` — character proportions, landmarks, likeness and skeleton contract.
5. `Image_to_Mesh_web` — browser 2.5D fallback/preview, not primary for articulated humanoids.

Target production contract:

```text
REFERENCE IMAGE
 -> background removal / landmarks
 -> TRELLIS.2 or Hunyuan3D
 -> GLB
 -> cleanup / remesh / simplify
 -> humanoid retopology + skeleton fitting
 -> skin weights
 -> animation retarget
 -> CHARACTER PACK
 -> V5 runtime
```

## Character Pack target schema

```json
{
  "id": "character-01",
  "name": "Character 01",
  "asset": "character.glb",
  "rig": "humanoid-v1",
  "hand": "RightHand",
  "states": ["idle", "grab", "pull", "effort", "release", "satisfaction"],
  "scale": 1,
  "gripOffset": [0, 0, 0]
}
```

## Explicit gap

Image-to-3D output is not automatically animation-ready. Generated arbitrary meshes still need a reliable humanoid rigging/skin-weight stage. V5 isolates that gap: the narrative runtime already exists and can accept a rigged template later without rebuilding the hanging-media engine.
