/**
 * Bayer normalization, quantization and luminance adapted from faux-light,
 * markdibarry, MIT (2025), a378ec355200459d7491317551c124f1dc09ca2e.
 * See docs/licenses/faux-light-MIT.txt and docs/research/character-awakening.md.
 * Hue-aware nearest palette and reveal ordering are this project's adaptations.
 */
export const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5] as const;
export const AWAKENING_PALETTE = [[25,22,33],[148,113,190],[116,219,197],[243,237,220]] as const;
export const clamp01 = (n:number)=>Math.min(1,Math.max(0,n));
export const smooth = (n:number)=>{const p=clamp01(n);return p*p*(3-2*p);};
export function bayerOffset(x:number,y:number){return (BAYER4[(y&3)*4+(x&3)]+.5)/16-.5;}
export function luminance(r:number,g:number,b:number){return (.2126*r+.7152*g+.0722*b)/255;}

/** Keep source alpha exactly: palette selection never makes transparent pixels opaque. */
export function palettePixels(source:Uint8ClampedArray,width:number,mode:'two'|'four'){
  const output=new Uint8ClampedArray(source.length);
  for(let i=0;i<source.length;i+=4){
    const cell=i/4,x=cell%width,y=Math.floor(cell/width),offset=bayerOffset(x,y);
    const r=source[i],g=source[i+1],b=source[i+2];
    let index=0;
    if(mode==='two'){
      // Lower dither amplitude preserves solid facial lines, unlike default full-range noise.
      const value=(luminance(r,g,b)-.66)*1.7+.5+offset*.28;
      index=Math.round(clamp01(value))===1?3:0;
    }else{
      // Upstream palette is luminance-only. Nearest RGB + luminance here keeps teal hair teal.
      const shift=offset*24;let best=Infinity;
      AWAKENING_PALETTE.forEach((color,j)=>{
        const dr=r+shift-color[0],dg=g+shift-color[1],db=b+shift-color[2];
        const dl=.2126*dr+.7152*dg+.0722*db;
        const distance=dr*dr*.28+dg*dg*.36+db*db*.36+dl*dl*.6;
        if(distance<best){best=distance;index=j;}
      });
    }
    const color=AWAKENING_PALETTE[index];
    output[i]=color[0];output[i+1]=color[1];output[i+2]=color[2];output[i+3]=source[i+3];
  }
  return output;
}

export function characterLayout(width:number,height:number){
  const mobile=width<=700,tablet=width<=1100;
  const size=mobile?width*1.45:height*(tablet?1.12:1.2);
  return {size,x:width*(mobile?.5:tablet?.65:.66)-size*.4875,y:height*(mobile||tablet?.29:.30)-size*.1853};
}

/** Monotonic head-to-hem frontier. Only its narrow edge is dithered, never random cells. */
export function revealOrder(x:number,y:number,width:number){
  return clamp01(y/width*.88+Math.abs(x/width-.49)*.16+bayerOffset(x,y)*.025);
}
export function awakeningBeat(ms:number){
  if(ms<120)return 'press';if(ms<200)return 'black';if(ms<400)return 'two';
  if(ms<680)return 'four';if(ms<980)return 'color';return 'land';
}
export const AWAKENING_DURATION=1200;
