# Album assets — 2026-09-11

Source acquisition and integration record. Source files were downloaded unchanged; the website serves the derivatives listed below. The existing original character was not regenerated or redesigned.

## Shipped derivatives

- `bodoni-roman.woff2`, `bodoni-italic.woff2`: Latin subsets of the fonts below; variable weight and optical axes retained.
- `noto-sc.woff2`: subset of the current application's Chinese and Latin text. Font fallback covers future characters; rerun the typography builder after adding new text.
- `fusion-pixel.woff2`: unchanged 12px proportional Simplified Chinese release font. Main navigation and dialogue use 24px, a 2× design grid.
- `wordmark.svg`: original XUEYING LU mixed Roman/Italic typesetting, Bodoni Moda weight 500 / optical size 96, converted to editable vector outlines. It is not the TRANSFORM logo or its custom font.
- `paper.jpg`, `metal.jpg`: the unmodified two-dimensional Color maps below, rendered with their original aspect ratio.
- Typography is reproducible with `scripts/build-album-type.py` in the source project. Fonts retain their upstream OFL notices.
- PowerGlitch 2.5.0 is bundled from its MIT-licensed npm distribution; notice: `PowerGlitch-MIT.txt`; source: https://github.com/7PH/powerglitch.
- The research-world transition adapts the **Stack** cover/reveal choreography from Codrops Interlude; original MIT notice including `Copyright (c) 2026 Codrops`: [`Codrops-Interlude-MIT.txt`](Codrops-Interlude-MIT.txt). Upstream source: https://github.com/codrops/interlude/blob/main/src/transitions/stack.ts; upstream license: https://github.com/codrops/interlude/blob/main/LICENSE. Only the transition logic is adapted, not the Astro router or demo assets.
- `research-housing.webp`: Zongnan Bao's monochrome residential-building photograph from Chongqing, used only as an editorial image in the research-world cover, never as a CHFS sample, field record, or research evidence. Source and license are documented below.

## Fonts

### Bodoni Moda

- Source: https://github.com/google/fonts/tree/main/ofl/bodonimoda
- Upright: `BodoniModa[opsz,wght].ttf` — 162,104 bytes.
- Italic: `BodoniModa-Italic[opsz,wght].ttf` — 176,300 bytes.
- Both verified with fontTools: weight 400–900, optical size 6–96.
- License: SIL Open Font License 1.1; `BodoniModa-OFL.txt` (4,400 bytes).
- Direct upright: https://raw.githubusercontent.com/google/fonts/main/ofl/bodonimoda/BodoniModa%5Bopsz%2Cwght%5D.ttf
- Direct italic: https://raw.githubusercontent.com/google/fonts/main/ofl/bodonimoda/BodoniModa-Italic%5Bopsz%2Cwght%5D.ttf
- Direct license: https://raw.githubusercontent.com/google/fonts/main/ofl/bodonimoda/OFL.txt

### Noto Sans SC

- Source: https://github.com/google/fonts/tree/main/ofl/notosanssc
- `NotoSansSC[wght].ttf` — 17,772,300 bytes. This is the original full variable TTF, not a web subset.
- Verified with fontTools: weight 100–900. Family name table uses `Noto Sans SC Thin`; the font is variable.
- License: SIL Open Font License 1.1; `NotoSansSC-OFL.txt` (4,388 bytes).
- Direct font: https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf
- Direct license: https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt

### Fusion Pixel

- Latest release verified: 2026.09.01, https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.09.01
- `fusion-pixel-12px-proportional-zh_hans.otf.woff2` — 661,212 bytes, extracted unchanged.
- Verified with fontTools: family `Fusion Pixel 12px Prop zh_hans`, weight 400, 36,558 mapped codepoints. All characters in `经历研究项目创作生活` exist in its cmap.
- Main navigation and guide dialogue were checked in the browser at 24 CSS px (2× the 12px design grid).
- Archive: `fusion-pixel-font-12px-proportional-otf.woff2-v2026.09.01.zip` — 3,354,880 bytes.
- Archive SHA256 matches GitHub's published digest: `96a105bf90600c9f589629b7e9cf61ab4d498f1a9af33b6ac6f517d217a3393c`.
- Direct archive: https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.09.01/fusion-pixel-font-12px-proportional-otf.woff2-v2026.09.01.zip
- License: SIL Open Font License 1.1; the release's `OFL.txt` is preserved as `FusionPixel-release-OFL.txt`.
- Also preserved the release's bundled third-party notices as `FusionPixel-ArkPixel-OFL.txt`, `FusionPixel-Cubic11-OFL.txt`, and `FusionPixel-Galmuri-LICENSE.txt`.
- Source license additionally downloaded as `FusionPixel-LICENSE-OFL.txt`: https://raw.githubusercontent.com/TakWolf/fusion-pixel-font/2026.09.01/LICENSE-OFL

## Flat, tileable textures

Both Color files were extracted unchanged from the official 1K JPG material archives and visually checked: they are flat two-dimensional material textures, not sphere preview renders.

### Paper001

- Source: https://ambientcg.com/view?id=Paper001
- Archive: `Paper001_1K-JPG.zip` — 5,028,873 bytes.
- Direct archive: https://ambientcg.com/get?file=Paper001_1K-JPG.zip
- Extracted Color: `Paper001_1K-JPG_Color.jpg` — 398,173 bytes, **1024 × 600**. The official 1K map is not square; preserve its aspect ratio.

### Metal032

- Source: https://ambientcg.com/view?id=Metal032
- Archive: `Metal032_1K-JPG.zip` — 3,650,556 bytes.
- Direct archive: https://ambientcg.com/get?file=Metal032_1K-JPG.zip
- Extracted Color: `Metal032_1K-JPG_Color.jpg` — 701,900 bytes, **1024 × 1024**.
- The archive contains a real Color map, so Roughness substitution was unnecessary.

### Texture license

- ambientCG identifies all downloadable assets as **Creative Commons CC0 1.0 Universal**.
- Official license source: https://docs.ambientcg.com/license/
- License deed: https://creativecommons.org/publicdomain/zero/1.0/
- Commercial use and redistribution are permitted; attribution is not required. Preserve provenance in the site's asset credits if appropriate.

## Research cover editorial photograph

- Photographer: **Zongnan Bao**. Official photo page: https://unsplash.com/photos/grayscale-photo-of-concrete-building-JnMvUcEfwQ4. The page identifies the location as Chongqing, China and labels the image free to use under the Unsplash License.
- Requested source rendition: https://images.unsplash.com/photo-1620321271188-3f1043222e80?fm=jpg&w=1200&q=80 (1200 × 800 JPEG, 253,154 bytes at acquisition).
- Shipped derivative: `public/album/research-housing.webp` (1200 × 800 WebP, 137,998 bytes). Converted from that JPEG with `sharp` at quality 76, effort 6; no content added or retouched. Both the downloaded and compressed images were visually checked for building and window detail.
- License: https://unsplash.com/license. It permits downloading, copying, modifying, distributing, and using this image for free, including commercial use; attribution is appreciated but not required. It forbids selling images without significant modification or compiling Unsplash images into a competing service. This use is a single editorial image, not either prohibited use.
- Attribution if displayed: “Photo by Zongnan Bao on Unsplash.” The image suggests a housing context only; it must not be presented as a photograph from the paper's survey or empirical dataset.
