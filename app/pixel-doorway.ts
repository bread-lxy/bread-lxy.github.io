/**
 * Adapted from Codrops PixelTransition / js/demo1/overlay.js, MIT.
 * Upstream: 2651c9d5dc53d895cb7b3d721ddb9bdb1669f9ba (2023-04-05).
 * Copyright (c) 2009 - 2023 Codrops. Full license: docs/licenses/PixelTransition-MIT.txt.
 * Keeps Cell, the 2D grid construction and Promise-based show/hide lifecycle.
 * Changes: square grid, connected distance order, binary visibility (no scaling
 * or independent fades), one tween, explicit cancellation and completion.
 */
import gsap from 'gsap';
import {doorwayGrid} from './entry-geometry';
class Cell {
  DOM: {el: HTMLDivElement};
  row: number;
  column: number;
  constructor(row: number, column: number) {
    this.DOM = {el: document.createElement('div')};
    this.DOM.el.className = 'pixel-doorway-cell';
    this.row = row; this.column = column;
  }
}
export class Overlay {
  DOM: {el: HTMLElement};
  cells: Cell[][] = [];
  options: ReturnType<typeof doorwayGrid>;
  private tween?: gsap.core.Tween;
  private settle?: (completed: boolean) => void;
  constructor(element: HTMLElement, origin: {x: number; y: number}) {
    this.DOM = {el: element};
    this.options = doorwayGrid(innerWidth, innerHeight, origin.x, origin.y);
    const {rows, columns, size, left, top} = this.options;
    element.style.setProperty('--columns', String(columns));
    Object.assign(element.style, {left: `${left}px`, top: `${top}px`, width: `${columns*size}px`, height: `${rows*size}px`, gridTemplateRows: `repeat(${rows}, ${size}px)`});
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < rows; ++i) {
      this.cells[i] = [];
      for (let j = 0; j < columns; ++j) {
        const cell = new Cell(i, j); this.cells[i][j] = cell; fragment.appendChild(cell.DOM.el);
      }
    }
    element.appendChild(fragment);
  }
  show() {
    gsap.set(this.DOM.el, {opacity: 1});
    for (const cell of this.cells.flat()) cell.DOM.el.style.visibility = 'visible';
    return Promise.resolve(true);
  }
  hide({duration = .9} = {}) {
    return new Promise<boolean>(resolve => {
      this.settle = resolve;
      const {ranks, maxRank} = this.options;
      const ordered = this.cells.flat().sort((a,b) => ranks[a.row][a.column] - ranks[b.row][b.column]);
      let cursor = 0;
      const state = {radius: -.1};
      this.tween = gsap.fromTo(state, {radius: -.1}, {
        radius: maxRank + 1, duration, ease: 'power2.inOut',
        onUpdate: () => {
          // Monotone distance keeps every revealed cell connected to the slit.
          while (cursor < ordered.length && ranks[ordered[cursor].row][ordered[cursor].column] <= state.radius) ordered[cursor++].DOM.el.style.visibility = 'hidden';
          this.DOM.el.dataset.progress = String(Math.round((this.tween?.progress() ?? 0)*100));
        },
        onComplete: () => {this.settle = undefined; resolve(true);},
      });
    });
  }
  finish() { this.tween?.progress(1); }
  destroy() {
    this.tween?.kill(); this.tween = undefined;
    this.settle?.(false); this.settle = undefined; this.DOM.el.replaceChildren();
  }
}
