/** Original v2 pixel partitions, not regenerated character art. Adapter code: MIT. */
export const V2_MODEL_ID='59bd5a-29e0bf61-7f2cd949';
// This revision changes only neck/chest RGB; the same arm/hair refinements apply.
export const V2_NECK_REPAIR_MODEL_ID='2a8449-ebedfed1-b2d9b71b';
export function isV2Model(modelId) {
  return modelId===V2_MODEL_ID || modelId===V2_NECK_REPAIR_MODEL_ID;
}
/** Merge only adjacent, equally configured source partitions AFTER settings validation.
 * Copy nontransparent original pixels once; transparent crop padding must not erase a neighbour.
 */
export function continuousV2Hair(layers) {
  const names=['back hair','back hair_1','back hair_2'];
  const parts=names.map(name=>layers.filter(l=>l.name===name));
  if(parts.some(p=>p.length!==1))return layers;
  const source=parts.map(p=>p[0]),first=layers.indexOf(source[0]);
  if(source.some((p,i)=>layers[first+i]!==p||['group','depth','visible','opacity'].some(k=>p[k]!==source[0][k])))return layers;
  const x=Math.min(...source.map(p=>p.x)),y=Math.min(...source.map(p=>p.y));
  const w=Math.max(...source.map(p=>p.x+p.w))-x,h=Math.max(...source.map(p=>p.y+p.h))-y;
  const data=new Uint8ClampedArray(w*h*4);
  for(const p of source)for(let py=0;py<p.h;py++)for(let px=0;px<p.w;px++){
    const s=(py*p.w+px)*4;if(!p.img.data[s+3])continue;
    const d=((py+p.y-y)*w+px+p.x-x)*4;
    if(data[d+3])return layers; // Unexpected overlap: preserve original draw semantics.
    data.set(p.img.data.subarray(s,s+4),d);
  }
  const strands=source.slice(1).flatMap((p,side)=>(p.strands||[]).map((s,i)=>({...s,side,phase:p.z+i*1.37})));
  const merged={...source[0],x,y,w,h,img:{width:w,height:h,data},strands,
    continuousBackHair:true,sourceIds:source.map(p=>p.sourceId||p.id)};
  return [...layers.slice(0,first),merged,...layers.slice(first+3)];
}

/** Weights are evaluated in undeformed PSD coordinates, never the turned head position. */
export function hairRootWeight(x,y){
  const t=Math.max(0,Math.min(1,(y-(x<512?270:260))/60));
  return t*t*(3-2*t);
}
function crop(layer,x0,y0,x1,y1){
  const w=x1-x0,h=y1-y0,data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=x+x0-layer.x,sy=y+y0-layer.y;
    if(sx<0||sy<0||sx>=layer.img.width||sy>=layer.img.height)continue;
    const src=(sy*layer.img.width+sx)*4,dst=(y*w+x)*4;
    data.set(layer.img.data.subarray(src,src+4),dst);
  }
  return {width:w,height:h,data};
}
export function refineV2Rig(rig){
  const original=rig.layers;
  const layers=original.flatMap(layer=>{
    const sourceId=String(layer.z)+':'+layer.name;
    if(layer.name==='handwear'){
      // Source columns522..581 are entirely transparent, including antialias fringe.
      return [{side:'l',x0:layer.x,x1:552,pivot:[403,360]},
        {side:'r',x0:552,x1:layer.x+layer.w,pivot:[633,397]}].map((part,index)=>{
          const img=crop(layer,part.x0,layer.y,part.x1,layer.y+layer.h);
          return {...layer,name:`handwear_${part.side}`,sourceId,z:layer.z+index*.1,x:part.x0,w:img.width,img,armSide:part.side,armPivot:part.pivot};
        });
    }
    // Face assets are accepted artwork. Never derive a closed eye by flattening
    // eyelashes: that changes the drawing, not just the animation.
    return [{...layer,sourceId}];
  });
  return {...rig,layers};
}
/** Pin shoulder seam and rotate the distal arm; never scale/stretch the whole sleeve. */
export function armPoint(x,y,pivot,amount,side='l'){
  const u=Math.max(0,Math.min(1,(y-(pivot[1]-20))/65));
  const weight=u*u*(3-2*u),angle=(side==='l'?-.06:.045)*Math.max(-.4,Math.min(1,amount))*weight;
  const rx=x-pivot[0],ry=y-pivot[1],c=Math.cos(angle),s=Math.sin(angle);
  return [pivot[0]+rx*c-ry*s,pivot[1]+rx*s+ry*c];
}
