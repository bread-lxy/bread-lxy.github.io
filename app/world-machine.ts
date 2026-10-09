export const SECTION_IDS = ["experience", "research", "projects", "studio", "life"] as const;
export const WORLD_IDS = SECTION_IDS;
export type SectionId = (typeof SECTION_IDS)[number];
export type WorldId = SectionId;
export const DEFAULT_WORLD:SectionId = 'experience';
export type SiteMode = "lobby" | "transitioning" | "content";
export type SiteState = { mode: SiteMode; activeWorld: SectionId; targetWorld: SectionId | null };
export type SiteAction =
  | { type: "PREVIEW"; direction: 1 | -1 }
  | { type: "SELECT_WORLD"; world: SectionId }
  | { type: "CONFIRM" } | { type: "ENTER_CONTENT" }
  | { type: "OPEN_CONTENT"; world: SectionId } | { type: "RETURN_HOME"; world?: SectionId };
export type SiteRoute =
  | { kind: "home" } | { kind: "resume" }
  | { kind: "section"; section: SectionId; collection?: string }
  | { kind: "item"; section: SectionId; slug: string };
export const createInitialState = (): SiteState => ({ mode: "lobby", activeWorld: DEFAULT_WORLD, targetWorld: null });
export function stepWorld(current: SectionId, direction: 1 | -1) {
  return SECTION_IDS[(SECTION_IDS.indexOf(current) + direction + SECTION_IDS.length) % SECTION_IDS.length];
}
export const shouldAcceptWheel = (now: number, last: number, threshold = 620) => now - last >= threshold;
/** A trackpad's momentum tail is one gesture, even when it lasts longer than cooldown. */
export function createWheelGate(resumedAt = -Infinity) {
  // Returning to the cover consumes the existing gesture, including its tail.
  let accepted = -Infinity, lastEvent = resumedAt, total = 0, consumed = Number.isFinite(resumedAt);
  return (now: number, delta: number, modified = false): -1 | 0 | 1 => {
    if (modified || !Number.isFinite(delta)) return 0;
    if (now - lastEvent > 180) { consumed = false; total = 0; }
    lastEvent = now;
    if (consumed) return 0;
    total += delta;
    if (Math.abs(total) < 24 || !shouldAcceptWheel(now, accepted)) return 0;
    consumed = true; accepted = now;
    return total > 0 ? 1 : -1;
  };
}
export function siteReducer(state: SiteState, action: SiteAction): SiteState {
  switch (action.type) {
    case "PREVIEW": return state.mode === "lobby" ? { ...state, activeWorld: stepWorld(state.activeWorld, action.direction) } : state;
    case "SELECT_WORLD": return state.mode === "transitioning" ? state : { ...state, activeWorld: action.world };
    case "CONFIRM": return state.mode === "lobby" ? { ...state, mode: "transitioning", targetWorld: state.activeWorld } : state;
    case "ENTER_CONTENT": return state.targetWorld ? { mode: "content", activeWorld: state.targetWorld, targetWorld: null } : state;
    case "OPEN_CONTENT": return { mode: "content", activeWorld: action.world, targetWorld: null };
    case "RETURN_HOME": return { mode: "lobby", activeWorld: action.world ?? state.activeWorld, targetWorld: null };
  }
}
const legacySections: Record<string, SectionId> = { art: "studio", playground: "studio", "ai-tech": "projects", archive: "life" };
// Old placeholders are destinations, not fabricated works. Explicit aliases survive category changes.
const legacyItems: Record<string, string> = {
  "art/featured-illustration": "#studio/collection/original",
  "art/fan-work": "#studio/collection/fan-art", "art/study-log": "#studio/collection/study",
  "art/motion-piece": "#studio/collection/motion",
  "playground/vidmuse-mv-01": "#studio/collection/play", "playground/vidmuse-mv-02": "#studio/collection/play",
  "playground/reaction-pack": "#studio/collection/play",
  "ai-tech/codex-pet": "#projects", "ai-tech/skill-project": "#projects/item/yama",
  "ai-tech/eval-studio": "#projects/item/eval-studio",
  "archive/reading-index": "#life/collection/books", "archive/travel-index": "#life/collection/travel",
  "archive/culture-index": "#life/collection/culture",
};
export function routeHash(route: SiteRoute): string {
  if (route.kind === "home") return "";
  if (route.kind === "resume") return "#resume";
  if (route.kind === "item") return `#${route.section}/item/${encodeURIComponent(route.slug)}`;
  return `#${route.section}${route.collection ? "/collection/" + encodeURIComponent(route.collection) : ""}`;
}
export function parseLocation(hash: string): { route: SiteRoute; canonicalHash: string } {
  const parts = hash.replace(/^#/, "").split("/");
  if (parts[0] === "resume" && parts.length === 1) return { route: {kind:"resume"}, canonicalHash:"#resume" };
  const original = parts[0];
  const section = SECTION_IDS.includes(original as SectionId) ? original as SectionId : legacySections[original];
  if (!section) return {route:{kind:"home"},canonicalHash:""};
  let route: SiteRoute = {kind:"section",section};
  if (parts.length === 3) {
    try {
      const value = decodeURIComponent(parts[2]);
      if (parts[1] === "item" && value) {
        const alias = legacyItems[original + "/" + value];
        if (alias) return parseLocation(alias);
        route = {kind:"item",section,slug:value};
      } else if (parts[1] === "collection" && ["original","fan-art","study","motion","play","books","travel","music","culture"].includes(value)) {
        route = {kind:"section",section,collection:value};
      }
    } catch { /* malformed URL returns the visible section, never a locked modal */ }
  } else if (original === "playground") route = {kind:"section",section:"studio",collection:"play"};
  return {route, canonicalHash:routeHash(route)};
}
export const hashForWorld = (section: SectionId) => routeHash({kind:"section",section});
export const hashForItem = (section: SectionId, slug: string) => routeHash({kind:"item",section,slug});
