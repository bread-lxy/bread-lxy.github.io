import type gsap from 'gsap';

/** Codrops SlideshowAnimations/demo4, Slideshow.navigate (MIT, see public/album/licenses).
 * Retains outgoing scale/fade and incoming frame/inner counter-motion.
 * Only duration is normalized to the existing 800ms preview input gate.
 */
export function addAlbumSlide(tl:gsap.core.Timeline,oldFrame:HTMLElement,newFrame:HTMLElement,inner:Element,direction:1|-1,duration:number){
  const unit=duration/1.35,slide=1.25*unit,offset=.1*unit;
  return tl
    .set(newFrame,{zIndex:2},0)
    .to(oldFrame,{duration:.4*unit,ease:'sine',scale:.9,autoAlpha:.2},0)
    .to(oldFrame,{duration:slide,ease:'power4.inOut',yPercent:-direction*20,autoAlpha:0},offset)
    .fromTo(newFrame,{autoAlpha:1,scale:1,yPercent:direction*100},{yPercent:0,duration:slide,ease:'power4.inOut',clearProps:'transform,opacity,visibility,zIndex'},offset)
    .fromTo(inner,{yPercent:-direction*50},{yPercent:0,duration:slide,ease:'power4.inOut',clearProps:'transform'},offset);
}
