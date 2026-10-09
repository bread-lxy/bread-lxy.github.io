"use client";
import { useEffect, useRef, useState } from 'react';

/** Adapted from David Haz / React Bits DecryptedText (TypeScript + CSS).
 * Source: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/DecryptedText/DecryptedText.tsx
 * License: docs/licenses/react-bits-LICENSE.md (MIT + Commons Clause).
 * Retains the interval/shuffle/reveal mechanism; removes hover/reverse/Motion
 * wrappers, bounds the duration, and keeps accessible text stable while animating.
 */
export function BgmTitle({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const [frame, setFrame] = useState({ text, value: text, reducedMotion });
  // Switching the preference mid-reveal must not leave a partial title behind
  // when motion is subsequently enabled again.
  if (frame.reducedMotion !== reducedMotion) setFrame({ text, value: text, reducedMotion });
  const previous = useRef(text);
  const displayText = reducedMotion || frame.text !== text ? text : frame.value;
  useEffect(() => {
    const changed = previous.current !== text;
    previous.current = text;
    if (reducedMotion || !changed) return;
    const characters = Array.from(text);
    const availableChars = [...new Set(characters.filter(char => char !== ' '))];
    let currentIteration = 0;
    const maxIterations = 10;
    const interval = window.setInterval(() => {
      currentIteration++;
      const revealedCount = Math.floor(characters.length * currentIteration / maxIterations);
      setFrame({ text, reducedMotion, value: characters.map((char, index) => char === ' ' || index < revealedCount
        ? char : availableChars[Math.floor(Math.random() * availableChars.length)]).join('') });
      if (currentIteration >= maxIterations) { window.clearInterval(interval); setFrame({ text, value: text, reducedMotion }); }
    }, 40);
    return () => window.clearInterval(interval);
  }, [text, reducedMotion]);
  return <span className="bgm-title" lang="ja" aria-label={text} title={text}>
    <span className="bgm-title-measure" aria-hidden="true">{text}</span>
    <span className="bgm-title-reveal" aria-hidden="true">{displayText}</span>
  </span>;
}
