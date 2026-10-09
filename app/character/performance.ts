import type { CharacterPoseId } from './types';
import type { sampleCue } from './motion';

export type WorldPose = { tilt: number; brow: number; eyes: number };
export function characterPose(pose: CharacterPoseId): WorldPose {
  return {
    reach: { tilt: -.12, brow: 0, eyes: 1 },
    lean: { tilt: .22, brow: .12, eyes: 1 },
    signal: { tilt: .045, brow: -.08, eyes: .92 },
    rest: { tilt: -.18, brow: .03, eyes: .96 },
  }[pose];
}

/** One parameter contract used by both the real renderer and motion regression checks. */
export function characterParameters({ seconds, gaze, pose, blink, cue, world='projects' }: {
  seconds: number; gaze: { x: number; y: number }; pose: WorldPose; blink: number;
  cue: ReturnType<typeof sampleCue>;
  world?:'experience'|'research'|'projects'|'studio'|'life';
}) {
  const smile = cue.action === 'tap' && cue.region !== 'ear' ? cue.weight : 0;
  const surprise = cue.action === 'tap' && cue.region === 'ear' ? cue.weight : 0;
  const confirm = cue.action === 'confirm' ? cue.weight : 0;
  const preview = cue.action === 'preview' ? cue.weight : 0;
  const enter = cue.action === 'enter' ? cue.weight : 0;
  const p=cue.progress;
  const arc=(start:number,end:number)=>p<=start||p>=end?0:Math.sin((p-start)/(end-start)*Math.PI);
  const greetingSmile=enter*arc(.16,.91);
  const greetingRaise=enter*arc(.28,.92);
  const anticipate=enter*arc(0,.34);
  // Event -> anticipation / main pose / release -> independent spring follow-through.
  // Timing reference: CubismWebSamples motion-priority/fade lifecycle; no SDK/motion assets copied.
  const gesture={
    experience:{turn:-.72,nod:.12,tilt:-.38,body:.24,left:.55,right:.08,hair:.3},
    research:{turn:-.12,nod:-.45,tilt:.12,body:-.24,left:.16,right:.05,hair:.12},
    projects:{turn:.23,nod:.32,tilt:-.24,body:.32,left:.66,right:.18,hair:.28},
    studio:{turn:.34,nod:.2,tilt:.7,body:-.32,left:.9,right:.25,hair:.58},
    life:{turn:-.28,nod:.06,tilt:-.5,body:.26,left:-.15,right:-.12,hair:.2},
  }[world];
  const move=preview*arc(.04,.96),lead=preview*arc(0,.25);
  const tapArm=smile*arc(.12,.87),earArm=surprise*arc(.08,.88);
  const earSide=cue.earIndex===1?-1:1;
  return {
    // The one-time arrival is a readable body/head gesture, not idle breathing.
    // Keep it in the existing rig's parameter range and leave all facial art alone.
    angleX: gaze.x * .45*(1-enter)*(1-preview) + Math.sin(seconds * .61) * .025-anticipate*.32+greetingSmile*.65+move*gesture.turn-lead*gesture.turn*.18+earArm*.16*earSide,
    angleY: -gaze.y * .3 - confirm * .4 + move*gesture.nod - anticipate*.32+greetingSmile*.45+tapArm*.22,
    angleZ: pose.tilt + Math.sin(seconds * .48) * .03 + smile * .3 + move*gesture.tilt + greetingSmile*.95-anticipate*.28+earArm*.25*earSide,
    eyeX: gaze.x * .45*(1-enter), eyeY: gaze.y * .3*(1-enter),
    eyeOpenL: blink * pose.eyes * (1 - smile * .98) * (1 - confirm * .9),
    eyeOpenR: blink * pose.eyes * (1 - smile * .98) * (1 - confirm * .9),
    eyeSmile: smile,
    brow: pose.brow + smile * .35 + surprise * .42,
    // Use the character's drawn mouth, not an inert form value on an invisible mesh.
    mouthOpen: smile * .65 + surprise * .8,
    mouthForm: smile * .6 - surprise * .25,
    greetingRaise,
    armL:Math.max(-.4,Math.min(1,greetingRaise+tapArm*.68+earArm*(earSide===1?.4:.12)+move*gesture.left)),
    armR:Math.max(-.4,Math.min(1,tapArm*.1+earArm*(earSide===-1?.35:.06)+move*gesture.right)),
    hairL:move*gesture.hair+tapArm*.28+earArm*(earSide===1?.65:.04)+greetingSmile*.5,
    hairR:-move*gesture.hair*.65-tapArm*.15-earArm*(earSide===-1?.65:.04)-greetingSmile*.28,
    bangL:Math.sin(seconds*1.1-.25)*.025+greetingSmile*.07+move*gesture.tilt*.12+tapArm*.07,
    bangC:Math.sin(seconds*1.1-.55)*.018+greetingSmile*.035+move*gesture.nod*.1,
    bangR:Math.sin(seconds*1.1-.8)*.025-greetingSmile*.05-move*gesture.tilt*.09-earArm*.08,
    irisScale: 1 - surprise * .13,
    body: Math.sin(seconds * 1.6) * .1 - greetingSmile*.9+move*gesture.body-tapArm*.2+earArm*.12*earSide-confirm*.12,
    breath:.8+.8*Math.sin(seconds*2*Math.PI/3.4),
    breathHead:.8+.8*Math.sin(seconds*2*Math.PI/3.4-.6),
    physAmp: .55 + surprise * .28+enter*.12, soft: .5, fhAmp: .32, fhSoft: .5,
    earImpulse: surprise + enter * .22 + preview * .12,
    earImpulse0: (cue.earIndex === 1 ? 0 : surprise) + enter * .22 + move*gesture.hair + tapArm*.18,
    earImpulse1: (cue.earIndex === 0 ? 0 : surprise) + enter * .14 + move*gesture.hair*.6 + tapArm*.08,
    bust: 0, rand: false, talk: false,
  };
}

/** Source-space bounds include the actual cloth tips, not a guessed screen rectangle. */
export function accessoryHitBox(ear: { root: readonly number[]; tip: readonly number[]; width: number }) {
  const pad = ear.width / 2 + 12;
  const left = Math.max(0, Math.min(ear.root[0], ear.tip[0]) - pad);
  const top = Math.max(0, Math.min(ear.root[1], ear.tip[1]) - pad);
  const right = Math.min(1024, Math.max(ear.root[0], ear.tip[0]) + pad);
  const bottom = Math.min(1024, Math.max(ear.root[1], ear.tip[1]) + pad);
  return { left: left / 10.24, top: top / 10.24, width: (right - left) / 10.24, height: (bottom - top) / 10.24 };
}
