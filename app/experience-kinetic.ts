/* Adapted from Codrops KineticTypePageTransition, ebe926e2.
 * Copyright 2009–2021 Codrops. MIT, public/album/licenses/KineticType-LICENSE.txt.
 * Original type in() timeline retained; selectors scoped, SSR-safe, no global
 * page lock/navigation. The owner maps its duration onto a scroll timeline. */
import gsap from 'gsap';
export function createExperienceKinetic(element:HTMLElement){
 const lines=element.querySelectorAll('.relay-type__line');
 return gsap.timeline()
  .to(element,{duration:1.4,ease:'power2.inOut',scale:2.7,rotate:-90})
  .to(lines,{keyframes:[{x:'20%',duration:1,ease:'power1.inOut'},{x:'-200%',duration:1.5,ease:'power1.in'}],stagger:.04},0)
  .to(lines,{keyframes:[{opacity:1,duration:1,ease:'power1.in'},{opacity:0,duration:1.5,ease:'power1.in'}]},0);
}
