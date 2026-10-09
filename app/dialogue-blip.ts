/** The sound cadence is independent of the typewriter and audio player. */
export type DialogueBlipCursor = {
  lineId: string;
  lastIndex: number;
  speakableCount: number;
  playedCount: number;
  lastPlayedAt: number;
};

export const initialDialogueBlipCursor: DialogueBlipCursor = {
  lineId: "",
  lastIndex: -1,
  speakableCount: 0,
  playedCount: 0,
  lastPlayedAt: Number.NEGATIVE_INFINITY,
};

export function stepDialogueBlip(
  previous: DialogueBlipCursor,
  character: string,
  index: number,
  lineId: string,
  now: number,
): { cursor: DialogueBlipCursor; variant: number | null } {
  const restarted = previous.lineId !== lineId || index <= previous.lastIndex;
  const cursor: DialogueBlipCursor = restarted
    ? { ...initialDialogueBlipCursor, lineId, lastIndex: index }
    : { ...previous, lastIndex: index };

  // Chinese and Latin text speak; punctuation, whitespace, emoji and symbols rest.
  if (!/[\p{L}\p{N}]/u.test(character)) return { cursor, variant: null };
  cursor.speakableCount += 1;
  if ((cursor.speakableCount - 1) % 3 !== 0 || now - cursor.lastPlayedAt < 80) return { cursor, variant: null };

  const variant = cursor.playedCount % 3;
  cursor.playedCount += 1;
  cursor.lastPlayedAt = now;
  return { cursor, variant };
}
