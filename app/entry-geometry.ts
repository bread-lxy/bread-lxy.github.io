/** Square pixels anchored to the ENTER slit, not to the viewport corner. */
export function doorwayGrid(width: number, height: number, originX: number, originY: number) {
  const size = width <= 700 ? 16 : 24;
  const left = Math.floor(originX - size / 2) % size - size;
  const top = Math.floor(originY - size / 2) % size - size;
  const columns = Math.ceil((width - left) / size), rows = Math.ceil((height - top) / size);
  const cx = Math.round((originX - left) / size - .5), cy = Math.round((originY - top) / size - .5);
  const ranks = Array.from({length: rows}, (_, row) => Array.from({length: columns}, (_, column) =>
    Math.hypot(Math.max(0, Math.abs(column - cx) - 2) * 1.18, row - cy)));
  return {size, left, top, columns, rows, ranks, maxRank: Math.max(...ranks.flat()), cx, cy};
}
export const ENTRY_TIMING = {minimumLoad: 700, maximumLoad: 2500, name: .45, card: .2, doorway: .9, reduced: .12} as const;
