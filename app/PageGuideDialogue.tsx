"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PAGE_GUIDE_CHOICES, PAGE_GUIDE_STEPS, nextGuideStep } from "./page-guide";
import { useDialogueTypewriter, type DialogueTypeCharacter } from "./use-dialogue-typewriter";

type GuideChoiceAction = (typeof PAGE_GUIDE_CHOICES)[number]["action"];

export type PageGuideDialogueProps = {
  reducedMotion: boolean;
  onStepChange: (step: number) => void;
  onChoice: () => void;
  onClose: () => void;
  onTypeCharacter?: DialogueTypeCharacter;
};

/** A non-modal, linear variant of the existing RPG dialogue surface. */
export function PageGuideDialogue({ reducedMotion, onStepChange, onChoice, onClose, onTypeCharacter }: PageGuideDialogueProps) {
  const [step, setStep] = useState(0);

  useEffect(() => onStepChange(step), [onStepChange, step]);

  const continueAfterLine = () => {
    const next = nextGuideStep(step);
    if (next === null) onClose();
    else setStep(next);
  };

  return <GuideLine
    key={PAGE_GUIDE_STEPS[step].id}
    step={step}
    reducedMotion={reducedMotion}
    onChoice={action => {
      onChoice();
      if (action === "close") onClose();
      else setStep(1);
    }}
    onContinue={continueAfterLine}
    onTypeCharacter={onTypeCharacter}
  />;
}

type GuideLineProps = {
  step: number;
  reducedMotion: boolean;
  onChoice: (action: GuideChoiceAction) => void;
  onContinue: () => void;
  onTypeCharacter?: DialogueTypeCharacter;
};

function GuideLine({ step, reducedMotion, onChoice, onContinue, onTypeCharacter }: GuideLineProps) {
  const line = PAGE_GUIDE_STEPS[step];
  const { visibleText, isTyping, reveal } = useDialogueTypewriter(line.text, line.id, reducedMotion, 28, onTypeCharacter);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const id = useId();
  const copyRef = useRef<HTMLButtonElement>(null);
  const choiceRef = useRef<HTMLButtonElement>(null);
  const choiceTimer = useRef<number | null>(null);
  const titleId = `${id}-title`;
  const announcementId = `${id}-announcement`;

  useEffect(() => {
    copyRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (step === 0 && !isTyping) choiceRef.current?.focus({ preventScroll: true });
  }, [isTyping, step]);

  useEffect(() => () => {
    if (choiceTimer.current !== null) window.clearTimeout(choiceTimer.current);
  }, []);

  const choose = (index: number) => {
    const choice = PAGE_GUIDE_CHOICES[index];
    if (!choice || isTyping || selectedChoice !== null) return;
    setSelectedChoice(index);
    if (reducedMotion) onChoice(choice.action);
    else choiceTimer.current = window.setTimeout(() => onChoice(choice.action), 160);
  };

  const continueOrReveal = () => {
    if (isTyping) reveal();
    else if (step !== 0) onContinue();
  };

  return (
    // The plate accepts pointer clicks; the copy, choice, and triangle buttons provide keyboard equivalents.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <section
      id="page-guide-panel"
      className="rpg-dialogue page-guide-dialogue"
      data-typing={isTyping}
      data-has-next={step !== 0}
      data-choice-step={step === 0}
      data-reduced-motion={reducedMotion}
      aria-labelledby={titleId}
      onClick={event => {
        if (!(event.target instanceof Element) || !event.target.closest("button")) continueOrReveal();
      }}
    >
      <header className="rpg-dialogue__header">
        <span className="rpg-dialogue__world">PAGE GUIDE</span>
        <h2 id={titleId} className="rpg-dialogue__speaker">XUEYING</h2>
        <span className="page-guide-progress" aria-label={`页面引导第 ${step + 1} 句，共 ${PAGE_GUIDE_STEPS.length} 句`}>
          {String(step + 1).padStart(2, "0")} / {String(PAGE_GUIDE_STEPS.length).padStart(2, "0")}
        </span>
      </header>
      <div className="rpg-dialogue__copy-wrap">
        <button
          ref={copyRef}
          type="button"
          className="rpg-dialogue__copy"
          aria-describedby={announcementId}
          aria-keyshortcuts="Enter"
          aria-label={isTyping ? "显示完整对白" : step === 0 ? "请选择回复" : step === PAGE_GUIDE_STEPS.length - 1 ? "结束引导" : "下一句对白"}
          onClick={event => { event.stopPropagation(); continueOrReveal(); }}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              continueOrReveal();
            }
          }}
        >
          <span className="rpg-dialogue__text" aria-hidden="true">
            {visibleText}
            {isTyping && <span className="rpg-dialogue__caret" aria-hidden="true">▋</span>}
          </span>
        </button>
      </div>
      <span id={announcementId} className="rpg-dialogue__announcement" aria-live="polite" aria-atomic="true">{line.text}</span>
      {step === 0 && <div className={`page-guide-choice-list ${isTyping ? "is-pending" : ""}`} role="group" aria-label="请选择回复">
        {PAGE_GUIDE_CHOICES.map((choice, index) => <button
          key={choice.action}
          ref={index === 0 ? choiceRef : undefined}
          type="button"
          className={`page-guide-choice ${selectedChoice === index ? "is-selected" : ""}`}
          aria-label={`${choice.label}，选项 ${index + 1}，共 ${PAGE_GUIDE_CHOICES.length} 项`}
          aria-hidden={isTyping ? true : undefined}
          aria-disabled={selectedChoice !== null}
          disabled={isTyping}
          onClick={event => { event.stopPropagation(); choose(index); }}
        >{choice.label}</button>)}
      </div>}
      {step !== 0 && <button
        type="button"
        className="rpg-dialogue__next"
        aria-label={step === PAGE_GUIDE_STEPS.length - 1 ? "结束引导" : "下一句对白"}
        onClick={event => { event.stopPropagation(); continueOrReveal(); }}
      ><span className="rpg-dialogue__triangle" aria-hidden="true"/></button>}
    </section>
  );
}

export default PageGuideDialogue;
