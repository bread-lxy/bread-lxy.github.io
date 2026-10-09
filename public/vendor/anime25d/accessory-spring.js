/**
 * Optional exact-layer cloth accessory deformation. MIT.
 * Adapter addition; not part of the original Anime2.5DRig upstream.
 * Coordinates and amplitude are measured in original PSD pixels.
 */
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const smooth = value => value * value * (3 - 2 * value);

export function createAccessorySpring(config, vertices, phase = 0) {
  if (!config || typeof config.layer !== 'string' || !config.layer.length) throw new TypeError('Accessory requires an exact layer name');
  for (const key of ['root', 'tip']) {
    if (!Array.isArray(config[key]) || config[key].length !== 2 || !config[key].every(Number.isFinite)) throw new TypeError('Accessory '+key+' must be [x,y] in source pixels');
  }
  if (!Number.isFinite(config.width) || config.width <= 0) throw new TypeError('Accessory width must be positive');
  if (!Number.isFinite(config.amplitude) || config.amplitude < 0) throw new TypeError('Accessory amplitude must be non-negative');
  if (!vertices || vertices.length % 2) throw new TypeError('Accessory vertices must contain x/y pairs');
  const dx = config.tip[0] - config.root[0], dy = config.tip[1] - config.root[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.001) throw new RangeError('Accessory root and tip must be different');
  const axisX = dx / length, axisY = dy / length, normalX = -axisY, normalY = axisX;
  const halfWidth = config.width / 2;
  const weights = new Float32Array(vertices.length / 2);
  for (let v = 0; v < weights.length; v++) {
    const x = vertices[v * 2], y = vertices[v * 2 + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Accessory vertices must be finite');
    const rx = x - config.root[0], ry = y - config.root[1];
    const along = (rx * axisX + ry * axisY) / length;
    const across = Math.abs(rx * normalX + ry * normalY);
    // Compact support: all points at/before root, after tip, or outside strip stay exactly unchanged.
    if (along <= 0 || along > 1 || across >= halfWidth) continue;
    weights[v] = along * along * smooth(1 - across / halfWidth);
  }
  return {
    layer: config.layer,
    root: [...config.root], tip: [...config.tip], width: config.width,
    amplitude: config.amplitude, normalX, normalY, weights,
    phase, x: 0, velocity: 0, offset: 0, previousImpulse: 0,
  };
}

export function resetAccessorySpring(spring) {
  spring.x = spring.velocity = spring.offset = spring.previousImpulse = 0;
}

/** A held impulse kicks once; a decaying envelope/release does not kick backwards. */
export function advanceAccessorySpring(spring, { time = 0, dt = 0, impulse = 0, physics = true, wind = true } = {}) {
  if (![time, dt, impulse].every(Number.isFinite)) throw new TypeError('Accessory frame values must be finite');
  const value = clamp(impulse, -1, 1);
  if (!physics) {
    resetAccessorySpring(spring);
    spring.previousImpulse = value;
    return 0;
  }
  const previous = spring.previousImpulse;
  const sameDirection = Math.sign(value) === Math.sign(previous);
  const edge = value !== 0 && (!sameDirection || Math.abs(value) > Math.abs(previous)) ? value - (sameDirection ? previous : 0) : 0;
  spring.previousImpulse = value;
  spring.velocity += edge * 5.5;
  const target = wind ? 0.06 * Math.sin(time * 1.25 + spring.phase) + 0.02 * Math.sin(time * 2.1 + spring.phase * 1.7) : 0;
  const delta = clamp(dt, 0, 0.05), count = Math.max(1, Math.ceil(delta / (1 / 120))), h = delta / count;
  for (let step = 0; step < count; step++) {
    spring.velocity += (-48 * (spring.x - target) - 8 * spring.velocity) * h;
    spring.x += spring.velocity * h;
  }
  spring.offset = clamp(spring.x, -1, 1) * spring.amplitude;
  return spring.offset;
}

/** Adds only the optional accessory delta; does not alter the upstream binding. */
export function accessoryVertexDelta(bindings, vertexIndex) {
  let x = 0, y = 0;
  for (const spring of bindings || []) {
    const weight = spring.weights[vertexIndex];
    if (!weight) continue;
    const shift = spring.offset * weight;
    x += spring.normalX * shift;
    y += spring.normalY * shift;
  }
  return [x, y];
}
