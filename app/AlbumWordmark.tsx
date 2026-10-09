/** Existing OFL outlines split at their word-space; both clipped surfaces use
 * this exact lockup so the native-scroll handover matches. */
export function AlbumWordmark({target=false}:{target?:boolean}){
 return <div className="album-wordmark" {...(target?{'data-wordmark-target':'',role:'img','aria-label':'XUEYING LU'}:{'data-wordmark-source':'','aria-hidden':true})}>
  <div className="wordmark-ink" aria-hidden="true">
   <span className="wordmark-part wordmark-first">XUEYING</span>
   <span className="wordmark-part wordmark-last">LU</span>
  </div>
 </div>;
}
