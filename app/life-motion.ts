import type gsap from 'gsap';
import type { SceneTransitionContext } from './experience-transition';

export const involvesLife = (transition: SceneTransitionContext | null) =>
  !!transition && (transition.from === 'life' || transition.to === 'life');

/** Fits INSIDE the existing 800ms gate, never appends another entrance. */
export function addLifeSettle(timeline: gsap.core.Timeline, root: Element, duration: number) {
  for (let group = 0; group < 3; group++) {
    const nodes = root.querySelectorAll(`[data-life-group="${group}"] .life-paper-reveal`);
    timeline.fromTo(nodes, {y:16-group*3,rotation:group===1?-1.4:1.2,opacity:.65},
      {y:0,rotation:0,opacity:1,duration:duration*.55,ease:'power2.out',clearProps:'transform,opacity'}, duration*(.18+group*.11));
  }
}

/** Freeze actual painted poses; cloneNode otherwise restarts CSS loops. */
export function freezeLifeSnapshot(source: Element, clone: Element) {
  const live = source.querySelectorAll<HTMLElement>('[data-life-pose]');
  clone.querySelectorAll<HTMLElement>('[data-life-pose]').forEach((node,index) => {
    const css = getComputedStyle(live[index]);
    for (const property of ['transform','translate','rotate','scale','opacity','filter']) {
      node.style.setProperty(property,css.getPropertyValue(property));
    }
    node.style.animation='none';
    node.style.transition='none';
  });
  clone.querySelector('.life-scene')?.setAttribute('data-motion','false');
}

export function lifeMotionAllowed(active: boolean, reducedMotion: boolean, inView: boolean, hidden: boolean) {
  return active && !reducedMotion && inView && !hidden;
}
