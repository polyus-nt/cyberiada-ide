# CyberBear simulator artwork

Source: [Figma, МС-ТЮК → Кибериада_КиберМишка → Frame](https://www.figma.com/design/UR7PC1DSIKt5eEHUqoQoPi?node-id=1412-2796).

The original vector artwork uses a 253 × 381 coordinate system.

- `body.svg` preserves the original body and all 35 unlit matrix sockets.
  The surrounding Figma canvas and example illumination have been removed.
- `matrix-led.svg` contains one original illuminated LED and its highlight,
  centred at (7, 7). `CyberBearView` repeats it over the matrix sockets, with
  opacity set to the corresponding brightness divided by 100.
- `cyberBearArtwork.ts` in the Simulator component directory preserves the
  original matrix coordinates and eye paths, including the eye sockets.
  Eye colours come from RGBK state; a dark eye has no halo.
- `face.svg` preserves the original muzzle above the eye layers.

Keep these layers aligned when replacing artwork. State changes apply immediately;
there are no CSS transitions or independent animation timers.
