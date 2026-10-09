"use client";

import {useEffect, useRef} from 'react';
import type {Renderer, Program, Triangle, Mesh} from 'ogl';
import {createStageLightLoop, stageLightSize, SIDE_RAYS_VERTEX, SIDE_RAYS_FRAGMENT} from './stage-light-runtime';

export type ExperienceStageLightProps = {active:boolean; paused?:boolean; reducedMotion:boolean};
type Controls = {active:boolean; paused:boolean; reducedMotion:boolean};

/**
 * SideRays by David Haz / React Bits, pinned at 3a1c7f2f9f94ed833934ab5c2635760b9e644583.
 * Exact shader + source attribution: stage-light-runtime.ts.
 * Full MIT + Commons Clause notice: public/album/licenses/ReactBits-LICENSE.md.
 * This host owns a separate decorative canvas; it never samples or changes the live character.
 */
export function ExperienceStageLight({active, paused=false, reducedMotion}:ExperienceStageLightProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Controls>({active,paused,reducedMotion});
  const syncRef = useRef<((controls:Controls)=>void)|null>(null);

  // Commit the latest controls before mount setup can start an asynchronous import.
  // Subsequent prop updates reconcile the existing context, never recreate it.
  useEffect(() => {
    const controls={active,paused,reducedMotion};
    controlsRef.current=controls;
    syncRef.current?.(controls);
  },[active,paused,reducedMotion]);

  useEffect(() => {
    const currentHost = hostRef.current;
    if (!currentHost) return;
    const host:HTMLDivElement = currentHost;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden','true');
    canvas.dataset.stageLightCanvas = 'side-rays';
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none'});

    let disposed = false, initializing = false, visible = false, hasSize = false;
    let renderer:Renderer|null = null, geometry:Triangle|null = null, program:Program|null = null, mesh:Mesh|null = null;
    let uniforms:Record<string,{value:number|number[]}>|null = null;
    let previousSize = '';
    const release = () => {
      canvas.removeEventListener('webglcontextlost', lost);
      // All resources below belong to this canvas, never the character's context.
      if (renderer) {
        const gl = renderer.gl;
        try {
          if (program) {
            for (const shader of gl.getAttachedShaders(program.program) || []) gl.deleteShader(shader);
            program.remove();
          }
          geometry?.remove();
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch { /* A lost context already released its resources. */ }
      }
      renderer=null;geometry=null;program=null;mesh=null;uniforms=null;
      canvas.remove();
    };
    const loop = createStageLightLoop({
      now:()=>performance.now(),
      requestFrame:callback=>requestAnimationFrame(callback),
      cancelFrame:id=>cancelAnimationFrame(id),
      draw:seconds=>{
        if (!renderer || !uniforms || !mesh || renderer.gl.isContextLost()) throw new Error('Stage light unavailable');
        uniforms.iTime.value=seconds;
        renderer.render({scene:mesh});
      },
      onState:state=>{
        host.dataset.stageLightState=state;
        canvas.style.visibility=state==='inactive'||state==='fallback'?'hidden':'visible';
        // No alternate animated renderer: a failure leaves the original stage visible.
        if (state==='fallback') release();
      },
      onFrame:(frames,seconds)=>{
        host.dataset.stageLightFrames=String(frames);
        host.dataset.stageLightTime=seconds.toFixed(3);
      },
    },{...controlsRef.current,visible:false,hidden:document.hidden,ready:false});

    function lost(event:Event) { event.preventDefault();loop.fail(); }
    canvas.addEventListener('webglcontextlost',lost);

    const eligible = () => !disposed && controlsRef.current.active && visible && !document.hidden;
    const synchronize = () => {
      if (disposed) return;
      loop.update({...controlsRef.current,visible,hidden:document.hidden,ready:hasSize&&!!mesh});
      if (eligible() && !renderer && !initializing && loop.snapshot().state!=='fallback'
        && (!controlsRef.current.paused || controlsRef.current.reducedMotion)) void initialize();
    };
    const measure = () => {
      if (disposed) return;
      const width=host.clientWidth,height=host.clientHeight;
      hasSize=width>0&&height>0;
      if (renderer && uniforms && hasSize) {
        const size=stageLightSize(width,height,window.devicePixelRatio);
        const key=`${width}/${height}/${size.dpr}`;
        if (key!==previousSize) {
          previousSize=key;
          renderer.dpr=size.dpr;
          renderer.setSize(size.width,size.height);
          // OGL setSize writes CSS dimensions; preserve the host's responsive sizing.
          canvas.style.width='100%';canvas.style.height='100%';
          uniforms.iResolution.value=[canvas.width,canvas.height];
          host.dataset.stageLightDpr=size.dpr.toFixed(3);
          host.dataset.stageLightPixels=String(canvas.width*canvas.height);
          loop.invalidate();
        }
      }
      synchronize();
    };

    async function initialize() {
      initializing=true;
      try {
        const {Renderer,Program,Triangle,Mesh}=await import('ogl');
        // Dynamic import cannot be aborted, but stale work must never allocate a context.
        if (!eligible() || loop.snapshot().state==='fallback') return;
        renderer=new Renderer({canvas,dpr:1,alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
        const gl=renderer.gl;
        if (!gl || !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision) throw new Error('Stage light precision unavailable');
        uniforms={
          iTime:{value:0},iResolution:{value:[1,1]},
          iSpeed:{value:.7},
          iRayColor1:{value:[1,240/255,220/255]}, // #FFF0DC
          iRayColor2:{value:[234/255,162/255,148/255]}, // #EAA294
          iIntensity:{value:1.5},iSpread:{value:2},
          iFlipX:{value:0},iFlipY:{value:0}, // Original top-right origin.
          iTilt:{value:0},iSaturation:{value:1.5},iBlend:{value:.75},
          iFalloff:{value:1.6},iOpacity:{value:.55},
        };
        geometry=new Triangle(gl);
        program=new Program(gl,{vertex:SIDE_RAYS_VERTEX,fragment:SIDE_RAYS_FRAGMENT,uniforms,depthTest:false,depthWrite:false});
        // OGL warns rather than throws on compile/link failure; fail closed explicitly.
        if (!gl.getProgramParameter(program.program,gl.LINK_STATUS)) throw new Error('Stage light shader unavailable');
        mesh=new Mesh(gl,{geometry,program});
        host.appendChild(canvas);
        host.dataset.stageLightContexts=String(Number(host.dataset.stageLightContexts||0)+1);
        measure();
      } catch {
        if (!disposed) loop.fail();
      } finally {
        initializing=false;
      }
    }

    syncRef.current=controls=>{controlsRef.current=controls;synchronize();};
    const intersect = typeof IntersectionObserver==='undefined' ? null : new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>0);
      synchronize();
    });
    if (intersect) intersect.observe(host);
    else visible=true;
    const resize = typeof ResizeObserver==='undefined' ? null : new ResizeObserver(measure);
    resize?.observe(host);
    window.addEventListener('resize',measure);
    document.addEventListener('visibilitychange',synchronize);
    measure();

    return () => {
      disposed=true;syncRef.current=null;
      intersect?.disconnect();resize?.disconnect();
      window.removeEventListener('resize',measure);
      document.removeEventListener('visibilitychange',synchronize);
      loop.dispose();release();
    };
  },[]);

  return <div ref={hostRef} className="experience-stage-light" aria-hidden="true" style={{pointerEvents:'none'}}
    data-stage-light-state="loading" data-stage-light-frames="0" data-stage-light-time="0" data-stage-light-contexts="0" />;
}
