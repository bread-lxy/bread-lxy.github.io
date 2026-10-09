export type WordmarkRect={left:number;top:number;width:number;height:number};
export type WordmarkLayout={source:WordmarkRect;target:WordmarkRect;stageBottom:number;homeBottom:number;viewportHeight:number};
const mix=(from:number,to:number,p:number)=>from+(to-from)*p;
/** Two complementary cuts of one interpolated glyph rectangle. A ribbon may
 * separate the cuts spatially, but never removes glyph rows. No scroll runway. */
export function handoverAt(layout:WordmarkLayout,scroll:number){
 const {source,target,stageBottom}=layout;
 const start=Math.max(0,layout.homeBottom-layout.viewportHeight);
 const progress=Math.min(1,Math.max(0,(scroll-start)/Math.max(1,target.height)));
 const rect={left:mix(source.left,target.left,progress),top:mix(source.top,stageBottom,progress),width:mix(source.width,target.width,progress),height:mix(source.height,target.height,progress)};
 return {progress,rect,
  source:{x:rect.left-source.left,y:rect.top-source.top,scaleX:rect.width/Math.max(1,source.width),scaleY:rect.height/Math.max(1,source.height)},
  target:{x:rect.left-target.left,y:rect.top-stageBottom,scaleX:rect.width/Math.max(1,target.width),scaleY:rect.height/Math.max(1,target.height)},
 };
}
