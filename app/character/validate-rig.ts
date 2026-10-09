type Bounds = { x0: number; x1: number; y0: number; y1: number };
type RigMetadata = { layers?: Array<{ name: string; visible?: boolean; opacity?: number }>; anchors?: Record<string, Bounds> };

/** A successful GL draw cannot prove that the character's eyes/face are intact. */
export function rigProblems(value: unknown): string[] {
  if (!value || typeof value !== "object") return ["Missing rig metadata"];
  const meta = value as RigMetadata;
  const names = (meta.layers || []).filter(layer => layer.visible !== false && layer.opacity !== 0).map(layer => layer.name);
  const required = ["face", "eyewhite_l", "eyewhite_r", "irides_l", "irides_r", "mouth_open"];
  const problems = required.filter(name => !names.some(actual => actual.replace(/_\d+(?=_[lr]$|$)/, "") === name)).map(name => `Missing visible ${name} layer`);
  for (const name of ["face", "eyeL", "eyeR", "mouth"]) {
    const bounds = meta.anchors?.[name];
    if (!bounds || ![bounds.x0,bounds.x1,bounds.y0,bounds.y1].every(Number.isFinite) || bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) problems.push(`Invalid ${name} anchor`);
  }
  return problems;
}
