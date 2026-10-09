/*!
 * matrixrain.js
 * Matrix-style digital rain as a drop-in canvas plugin.
 *
 * Version: 1.0.0
 * Author: Go Boldly Forward (https://goboldlyforward.com/)
 * Homepage: https://goboldlyforward.github.io/matrixrain/
 * License: MIT
 *
 * Pairs with matrixrain.css. Mount on an empty element or a <canvas>:
 *
 *   const rain = new MatrixRain('#hero');
 *   rain.setOptions({ theme: 'binary', fontSize: 18, speed: 50, density: 0.6 });
 *
 * Themes ship in the box: matrix (default), binary, emoji, terminal,
 * bloodrain, arctic, gbf. Override any field via options.
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.MatrixRain = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const THEMES = {
    matrix: {
      charset: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンｱｳｴｵｶｷｸｹ0123456789Zコﾗ',
      color: '#00ff66',
      leadColor: '#d6ffe0',
      background: '#000000',
      fadeAlpha: 0.06,
      glow: 6,
      fontFamily: '"Courier New", "Andale Mono", monospace',
    },
    binary: {
      charset: '01',
      color: '#39ff14',
      leadColor: '#ffffff',
      background: '#000000',
      fadeAlpha: 0.08,
      glow: 4,
      fontFamily: '"Courier New", monospace',
    },
    emoji: {
      charset: ['🌧','💧','☔','⚡','💦','🌊','🪐','🌟','✨','❄️','🌙','☄️','🛸'],
      color: '#ffffff',
      leadColor: null,
      background: '#0a0f1f',
      fadeAlpha: 0.10,
      glow: 0,
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      columnRatio: 1.35,
    },
    terminal: {
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_=*+/<>[]{}!?@#$%&',
      color: '#ffb000',
      leadColor: '#fff7d6',
      background: '#180e00',
      fadeAlpha: 0.07,
      glow: 5,
      fontFamily: '"Courier New", monospace',
    },
    bloodrain: {
      charset: 'XOMARYDPSHFB6†‡✟⛧666',
      color: '#c8201f',
      leadColor: '#ffe1e1',
      background: '#0a0000',
      fadeAlpha: 0.05,
      glow: 10,
      fontFamily: '"Courier New", monospace',
    },
    arctic: {
      charset: 'アイウエオカキクケコサシスセソ0123456789❄✦✧',
      color: '#7ec8ff',
      leadColor: '#0d47a1',
      background: '#eef6ff',
      fadeAlpha: 0.10,
      glow: 0,
      fontFamily: '"Courier New", monospace',
    },
    gbf: {
      charset: '01',
      color: '#f5d442',
      leadColor: '#ffffff',
      background: '#000000',
      fadeAlpha: 0.05,
      glow: 0,
      fontFamily: 'monospace',
    },
  };

  const DEFAULTS = {
    theme: 'matrix',
    charset: null,
    color: null,
    leadColor: null,
    background: null,
    fadeAlpha: null,
    fontSize: 16,
    fontFamily: null,
    speed: 33,
    density: 1.0,
    glow: null,
    columnRatio: null,
    rowRatio: 1.0,
    resetChance: 0.025,
    paused: false,
    autoStart: true,
  };

  function parseColorToRgb(input) {
    if (!input) return null;
    if (typeof input === 'string') {
      const m = input.trim().toLowerCase();
      if (m === 'transparent' || m === 'none') return null;
      if (m[0] === '#') {
        let hex = m.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) {
          return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
          };
        }
      }
      const rgbMatch = m.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgbMatch) {
        return {
          r: +rgbMatch[1],
          g: +rgbMatch[2],
          b: +rgbMatch[3],
        };
      }
    }
    return null;
  }

  function toGlyphArray(charset) {
    if (Array.isArray(charset)) return charset.slice();
    return Array.from(String(charset || ''));
  }

  // Theme-overridable fields fall back to theme defaults; explicit `null` in
  // userOpts clears a previous override.
  const THEME_OVERRIDABLE = [
    'charset', 'color', 'leadColor', 'background',
    'fadeAlpha', 'glow', 'fontFamily', 'columnRatio',
  ];

  function resolveOptions(userOpts) {
    const themeName = userOpts.theme || DEFAULTS.theme;
    const themeDef = THEMES[themeName] || {};
    const merged = Object.assign({}, DEFAULTS, themeDef, userOpts);
    THEME_OVERRIDABLE.forEach(k => {
      if (userOpts[k] == null) {
        merged[k] = themeDef[k] != null ? themeDef[k] : DEFAULTS[k];
      }
    });
    merged._themeDef = themeDef;
    merged._glyphs = toGlyphArray(merged.charset);
    if (!merged._glyphs.length) merged._glyphs = ['0', '1'];
    return merged;
  }

  class MatrixRain {
    constructor(target, options) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) throw new Error('MatrixRain: target element not found');

      this.host = el;
      this._ownCanvas = false;

      if (el.tagName && el.tagName.toLowerCase() === 'canvas') {
        this.canvas = el;
      } else {
        el.classList.add('matrixrain');
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'matrixrain__canvas';
        el.appendChild(this.canvas);
        this._ownCanvas = true;
      }

      this.ctx = this.canvas.getContext('2d');
      this._userOpts = Object.assign({}, options || {});
      this.options = resolveOptions(this._userOpts);
      this._drops = [];
      this._prevChars = [];
      this._active = [];
      this._cssWidth = 0;
      this._cssHeight = 0;
      this._dpr = window.devicePixelRatio || 1;
      this._frameTimer = null;
      this._running = false;

      this._onResize = this._onResize.bind(this);
      this._tick = this._tick.bind(this);

      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(this._onResize);
        this._ro.observe(this._ownCanvas ? this.host : this.canvas);
      } else {
        window.addEventListener('resize', this._onResize);
      }

      this._resize();
      this._applyHostTheme();

      if (this.options.autoStart && !this.options.paused) this.start();
    }

    start() {
      if (this._running) return;
      this._running = true;
      this._scheduleNext();
    }

    pause() {
      this._running = false;
      if (this._frameTimer) {
        clearTimeout(this._frameTimer);
        this._frameTimer = null;
      }
    }

    resume() { this.start(); }

    stop() {
      this.pause();
      this._clear();
    }

    setOptions(patch) {
      const wasRunning = this._running;
      const prevTheme = this.options.theme;
      // Merge into user-overrides (not resolved options) so theme swaps work.
      Object.keys(patch || {}).forEach(k => {
        this._userOpts[k] = patch[k];
      });
      this.options = resolveOptions(this._userOpts);
      if (this.options.theme !== prevTheme) this._applyHostTheme();
      this._resize(true);
      if (wasRunning) {
        this.pause();
        this.start();
      }
    }

    resize() { this._resize(true); }

    destroy() {
      this.pause();
      if (this._ro) this._ro.disconnect();
      else window.removeEventListener('resize', this._onResize);
      if (this._ownCanvas) {
        this.canvas.remove();
        this.host.classList.remove('matrixrain');
        if (this._currentThemeClass) {
          this.host.classList.remove(this._currentThemeClass);
        }
      }
      this._drops = [];
      this._prevChars = [];
      this._active = [];
    }

    _applyHostTheme() {
      if (!this._ownCanvas) return;
      if (this._currentThemeClass) {
        this.host.classList.remove(this._currentThemeClass);
      }
      const cls = this.options.theme ? `matrixrain--${this.options.theme}` : null;
      if (cls) this.host.classList.add(cls);
      this._currentThemeClass = cls;
    }

    _measure() {
      const box = (this._ownCanvas ? this.host : this.canvas).getBoundingClientRect();
      let w = Math.max(1, Math.floor(box.width));
      let h = Math.max(1, Math.floor(box.height));
      // Raw <div> hosts often report 0 height — fall back to a sane default.
      if (h < 8) h = 240;
      return { w, h };
    }

    _onResize() { this._resize(true); }

    _resize(force) {
      const { w, h } = this._measure();
      // Site adaptation: bound two simultaneous rain layers to a 1.8 MP buffer
      // each, and never spend more than 1.5 device pixels per CSS pixel.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1800000 / (w * h)));
      if (!force && w === this._cssWidth && h === this._cssHeight && dpr === this._dpr) return;
      this._cssWidth = w;
      this._cssHeight = h;
      this._dpr = dpr;

      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._initColumns();
    }

    _initColumns() {
      const fs = Math.max(6, this.options.fontSize);
      const colRatio = this.options.columnRatio || this.options._themeDef.columnRatio || 1.0;
      const colStep = fs * colRatio;
      const rowStep = fs * (this.options.rowRatio || 1.0);
      const cols = Math.max(1, Math.ceil(this._cssWidth / colStep));

      const drops = new Array(cols);
      const prev = new Array(cols);
      const active = new Array(cols);
      const rowsTotal = Math.max(2, Math.ceil(this._cssHeight / rowStep) + 4);
      const density = Math.max(0, Math.min(1, this.options.density));

      for (let i = 0; i < cols; i++) {
        drops[i] = Math.floor(Math.random() * rowsTotal);
        prev[i] = null;
        active[i] = Math.random() < density;
      }

      this._colStep = colStep;
      this._rowStep = rowStep;
      this._cols = cols;
      this._drops = drops;
      this._prevChars = prev;
      this._active = active;

      this._fillBackgroundOnce();
    }

    _fillBackgroundOnce() {
      const bg = this.options.background;
      if (!bg || bg === 'transparent') {
        this.ctx.clearRect(0, 0, this._cssWidth, this._cssHeight);
        return;
      }
      this.ctx.fillStyle = bg;
      this.ctx.fillRect(0, 0, this._cssWidth, this._cssHeight);
    }

    _clear() {
      this.ctx.clearRect(0, 0, this._cssWidth, this._cssHeight);
    }

    _scheduleNext() {
      if (!this._running) return;
      const wait = Math.max(8, this.options.speed);
      this._frameTimer = setTimeout(this._tick, wait);
    }

    _tick() {
      this._frameTimer = null;
      if (!this._running) return;
      try {
        this._drawFrame();
      } finally {
        this._scheduleNext();
      }
    }

    _drawFrame() {
      const ctx = this.ctx;
      const w = this._cssWidth;
      const h = this._cssHeight;
      const opts = this.options;
      const glyphs = opts._glyphs;
      const colStep = this._colStep;
      const rowStep = this._rowStep;
      const bg = opts.background;
      const fadeAlpha = Math.max(0, Math.min(1, opts.fadeAlpha));

      if (!bg || bg === 'transparent') {
        // destination-out erases progressively on a transparent canvas.
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = prev;
      } else {
        const rgb = parseColorToRgb(bg) || { r: 0, g: 0, b: 0 };
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fadeAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.font = `${opts.fontSize}px ${opts.fontFamily || 'monospace'}`;
      ctx.textBaseline = 'top';
      const glow = +opts.glow || 0;
      if (glow > 0) {
        ctx.shadowBlur = glow;
        ctx.shadowColor = opts.color;
      } else {
        ctx.shadowBlur = 0;
      }

      const baseColor = opts.color;
      const leadColor = opts.leadColor === false ? null : (opts.leadColor || null);

      for (let i = 0; i < this._cols; i++) {
        if (!this._active[i]) continue;

        const x = i * colStep;
        const yIndex = this._drops[i];
        const y = yIndex * rowStep;
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];

        // Overwrite prior head in base color → bright-head + trail effect.
        if (leadColor && yIndex > 0 && this._prevChars[i] != null) {
          ctx.fillStyle = baseColor;
          ctx.fillText(this._prevChars[i], x, (yIndex - 1) * rowStep);
        }

        ctx.fillStyle = leadColor || baseColor;
        ctx.fillText(ch, x, y);
        this._prevChars[i] = ch;

        if (y > h && Math.random() > 1 - opts.resetChance) {
          this._drops[i] = 0;
          this._prevChars[i] = null;
        } else {
          this._drops[i] = yIndex + 1;
        }
      }

      if (glow > 0) ctx.shadowBlur = 0;
    }
  }

  MatrixRain.THEMES = THEMES;
  return MatrixRain;
});
