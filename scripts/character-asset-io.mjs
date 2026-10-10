import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Use the exact decoder shipped with the player, including its ImageData path.
const context = { Uint8Array, Uint8ClampedArray, ArrayBuffer, DataView, TextDecoder, TextEncoder };
context.self = context;
context.globalThis = context;
for (const name of ['ag-psd.min.js', 'rigger.js', 'runtime.js']) {
  vm.runInNewContext(readFileSync(new URL(`../public/vendor/anime25d/vendor/${name}`, import.meta.url), 'utf8'), context);
}
context.agPsd.initializeCanvas(undefined, (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const fingerprint = bytes => context.RigRuntime.fingerprint(bytes);
export const readPsd = bytes => context.agPsd.readPsd(new Uint8Array(bytes), { useImageData: true, skipThumbnail: true });
export const writePsd = psd => Buffer.from(context.agPsd.writePsdUint8Array(psd, { trimImageData: false, noBackground: true, generateThumbnail: false }));
export const anchorsOf = psd => JSON.parse(JSON.stringify(context.Rigger.buildRig(psd, { generic: false }).anchors));

export function rgbaAt(layer, x, y) {
  if (x < layer.left || x >= layer.right || y < layer.top || y >= layer.bottom) return [0, 0, 0, 0];
  const offset = ((y - layer.top) * layer.imageData.width + x - layer.left) * 4;
  return layer.imageData.data.subarray(offset, offset + 4);
}

export function layerSignature(layer, excludedRect) {
  const { width, height, data } = layer.imageData;
  const alpha = Buffer.alloc(width * height);
  const outside = createHash('sha256');
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    alpha[y * width + x] = data[offset + 3];
    const px = x + layer.left, py = y + layer.top;
    if (!excludedRect || px < excludedRect[0] || px >= excludedRect[2] || py < excludedRect[1] || py >= excludedRect[3]) {
      outside.update(data.subarray(offset, offset + 4));
    }
  }
  return { name: layer.name, bounds: [layer.left, layer.top, layer.right, layer.bottom],
    width, height, alphaSha256: sha256(alpha), rgbaSha256: sha256(data), outsideSha256: outside.digest('hex'),
    opacity: layer.opacity, blendMode: layer.blendMode, hidden: layer.hidden, clipping: layer.clipping };
}

export function outsideSignature(data, width, rect) {
  const hash = createHash('sha256');
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width, y = Math.floor(i / 4 / width);
    if (x < rect[0] || x >= rect[2] || y < rect[1] || y >= rect[3]) hash.update(data.subarray(i, i + 4));
  }
  return hash.digest('hex');
}

export function compositeAt(layers, x, y) {
  let rgba = [0, 0, 0, 0];
  for (const layer of layers) {
    if (layer.hidden) continue;
    const pixel = rgbaAt(layer, x, y), sa = pixel[3] / 255 * (layer.opacity ?? 1);
    if (!sa) continue;
    const da = rgba[3] / 255, out = sa + da * (1 - sa);
    rgba = [0, 1, 2].map(c => Math.round((pixel[c] * sa + rgba[c] * da * (1 - sa)) / out)).concat(Math.round(out * 255));
  }
  return rgba;
}
