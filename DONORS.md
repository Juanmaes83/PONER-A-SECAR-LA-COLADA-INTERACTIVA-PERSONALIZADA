# Donor map

The original donor repositories are READ ONLY. This project copies/adapts proven capabilities into a new independent experience.

## `Juanmaes83/BANDEROLAS-DINAMICAS`
Reused concepts/code patterns:
- ObjectURL based image/video ingestion.
- Live HTMLVideoElement lifecycle.
- Continuous texture refresh while video advances.
- Verlet cloth particles and structural/shear/bend constraints.
- Pointer grabbing and local deformation.
- Wind/drag/gravity cloth motion.

## `Juanmaes83/rope-gallery`
Reused concepts/code patterns:
- Horizontal hanging-gallery composition.
- Rope curve parameters.
- Card spacing and swing damping.
- Momentum, wheel response and drag-to-slide interaction.
- Clips/hardware positioning.
- Camera parallax.

## `Juanmaes83/ESCAPARATES-INMERSIVOS-DE-IMAGEN-VIDEO`
Reused concepts/code patterns:
- Persistent live video elements as media resources.
- `THREE.VideoTexture(video)` rather than rebuilding video frames as abstract data.
- Multiple user media slots and cleanup with `URL.revokeObjectURL`.
- Media manager semantics and realtime Three.js material application.
- Configurable post-processing / camera-oriented experience structure.

## `Juanmaes83/breeze`
Reference donor for later high-end evolution:
- Three.js WebGPU/TSL cloth rendering.
- Verlet physics architecture.
- Procedural forces/noise.
- HDR environment, ACES tone mapping, advanced lighting and shadows.

## Integration work in this repository
New work is limited to composing those proven capabilities into the lost hanging-media authoring experience shown in the reference video: multi-slot media, hanging cloth/paper surfaces, rope and clips, authoring controls, wall/light/material presets, persistence and realtime preview.
