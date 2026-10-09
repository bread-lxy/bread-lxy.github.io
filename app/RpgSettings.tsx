"use client";
import {useEffect, useRef} from 'react';
import './rpg-settings.css';
type Props = {
  bgmEnabled: boolean; sfxEnabled: boolean; reducedMotion: boolean; highContrast: boolean;
  onToggleBgm: () => void; onToggleSfx: () => void; onToggleReducedMotion: () => void; onToggleHighContrast: () => void;
};
export function RpgSettings(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {const element = dialog.current; return () => element?.close();}, []);
  const rows = [
    ['背景音乐', props.bgmEnabled, props.onToggleBgm], ['界面音效', props.sfxEnabled, props.onToggleSfx],
    ['减少动效', props.reducedMotion, props.onToggleReducedMotion], ['高对比度', props.highContrast, props.onToggleHighContrast],
  ] as const;
  return <>
    <button ref={trigger} type="button" onClick={() => dialog.current?.showModal()} aria-label="设置" aria-haspopup="dialog">设置</button>
    <dialog ref={dialog} className="rpg-settings" aria-label="设置" onClose={() => trigger.current?.focus({preventScroll: true})}>
      <div className="rpg-settings-heading"><h2>SETTINGS</h2><button type="button" aria-label="关闭设置" onClick={() => dialog.current?.close()}>×</button></div>
      {rows.map(([label,enabled,toggle]) => <button key={label} className="rpg-setting-row" type="button" aria-pressed={enabled} onClick={toggle}><span>{label}</span><strong>{enabled ? 'ON' : 'OFF'}</strong></button>)}
    </dialog>
  </>;
}
