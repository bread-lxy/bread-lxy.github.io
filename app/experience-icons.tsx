/** Pixelarticons free subset, unmodified path data.
 * 8275e0af7c16aa40c54ea2b90b7af83b1fe4eb4c · MIT · docs/licenses/Pixelarticons-MIT.txt
 * https://github.com/halfmage/pixelarticons/tree/8275e0af7c16aa40c54ea2b90b7af83b1fe4eb4c/svg
 */
const paths = {
  notes: ['M6 8h2v12H6zM2 4h2v12H2zm18 4h2v8h-2zM8 6h12v2H8zM4 2h12v2H4zm14 14h2v2h-2zm-2 2h2v2h-2zm-8 2h8v2H8zm6-6h6v2h-6z', 'M14 14h2v6h-2zm2-10h2v2h-2zM4 16h2v2H4z'],
  folder: ['M4 4h6v2H4zm0 14h16v2H4zM20 8h2v10h-2zM2 6h2v12H2zm8 0h10v2H10z'],
  image: ['M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zm-4 8h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-8 0h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z', 'M20 16h2v2h-2zM8 16h2v2H8zm-2 2h2v2H6zM8 6h2v2H8zM6 8h2v2H6zm2 2h2v2H8zm2-2h2v2h-2z'],
  globe: ['M6 2h12v2H6zm0 18h12v2H6zM4 4h2v2H4zm5 0h2v2H9zm0 14h2v2H9zm4 0h2v2h-2zM7 6h2v12H7zm8 0h2v12h-2zm-2-2h2v2h-2zm7 0h-2v2h2zM2 6h2v12H2zm20 0h-2v12h2zM4 18h2v2H4zm16 0h-2v2h2z', 'M3 11h18v2H3z'],
  info: ['M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zm-9 5h2V7h-2zm0 8h2v-6h-2z'],
} as const;
export type ExperienceIcon = keyof typeof paths;
export function PixelIcon({ name }: { name: ExperienceIcon }) {
  return <svg className="exp-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">{paths[name].map((d, i) => <path d={d} key={i}/>)}</svg>;
}
