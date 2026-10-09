"use client";

import {useEffect,useRef,useState} from 'react';

const variants=[
  {name:'Revolve_Left',label:'01 / REVOLVE LEFT',defaults:{center:[.46,.52],direction:-1,maxRotation:1.95,peakZoom:2.22,swirl:2.85,barrel:.38,motionBlur:1,switchStart:.3,switchEnd:.5,shadow:.16}},
  {name:'Drop_Zone_Flicker',label:'02 / DROP ZONE',defaults:{frameRate:24,rgbOffset:.014,blockAmount:.72,ghostAmount:.62,redCyan:.58,scanline:.075}},
  {name:'StripDatamoshGlitch',label:'03 / STRIP DATAMOSH',defaults:{strength:1,horizontalBars:42,verticalSlits:18,tear:.18,chroma:.032,residue:.62,noiseAmount:.16,scanAmount:.13,flashAmount:.20}},
] as const;
const vertex='attribute vec2 aPosition; varying highp vec2 vUv; void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}';
const prelude='precision highp float; varying highp vec2 vUv; uniform sampler2D uFrom; uniform sampler2D uTo; uniform float progress; uniform float ratio; vec4 getFromColor(vec2 uv){return texture2D(uFrom,uv);} vec4 getToColor(vec2 uv){return texture2D(uTo,uv);}';
function imageSource(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
// The original shader is unmodified. Only its gl-transitions host contract lives here.
export function ShaderExhibit({reducedMotion}:{reducedMotion:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null),hostRef=useRef<HTMLDivElement>(null);
  const draw=useRef<((value:number)=>void)|null>(null),valueRef=useRef(0);
  const [selected,setSelected]=useState(0),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
  const [value,setValue]=useState(0),[playing,setPlaying]=useState(false);
  const [retry,setRetry]=useState(0);
  const variant=variants[selected];
  useEffect(()=>{
    if(!enabled)return;
    const canvas=canvasRef.current;if(!canvas)return;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl){setError('当前浏览器无法运行 WebGL，保留静态预览。');setPlaying(false);return;}
    if(!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision){setError('当前设备不支持此效果所需的图形精度，保留静态预览。');setPlaying(false);return;}
    let disposed=false;const controller=new AbortController();
    const shaders:WebGLShader[]=[],textures:WebGLTexture[]=[];
    let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
    setReady(false);setError('');draw.current=null;
    const lost=(event:Event)=>{event.preventDefault();setPlaying(false);setReady(false);setError('图形上下文已暂停，保留静态预览。切换效果可重试。');};
    canvas.addEventListener('webglcontextlost',lost);
    const restored=()=>setRetry(n=>n+1);canvas.addEventListener('webglcontextrestored',restored);
    const compile=(kind:number,source:string)=>{
      const shader=gl.createShader(kind);if(!shader)throw new Error('Shader allocation failed');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compile failed');return shader;
    };
    void (async()=>{
      const [response,from,to]=await Promise.all([fetch(`/publication/shaders/${variant.name}.glsl`,{signal:controller.signal}),imageSource('/character/hero-v2/poster.png'),imageSource('/publication/samples/hero-scene.png')]);
      if(!response.ok)throw new Error('Shader source unavailable');const source=await response.text();if(disposed)return;
      program=gl.createProgram();if(!program)throw new Error('Program allocation failed');
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,prelude+'\n'+source+'\nvoid main(){gl_FragColor=transition(vUv);}'));
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Link failed');
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      [from,to].forEach((img,index)=>{
        // Letterbox both sample inputs to the same canvas; never distort the character.
        const input=document.createElement('canvas');input.width=1200;input.height=675;const ctx=input.getContext('2d');if(!ctx)throw new Error('Input canvas unavailable');
        ctx.fillStyle='#d9dfca';ctx.fillRect(0,0,1200,675);const scale=Math.min(1200/img.width,675/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(1200-w)/2,(675-h)/2,w,h);
        const texture=gl.createTexture();if(!texture)throw new Error('Texture allocation failed');textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,input);gl.uniform1i(gl.getUniformLocation(program!,index===0?'uFrom':'uTo'),index);
      });
      for(const [name,defaultValue] of Object.entries(variant.defaults)){
        const uniform=gl.getUniformLocation(program,name);if(Array.isArray(defaultValue))gl.uniform2f(uniform,defaultValue[0],defaultValue[1]);else gl.uniform1f(uniform,defaultValue as number);
      }
      draw.current=(progress)=>{if(disposed||!program||gl.isContextLost())return;const width=Math.min(1440,Math.round(canvas.clientWidth*Math.min(devicePixelRatio,1.5))),height=Math.round(width*canvas.clientHeight/Math.max(1,canvas.clientWidth));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'progress'),progress);gl.uniform1f(gl.getUniformLocation(program,'ratio'),canvas.width/canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);};
      draw.current(valueRef.current);setReady(true);
    })().catch((reason:unknown)=>{if(disposed)return;console.warn('Transition preview unavailable:',reason);setError('当前效果未能加载，已回退静态预览；可查看原始源码。');setPlaying(false);});
    const resize=new ResizeObserver(()=>draw.current?.(valueRef.current));resize.observe(canvas);
    return()=>{disposed=true;controller.abort();resize.disconnect();draw.current=null;canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);};
  },[enabled,variant,retry]);
  useEffect(()=>{valueRef.current=value;draw.current?.(value);},[value]);
  useEffect(()=>{
    if(!playing||!ready)return;
    let frame=0;const start=performance.now();
    const tick=(now:number)=>{const next=Math.min((now-start)/2400,1);setValue(next);if(next<1)frame=requestAnimationFrame(tick);else setPlaying(false);};frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[playing,ready]);
  useEffect(()=>{
    const host=canvasRef.current;if(!host)return;
    const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)setPlaying(false);});observer.observe(host);
    const visibility=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const play=()=>{setValue(0);setEnabled(true);if(error)setRetry(n=>n+1);setPlaying(true);};
  return <div ref={hostRef} className="shader-exhibit" data-shader={variant.name} data-shader-ready={ready} data-playing={playing}>
    <div className={`shader-stage ${ready?'is-ready':''}`}><img src="/character/hero-v2/poster.png" alt="GLSL 演示输入：现有原创角色图" loading="lazy"/><canvas ref={canvasRef} aria-label={`${variant.name} 实时转场画面`}/><span className="shader-stage-label">GLSL / LIVE PREVIEW · 样片输入</span>{!enabled&&<button className="shader-start" onClick={play}><span>运行转场 ↗</span></button>}</div>
    <div className="shader-tabs" aria-label="选择转场">{variants.map((v,i)=><button key={v.name} type="button" aria-pressed={selected===i} onClick={()=>{setPlaying(false);setValue(0);setSelected(i);}}>{v.label}</button>)}</div>
    <div className="shader-playback"><button type="button" onClick={()=>playing?setPlaying(false):play()}>{playing?'暂停':'播放一次'} {playing?'Ⅱ':'↗'}</button><label>PROGRESS <input type="range" aria-label="转场进度" min="0" max="1" step=".001" value={value} onChange={e=>{setPlaying(false);setEnabled(true);setValue(Number(e.target.value));}}/><output>{Math.round(value*100)}%</output></label></div>
    {error&&<p className="shader-message" role="status">{error}</p>}{reducedMotion&&<p className="shader-message">已关闭自动动效。可拖动进度逐帧查看，或主动播放一次。</p>}
    <div className="shader-credit"><span>原始 shader / bread · MIT<br/>输入：本站角色图 + 首屏截图；信号干扰效果包含短暂闪烁。</span><a href={`https://github.com/gl-transitions/gl-transitions/blob/902218a1b63773ac0d0d9f491951da3392365bfe/transitions/${variant.name}.glsl`} target="_blank" rel="noopener noreferrer">源码与许可 ↗</a></div>
  </div>;
}
