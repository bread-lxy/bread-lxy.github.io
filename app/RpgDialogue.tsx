"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { SectionId } from "./world-machine";
import { cycleDialogueIndex, getRpgDialogueLines, rpgWorldLabels, type RpgDialogueLine, type RpgDialogueLines } from "./rpg-dialogue";
import { useDialogueTypewriter, type DialogueTypeCharacter } from "./use-dialogue-typewriter";

export type RpgDialogueProps = {
  world: SectionId;
  /** Override the world data for a fixture or a one-off lobby variant. */
  lines?: RpgDialogueLines;
  /** Skip the typewriter when the user prefers less motion. */
  reducedMotion?: boolean;
  /** Milliseconds per character; intentionally capped to keep the panel responsive. */
  typingDelayMs?: number;
  /** Start at a particular line when the panel is first mounted for this world. */
  initialLine?: number;
  className?: string;
  onLineChange?: (line: RpgDialogueLine, index: number) => void;
  onTypeCharacter?: DialogueTypeCharacter;
};

const EMPTY_LINE: RpgDialogueLine = {
  id: "empty",
  speaker: "GUIDE",
  world: "projects",
  worldLabel: rpgWorldLabels.projects,
  text: "暂无对白。",
};

export function RpgDialogue(props: RpgDialogueProps) {
  // Reset the text and speaker together; never paint the previous world's line.
  return <DialogueBody key={`${props.world}:${props.initialLine ?? 0}`} {...props}/>;
}

function DialogueBody({
  world,
  lines: providedLines,
  reducedMotion = false,
  typingDelayMs = 28,
  initialLine = 0,
  className,
  onLineChange,
  onTypeCharacter,
}: RpgDialogueProps) {
  const lines = providedLines ?? getRpgDialogueLines(world);
  const firstIndex = cycleDialogueIndex(initialLine, lines.length);
  const [lineIndex, setLineIndex] = useState(firstIndex);
  const safeLineIndex = cycleDialogueIndex(lineIndex, lines.length);
  const emptyLine = useMemo(() => ({...EMPTY_LINE, world, worldLabel:rpgWorldLabels[world]}), [world]);
  const currentLine = lines[safeLineIndex] ?? emptyLine;
  const { visibleText, isTyping, reveal } = useDialogueTypewriter(currentLine.text, currentLine.id, reducedMotion || lines.length === 0, typingDelayMs, onTypeCharacter);
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const copyId = `${instanceId}-copy`;

  useEffect(() => {
    onLineChange?.(currentLine, safeLineIndex);
  }, [currentLine, onLineChange, safeLineIndex]);

  const advanceOrReveal = useCallback(() => {
    if (isTyping) {
      reveal();
      return;
    }
    setLineIndex(cycleDialogueIndex(safeLineIndex + 1, lines.length));
  }, [isTyping, lines.length, reveal, safeLineIndex]);

  const classNames = ["rpg-dialogue", className].filter(Boolean).join(" ");

  return (
    // The plate accepts pointer clicks; the copy and triangle buttons provide keyboard equivalents.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <section
      className={classNames}
      data-world={world}
      data-typing={isTyping}
      data-has-next={lines.length > 1}
      data-reduced-motion={reducedMotion}
      aria-labelledby={titleId}
      onClick={event => {
        if (!(event.target instanceof Element) || !event.target.closest("button")) advanceOrReveal();
      }}
    >
      <header className="rpg-dialogue__header">
        <span className="rpg-dialogue__world" data-world-label>{currentLine.worldLabel}</span>
        <h2 id={titleId} className="rpg-dialogue__speaker">{currentLine.speaker}</h2>
      </header>

      <div className="rpg-dialogue__copy-wrap">
        <button
          type="button"
          className="rpg-dialogue__copy"
          aria-describedby={copyId}
          aria-keyshortcuts="Enter"
          aria-label={isTyping ? "显示完整对白" : lines.length > 1 ? "显示下一句对白" : "对白已完整显示"}
          onClick={event => { event.stopPropagation(); advanceOrReveal(); }}
          onKeyDown={(event) => {
            // Keep Enter local to the dialogue so a lobby-level key handler
            // cannot also change the selected world on the same key press.
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              advanceOrReveal();
            }
          }}
        >
          <span className="rpg-dialogue__text" aria-hidden="true">
            {visibleText}
            {isTyping && <span className="rpg-dialogue__caret" aria-hidden="true">▋</span>}
          </span>
        </button>
      </div>
      <span id={copyId} className="rpg-dialogue__announcement" aria-live="polite" aria-atomic="true">{currentLine.text}</span>
      {lines.length > 1 && (
        <button type="button" className="rpg-dialogue__next" onClick={event => { event.stopPropagation(); advanceOrReveal(); }} aria-label="下一句对白">
          <span className="rpg-dialogue__triangle" aria-hidden="true"/>
        </button>
      )}
    </section>
  );
}

export default RpgDialogue;
