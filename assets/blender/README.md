# Substition renewal loop

Original 3D brand illustration created specifically for this project. The procedural scene contains an organic glazed jade loop, polished silver companion ring, and peach porcelain orb. No external models, textures, photography, fonts, or stock assets are used.

- `create_renewal_loop.py` is the reproducible Blender 4.3 source.
- `renewal-loop.blend` is the editable scene, including materials, studio lights, camera, and transparent shadow catcher.
- `../../public/images/renewal-loop.png` is the transparent 960 × 960 render.
- `../../public/images/renewal-loop.webp` is the compressed transparent web asset.

Regenerate from the project root:

```sh
blender --background --python assets/blender/create_renewal_loop.py
```

The scene uses CPU Cycles at 96 samples without denoising, for compatibility with Blender builds that omit OpenImageDenoise. The soft grounding shadow is part of the transparent image; display on a pale mint or neutral background.
