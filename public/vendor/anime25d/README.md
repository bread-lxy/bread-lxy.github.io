# Anime2.5DRig character runtime extraction

Upstream: https://github.com/852wa/Anime2.5DRig

Pinned commit: `7450341934a8ff77bf05b90d9f708786e3eb3996`. All core rendering, feature deformation, iris stencil masks, mesh construction and dual hair springs are mechanically copied from `lib/app.js`; see `SOURCE.json`. MIT license retained. Vendored `ag-psd` MIT license is in `vendor/LICENSE-ag-psd`. No upstream sample PSD is included in this runtime asset directory.

## Browser usage

Copy this entire directory as static same-origin assets. Import the ESM entry by URL; do not pass the legacy vendor files individually through a bundler's CommonJS transform. Vendor modules install `Rigger`, `RigRuntime`, and `GenericParts` globals but do not touch DOM or acquire device inputs.

```js
const runtimeUrl = new URL('/vendor/anime25d/character-player.js', location.origin).href;
const { createCharacterPlayer, blinkAt, expressionPresets } = await import(/* @vite-ignore */ runtimeUrl);
const player = await createCharacterPlayer({
  canvas,
  psdUrl: '/characters/hero/model.psd',
  signal: abortController.signal,
  // Optional upstream exported settings JSON, fingerprint must match exact PSD bytes.
  // settingsUrl: '/characters/hero/model.rigsettings.json',
  layerOverrides: { headwear: { group: 'body', depth: 0.90 } },
  // Optional: use names and source-pixel coordinates from the actual PSD.
  // accessories: [{layer:'exact-normalized-layer-name',root:[x0,y0],tip:[x1,y1],width:40,amplitude:18}],
});
player.resize(650, 850, Math.min(devicePixelRatio, 2));
// The host owns RAF, smoothing, input, action priority and visible-time clock.
player.render({
  angleX: pointerX * 0.4,
  angleY: -pointerY * 0.25,
  eyeX: pointerX * 0.7,
  eyeY: pointerY * 0.5,
  eyeOpenL: blinkAt(timeSinceBlink),
  eyeOpenR: blinkAt(timeSinceBlink),
  bust: 0,
}, visibleTimeSeconds);
// Reduced motion: render once, without an ongoing RAF.
player.render({ physics: false, wind: false, breath: 0, breathHead: 0 }, 0);
player.dispose();
```

Host integration change (2026-09-10): the host handles `webglcontextrestored` by disposing the old player and creating exactly one new instance. This adapter no longer performs a competing internal reinitialization. Call `dispose()` even after a frame failure. `render()` returns `false` when disposed/context-lost; the host should show its static poster. The earlier independent sample restore check in `VERIFICATION.json` predates this ownership change; current React lifecycle tests cover the replacement behavior.

`render(params, timeSeconds=0)` merges each frame over loaded base settings (not over the last frame). It does not smooth values, run auto-blink, start random talking, install pointer handlers or request animation frames. `blinkAt` is a deterministic helper; first 80ms closes, default 80ms holds, 160ms opens. Smiles/winks can use `expressionPresets`; these are the upstream presets, not new facial artwork.

`resize(width,height,dpr=1)` takes CSS pixel bounds and updates backing store with DPR capped at 2. It draws an aspect-preserving centered contain viewport. The host sets canvas CSS dimensions. `getMetadata()` returns model fingerprint, source dimensions, anchors, layer group/depth/mesh counts, source warnings, generated-difference flags and base params.

`createCharacterPlayer` also accepts a pre-built `rig` object, allowing tests or offline PSD preprocessing to bypass browser PSD decoding. This is a full upstream rig with RGBA `img.data` typed arrays, not a URL layer manifest. A layers-image manifest loader is intentionally not implemented: the primary input is a See-through PSD, and inventing another format is unnecessary for the first integration.

## Native parameters

`defaultParams`, `parameterRanges`, `expressionPresets`, `normalizeParams`, `blinkAt` are exported. `defaultParams` is exact upstream data (including bust=2.5), while the player's no-settings base defaults set `bust:0` for the homepage. Prefer partial params and let model-specific settings provide alignment values.

