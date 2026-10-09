import {palettePixels,revealOrder,characterLayout,clamp01,smooth} from './awakening-palette';

type Level={size:number;original:Uint8ClampedArray;two:Uint8ClampedArray;four:Uint8ClampedArray;order:Float32Array;frame:ImageData;surface:HTMLCanvasElement;context:CanvasRenderingContext2D};
export type AwakeningCharacterLayout={x:number;y:number;size:number};
export function createAwakeningRenderer(canvas:HTMLCanvasElement,poster:HTMLImageElement,width:number,height:number){
  const context=canvas.getContext('2d');if(!context)throw new Error('Canvas 2D unavailable');
  const dpr=Math.min(devicePixelRatio||1,2);
  let layout=characterLayout(width,height);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const levels=new Map<number,Level>();
  for(const size of [256,512]){
    const surface=document.createElement('canvas');surface.width=surface.height=size;
    const ctx=surface.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Pixel buffer unavailable');
    ctx.drawImage(poster,0,0,size,size);
    const original=ctx.getImageData(0,0,size,size).data,order=new Float32Array(size*size);
    for(let i=0;i<order.length;i++)order[i]=revealOrder(i%size,Math.floor(i/size),size);
    levels.set(size,{size,original,two:palettePixels(original,size,'two'),four:palettePixels(original,size,'four'),order,frame:ctx.createImageData(size,size),surface,context:ctx});
  }
  const draw=(ms:number)=>{
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);
    if(ms>=980)return; // Hand back to the identical DOM poster before UI overlays it.
    // Only the background matte fades; the character itself changes pixel values in place.
    context.globalAlpha=1-smooth((ms-760)/220);context.fillStyle='#090b0e';context.fillRect(0,0,width,height);context.globalAlpha=1;
    if(ms<200)return;
    if(ms>=940){context.imageSmoothingEnabled=true;context.drawImage(poster,layout.x,layout.y,layout.size,layout.size);return;}
    const level=levels.get(ms<820?256:512)!;
    const {two,four,original,frame,order}=level;
    const colorProgress=clamp01((ms-400)/240),fullProgress=clamp01((ms-680)/190);
    const visible=ms>=248?1:clamp01((ms-200)/48);
    for(let j=0,i=0;j<order.length;j++,i+=4){
      const source=fullProgress>order[j]?original:colorProgress>order[j]?four:two;
      frame.data[i]=source[i];frame.data[i+1]=source[i+1];frame.data[i+2]=source[i+2];
      frame.data[i+3]=visible>=1||visible>order[j]?source[i+3]:0;
    }
    level.context.putImageData(frame,0,0);
    context.imageSmoothingEnabled=false;
    context.drawImage(level.surface,layout.x,layout.y,layout.size,layout.size);
  };
  return {draw,setLayout:(next:AwakeningCharacterLayout)=>{layout=next;},dispose:()=>{levels.forEach(l=>{l.surface.width=l.surface.height=1;});levels.clear();canvas.width=canvas.height=1;}};
}
