/** Native Anime2.5DRig parameter names and ranges. MIT; upstream commit 7450341934a8ff77bf05b90d9f708786e3eb3996. */
export const defaultParams = Object.freeze({
  "angleX": 0,
  "angleY": 0,
  "angleZ": 0,
  "eyeOpenL": 1,
  "eyeOpenR": 1,
  "eyeX": 0,
  "eyeY": 0,
  "eyeSmile": 0,
  "brow": 0,
  "mouthOpen": 0,
  "mouthForm": 0,
  "mouthCY": 0,
  "body": 0,
  "physAmp": 2,
  "soft": 2,
  "browAngL": 0,
  "browAngR": 0,
  "browAngSym": 0,
  "bangL": 0,
  "bangC": 0,
  "bangR": 0,
  "armY": 0,
  "armPos": 0,
  "bust": 2.5,
  "bustY": 1,
  "irisScale": 1,
  "mouthEase": 0.72,
  "eyeEase": 0.3,
  "fhAmp": 2,
  "fhSoft": 0.4,
  "eyeCY": 0,
  "eyeCAng": 0,
  "mouthCAng": 0,
  "eyeScaleL": 1,
  "eyeScaleR": 1,
  "mouthScale": 1
});
export const parameterRanges = Object.freeze({
  "eyeSmile": [0, 1],
  "angleX": [
    -1,
    1
  ],
  "angleY": [
    -1,
    1
  ],
  "angleZ": [
    -1,
    1
  ],
  "eyeOpenL": [
    0,
    1
  ],
  "eyeOpenR": [
    0,
    1
  ],
  "eyeX": [
    -1,
    1
  ],
  "eyeY": [
    -1,
    1
  ],
  "irisScale": [
    0.5,
    1.3
  ],
  "eyeScaleL": [
    0.5,
    1.5
  ],
  "eyeScaleR": [
    0.5,
    1.5
  ],
  "eyeEase": [
    0,
    1
  ],
  "eyeCY": [
    -1,
    1
  ],
  "eyeCAng": [
    -1,
    1
  ],
  "brow": [
    -1,
    1
  ],
  "browAngSym": [
    -1,
    1
  ],
  "browAngL": [
    -1,
    1
  ],
  "browAngR": [
    -1,
    1
  ],
  "mouthOpen": [
    0,
    1
  ],
  "mouthForm": [
    -1,
    1
  ],
  "mouthCY": [
    -1,
    1
  ],
  "mouthEase": [
    0,
    1
  ],
  "mouthCAng": [
    -1,
    1
  ],
  "mouthScale": [
    0.5,
    1.5
  ],
  "fhAmp": [
    0,
    3
  ],
  "fhSoft": [
    0,
    2
  ],
  "bangL": [
    -1,
    1
  ],
  "bangC": [
    -1,
    1
  ],
  "bangR": [
    -1,
    1
  ],
  "body": [
    -1,
    1
  ],
  "armY": [
    -1,
    1
  ],
  "armPos": [
    -1,
    1
  ],
  "bust": [
    0,
    4
  ],
  "bustY": [
    -3,
    3
  ],
  "physAmp": [
    0,
    3
  ],
  "soft": [
    0,
    3
  ]
});
export const expressionPresets = Object.freeze({
  "neutral": {
    "eyeOpenL": 1,
    "eyeOpenR": 1,
    "brow": 0,
    "mouthOpen": 0,
    "mouthForm": 0,
    "irisScale": 1
  },
  "smile": {
    "eyeSmile": 1,
    "eyeOpenL": 0,
    "eyeOpenR": 0,
    "brow": 0.45,
    "mouthOpen": 0,
    "mouthForm": 0.9,
    "irisScale": 1
  },
  "usume": {
    "eyeOpenL": 0.5,
    "eyeOpenR": 0.5,
    "brow": 0.35,
    "mouthOpen": 1,
    "mouthForm": 0.8,
    "irisScale": 1
  },
  "surprise": {
    "eyeOpenL": 1,
    "eyeOpenR": 1,
    "brow": 1,
    "mouthOpen": 0.75,
    "mouthForm": -0.1,
    "irisScale": 0.7
  },
  "jito": {
    "eyeOpenL": 0.4,
    "eyeOpenR": 0.4,
    "brow": -0.6,
    "mouthOpen": 0,
    "mouthForm": -0.4,
    "irisScale": 1
  },
  "winkL": {
    "eyeOpenL": 0,
    "eyeOpenR": 1,
    "brow": 0.2,
    "mouthOpen": 0.4,
    "mouthForm": 0.7,
    "irisScale": 1
  },
  "winkR": {
    "eyeOpenL": 1,
    "eyeOpenR": 0,
    "brow": 0.2,
    "mouthOpen": 0.4,
    "mouthForm": 0.7,
    "irisScale": 1
  }
});
export function normalizeParams(value = {}, base = defaultParams) {
  const result = {...base};
  for(const [key, range] of Object.entries(parameterRanges)) {
    const n = value[key];
    if(n !== undefined) {
      if(typeof n !== 'number' || !Number.isFinite(n)) throw new TypeError('Non-finite character parameter: '+key);
      result[key] = Math.max(range[0], Math.min(range[1], n));
    }
  }
  return result;
}
/** An explicit eye closure envelope, sampled by the caller, not an autonomous timer. */
export function blinkAt(elapsed, hold = 0.08) {
  if(elapsed < 0) return 1;
  if(elapsed < 0.08) return 1 - elapsed / 0.08;
  if(elapsed < 0.08 + hold) return 0;
  if(elapsed < 0.24 + hold) return (elapsed - 0.08 - hold) / 0.16;
  return 1;
}
