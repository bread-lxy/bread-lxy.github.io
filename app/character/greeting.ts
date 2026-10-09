export type Greeting = { phase:'pending'|'playing'|'settling'|'done'; startedAt:number; settleAt:number };
export const GREETING_DURATION=1800;
export const GREETING_SETTLE=320;
export const createGreeting=():Greeting=>({phase:'pending',startedAt:0,settleAt:0});
/** Shader/upload stalls after ready are not useful entrance frames. */
export function createGreetingReadyGate(start:number){
  let last=start,stable=0;
  return (now:number)=>{const gap=now-last;last=now;stable=gap>0&&gap<150?stable+gap:0;return stable>=250;};
}
/** Loading time does not consume the performance. Cancellation is terminal for this mount. */
export function advanceGreeting(state:Greeting,input:{ready:boolean;eligible:boolean;interacted:boolean;now:number}):Greeting{
  if(state.phase==='done')return state;
  if(state.phase==='settling')return input.now-state.settleAt>=GREETING_SETTLE?{...state,phase:'done'}:state;
  if(!input.eligible||input.interacted)return state.phase==='playing'?{...state,phase:'settling',settleAt:input.now}:{...state,phase:'done'};
  if(state.phase==='pending')return input.ready?{...state,phase:'playing',startedAt:input.now}:state;
  return input.now-state.startedAt>=GREETING_DURATION?{...state,phase:'done'}:state;
}
