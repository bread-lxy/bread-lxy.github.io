import type { CharacterAssets } from "./site";

/** Only generated/derived artwork is served; original photo references stay private. */
export const heroCharacterAssets: CharacterAssets = {
  posterUrl: "/character/hero-v2/poster.png",
  psdUrl: "/character/hero-v2/model.psd",
  settingsUrl: "/character/hero-v2/rig.json",
  accessories: [
    { layer: "topwear_1", root: [318, 325], tip: [133, 696], width: 120, amplitude: 10 },
    { layer: "topwear_2", root: [701, 337], tip: [933, 676], width: 150, amplitude: 10 },
  ],
};

// Enable only after this character's poster, PSD and on-page rig pass inspection.
export const heroCharacterEnabled = true;
