/** Initial source-poster pose only; never changes the accepted idle/greeting targets. */
const posterPose:Record<string,number>={angleX:0,angleY:0,angleZ:0,eyeX:0,eyeY:0,eyeOpenL:1,eyeOpenR:1,eyeSmile:0,brow:0,mouthOpen:1,mouthForm:0,body:0,breath:0,breathHead:0,bangL:0,bangC:0,bangR:0,physAmp:0,fhAmp:0};
export const POSTER_HANDOFF_MS=360;
export function blendPosterHandoff<T extends Record<string,number|boolean>>(target:T,elapsed:number):T{
 const p=Math.max(0,Math.min(1,elapsed/POSTER_HANDOFF_MS));
 if(p>=1)return target;
 const eased=p*p*(3-2*p),result:Record<string,number|boolean>={...target};
 for(const [key,source] of Object.entries(posterPose))if(typeof target[key]==='number')result[key]=source+(Number(target[key])-source)*eased;
 return result as T;
}
