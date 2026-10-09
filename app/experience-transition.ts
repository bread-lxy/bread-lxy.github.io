import type { SectionId } from './world-machine';

export type SceneTransitionContext = { from: SectionId; to: SectionId; direction: 1 | -1 };
export const involvesExperience = (transition: SceneTransitionContext | null) =>
  !!transition && (transition.from === 'experience' || transition.to === 'experience');

/** Freeze only scenery. Never copy the live character, focus targets or React state. */
export function snapshotExperience(desktop: HTMLElement, stage: HTMLElement) {
  const clone = desktop.cloneNode(true) as HTMLElement;
  const rect = desktop.getBoundingClientRect(), origin = stage.getBoundingClientRect();
  const style = getComputedStyle(desktop);
  clone.inert = true;
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  clone.querySelectorAll('[tabindex]').forEach(node => node.removeAttribute('tabindex'));
  clone.querySelectorAll('.exp-window-outline').forEach(node => node.remove());
  Object.assign(clone.style, { position:'absolute', display:'block', left:rect.left-origin.left+'px', top:rect.top-origin.top+'px', right:'auto', bottom:'auto', width:rect.width+'px', height:rect.height+'px' });
  for (const name of ['--exp-pink','--exp-paper','--exp-blue','--exp-ink','--exp-shadow','--exp-light']) clone.style.setProperty(name, style.getPropertyValue(name));
  const originals = desktop.querySelectorAll<HTMLElement>('.exp-window');
  clone.querySelectorAll<HTMLElement>('.exp-window').forEach((window, index) => {
    const live = originals[index], box = live.getBoundingClientRect(), css = getComputedStyle(live);
    Object.assign(window.style, { position:'absolute', left:box.left-rect.left+'px', top:box.top-rect.top+'px', right:'auto', bottom:'auto', width:box.width+'px', height:box.height+'px', minHeight:'0', display:css.display, translate:'none', transform:'none', opacity:'1', clipPath:'none' });
  });
  return clone;
}
