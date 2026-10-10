# Character neck/chest repair — 2026-10-10

This revision removes the internal lower-neck contour and matches only the exposed chest skin inside the collar to the existing neck palette. Face, hair, hands, clothing, layout and animation parameters are unchanged.

## Assets and compatibility

- `public/character/hero-v2/model.psd`: 1024×1024, the same 19 pixel layers, 2,786,377 bytes.
- PSD SHA256: `7024b75ee75919e3f9ce0f17b10e4bae52b05f4271e60da22e603038f5a193d3`.
- Poster SHA256: `bfefd2fe4cfecc165283be30b6f10a0688ad3af841405ad34c6c3174d51a7199`.
- Settings fingerprint: `2a8449-ebedfed1-b2d9b71b`; the renderer also continues recognizing original `59bd5a-29e0bf61-7f2cd949`.
- Both revisions retain the existing separated-arm and continuous-back-hair refinements. No character API, motion parameters, navigation, dependencies or hosting configuration changed.

## Verification

Only RGB changed: 369 neck pixels and 1766 topwear pixels. All layer alpha, bounds, names/order, visibility/blending and actual Rigger anchors are identical. Other 17 layers are RGBA-byte-identical; the edited layers and static poster are RGBA-byte-identical outside the bounded repair regions. `tests/fixtures/character-neck-baseline.json` preserves the original fingerprints, anchors and protected-pixel hashes without publishing the original photograph or PSD backup.

`tests/character-neck-repair.test.mjs` checks these invariants against the served PSD/poster and both model IDs using the exact decoder shipped with the renderer.

Before repository synchronization, the local authoring project passed build, typecheck and 168 tests. Sequential real-browser validation passed 77 checks: 18 deterministic parameter poses with wind/physics disabled produced identical actual WebGL vertex-upload hashes before/after; the animated homepage retained 30 renders/second, head and both ear taps, keyboard previews, Enter/HOME, offscreen pause, reduced-motion, WebGL loss/restoration and failed-model poster fallback. 1440/1024/390px screenshots were reviewed; mobile was Chromium emulation, not physical-device certification.

The editable layer PNGs, original backup and visual review artifacts remain in the local authoring project, not the public repository. No original reference photos or inference weights are added by this repair.
