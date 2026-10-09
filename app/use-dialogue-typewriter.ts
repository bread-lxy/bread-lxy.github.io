"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type DialogueTypeCharacter = (character: string, index: number, lineId: string) => void;

type TypewriterState = {
  lineId: string;
  text: string;
  reducedMotion: boolean;
  typingDelayMs: number;
  visibleCount: number;
};

function initialState(text: string, lineId: string, reducedMotion: boolean, typingDelayMs: number): TypewriterState {
  return { lineId, text, reducedMotion, typingDelayMs, visibleCount: reducedMotion ? text.length : 0 };
}

/** Shared by world dialogue and the one-shot page guide. */
export function useDialogueTypewriter(
  text: string,
  lineId: string,
  reducedMotion: boolean,
  typingDelayMs = 28,
  onTypeCharacter?: DialogueTypeCharacter,
) {
  const [state, setState] = useState(() => initialState(text, lineId, reducedMotion, typingDelayMs));
  const timerRef = useRef<number | null>(null);
  const onTypeCharacterRef = useRef(onTypeCharacter);

  // Reset before paint: the next line must not reuse the previous line's count.
  const changed = state.lineId !== lineId || state.text !== text || state.reducedMotion !== reducedMotion || state.typingDelayMs !== typingDelayMs;
  const current = changed ? initialState(text, lineId, reducedMotion, typingDelayMs) : state;
  if (changed) setState(current);

  useLayoutEffect(() => { onTypeCharacterRef.current = onTypeCharacter; }, [onTypeCharacter]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    clearTimer();
    if (reducedMotion || text.length === 0) return clearTimer;

    const delay = Number.isFinite(typingDelayMs) ? Math.max(12, Math.trunc(typingDelayMs)) : 28;
    let count = 0;
    let active = true;
    const timer = window.setInterval(() => {
      if (!active) return;
      count = Math.min(count + 1, text.length);
      setState(previous => previous.lineId === lineId && previous.text === text && previous.reducedMotion === reducedMotion && previous.typingDelayMs === typingDelayMs
        ? { ...previous, visibleCount: count }
        : previous);
      onTypeCharacterRef.current?.(text[count - 1], count - 1, lineId);
      if (count >= text.length) {
        window.clearInterval(timer);
        if (timerRef.current === timer) timerRef.current = null;
      }
    }, delay);
    timerRef.current = timer;
    return () => {
      active = false;
      window.clearInterval(timer);
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [clearTimer, lineId, reducedMotion, text, typingDelayMs]);

  const reveal = useCallback(() => {
    clearTimer();
    setState(previous => previous.lineId === lineId && previous.text === text
      ? { ...previous, visibleCount: text.length }
      : previous);
  }, [clearTimer, lineId, text]);

  const visibleCount = current.visibleCount;
  return { visibleText: text.slice(0, visibleCount), isTyping: !reducedMotion && visibleCount < text.length, reveal };
}