- Pose: `angleX`, `angleY`, `angleZ`, `body`, each [-1,1]. These are normalized 2.5D deformation amounts, not degrees.
- Eyes: `eyeOpenL/R` [0,1], `eyeX/Y` [-1,1], `irisScale` [.5,1.3]. `L/R` denotes left/right in image coordinates as detected by upstream.
- Expression: `brow`, `browAngL/R/Sym`, `mouthForm` [-1,1], `mouthOpen` [0,1]. Closed mouth does not receive `mouthForm` bending in upstream; dedicated happy-mouth artwork is needed for a different closed-mouth smile.
- Rig alignment: `eyeScaleL/R`, `mouthScale`, `eyeCY`, `eyeCAng`, `mouthCY`, `mouthCAng`, `eyeEase`, `mouthEase`.
- Hair: `physAmp` [0,3], `soft` [0,3], `fhAmp` [0,3], `fhSoft` [0,2]; `bangL/C/R` [-1,1]. Hair mesh deformation uses per-vertex strand weights and two springs per strand.
- Body: `armY`, `armPos` [-1,1], `bust` [0,4], `bustY` [-3,3]. Leave `bust:0` unless explicitly desired.
- Adapter controls: `physics:false` suppresses hair displacement, `wind:false` suppresses procedural wind; explicit `breath`/`breathHead` replace the 3.4-second breathing cycle. Optional `blinkVariant:2` selects custom long-closed-eye artwork when present. `irisBounceX/Y` optionally applies the upstream iris stretch.

## Optional cloth accessory spring

`createCharacterPlayer({ accessories:[{layer,root,tip,width,amplitude}] })` adds a local bend to an exact normalized layer name. Coordinates, full strip `width`, and maximum tip `amplitude` are in original PSD pixels. `root` and `tip` are `[x,y]`; the root stays fixed relative to the existing binding, and the delta acts perpendicular to the root-to-tip axis. It is applied before the original body's rotation, so body/head attachment is preserved. Multiple entries can target separate regions of the same layer.

Weights are exactly zero before/on the root, beyond the tip, and at/outside half the strip width. Along-axis weighting increases quadratically, and side edges smoothly taper. No other layer receives a delta. This is an intentionally explicit local mesh extension, not automatic accessory detection. An unknown/ambiguous layer or a region with no movable mesh vertices rejects model creation so incorrect calibration is visible.

`render({earImpulse:1}, timeSeconds)` injects a short positive force; use `-1` for the reverse direction. A held value kicks only once. Release to zero or a decaying impulse envelope does not kick backwards. A new rising magnitude or reversed direction kicks again. Wind is weak and deterministic. `physics:false` immediately clears accessory displacement and spring state; `wind:false` removes idle wind while still allowing clicks. Amplitude limits the absolute lateral offset of each spring; overlapping entries may add their effects.

Pure functions live in `accessory-spring.js`. These are labeled adapter additions, distinct from the copied upstream kernels. `getMetadata().accessories` reports exact names, region settings, and movable vertex counts for calibration.

## PSD requirements and custom assets

- RGB, 8bit, at most 128MB, 24M canvas pixels, 16,384px per side; upstream also validates total layer pixels and GPU limits.
- Base names: face, eyewhite, irides, eyelash, eyebrow, mouth_open (or mouth), mouth_close, eye_close, nose, ears, neck, topwear, bottomwear, handwear, headwear, front hair, back hair. `front hair_1`, `back hair_2` etc. create independent hair strand groups.
- Keep the eyes complete and separated from face texture. Missing closed-eye/mouth assets use bundled generic differences by default; pass `generic:false` to disable, or your own `{eyeL,eyeR,mouth}` RGBA parts.
- Layer order is PSD draw order; depth independently controls 2.5D parallax. Settings layer IDs are `z:name`, and the exported array also defines draw order.
- Settings cannot be blindly reused after a PSD is regenerated: fingerprint and layer IDs change. Preserve tuning intentionally and verify new alignment.
- Dropped hood belongs to torso: override its `group:'body'`, not the default `headwear` head-following behavior. Long bunny ears on a dropped hood do not automatically become hair strands. Use the optional exact-region accessory extension only after inspecting the real PSD layer and coordinates.
- Auto-rig derives anchors and initial deformation heuristically. It does not repair missing occluded artwork, produce 3D rotation, or eliminate the need to visually tune neck/eye/hood artifacts.

## Validation

Upstream pure tests passed: 16 rigger scenarios, runtime validation/settings/mesh limits/springs, two actual PSD worker imports and cleaned PSD round trips. Independent Chromium test loaded `sample2.psd`, verified 20 parts / 649 vertices / 11 strands, non-rigid vertex deltas, alpha transparency, eye closure changes, DPR resize, no WebGL errors, rejected invalid numeric params, WebGL context restore, idempotent dispose and early abort. See `VERIFICATION.json`. Samples were tested from the upstream clone and are not part of this asset package.

The renderer is tested with upstream samples; the user's generated PSD has not yet been tested. Main owner must inspect the real model before replacing fallback on the homepage.

The accessory extension passed 5 pure unit cases and an independent real-WebGL synthetic fixture check: 4 root-row vertices fixed, tip vertex moving, 24 out-of-strip vertices unchanged, 0 other-layer vertex changes, and exact neutral geometry after `physics:false`. Missing layer names reject cleanly. This validates the mechanism, not final bunny-ear calibration.
