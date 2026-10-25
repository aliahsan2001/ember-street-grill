/* Smoke particles drift up and gather into each [data-smoke] heading, then hand over to
   the real HTML text. Each glyph is traced from the live layout, so line breaks, colours
   and fonts match exactly. */

import { gsap, ScrollTrigger } from './motion.js';
import { LITE, REDUCED } from './env.js';

const SMOKE = [158, 146, 138];

function glyphs(heading) {
  // every visible character with its box and colour, using Ranges so the DOM is untouched
  const out = [];
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    const style = getComputedStyle(node.parentElement);
    const upper = style.textTransform === 'uppercase';
    for (let i = 0; i < node.length; i++) {
      const ch = node.data[i];
      if (!ch.trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width) continue;
      out.push({ ch: upper ? ch.toUpperCase() : ch, r, style });
    }
  }
  return out;
}

function form(heading) {
  const box = heading.getBoundingClientRect();
  const padX = 50, padTop = 30, padBottom = 190;
  const W = Math.ceil(box.width + padX * 2), H = Math.ceil(box.height + padTop + padBottom);
  const dpr = Math.min(devicePixelRatio || 1, 1.5);

  // 1) draw the real glyphs offscreen and sample their pixels as targets
  const off = document.createElement('canvas');
  off.width = Math.ceil(box.width);
  off.height = Math.ceil(box.height);
  const og = off.getContext('2d', { willReadFrequently: true });
  og.textBaseline = 'alphabetic';
  // computed styles are live, so read real colours with the heading unhidden (same frame, no flash)
  heading.classList.remove('smoke-pending');
  const list = glyphs(heading);
  list.forEach(({ ch, r, style }) => {
    const size = parseFloat(style.fontSize);
    og.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    og.fillStyle = style.color;
    // baseline sits about 82% down a capital's line box for these display faces
    const m = og.measureText(ch);
    const asc = m.actualBoundingBoxAscent || size * 0.75;
    const desc = m.actualBoundingBoxDescent || 0;
    const top = r.top - box.top + (r.height - (asc + desc)) / 2 + asc;
    og.fillText(ch, r.left - box.left + (r.width - m.width) / 2, top);
  });
  heading.classList.add('smoke-pending');
  const data = og.getImageData(0, 0, off.width, off.height).data;
  const area = off.width * off.height;
  const step = Math.max(3, Math.round(Math.sqrt(area / 2600)));
  const parts = [];
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const i = (y * off.width + x) * 4;
      if (data[i + 3] < 140) continue;
      parts.push({
        tx: x + padX, ty: y + padTop,
        sx: x + padX + (Math.random() - 0.5) * 220,
        sy: H - Math.random() * 60,
        delay: Math.random() * 0.45 + (x / off.width) * 0.4,
        seed: Math.random() * 100,
        col: [data[i], data[i + 1], data[i + 2]],
      });
    }
  }

  // 2) animate them up from the smoke
  const canvas = document.createElement('canvas');
  canvas.className = 'smoke-canvas';
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.cssText = `left:${-padX}px;top:${-padTop}px;width:${W}px;height:${H}px`;
  heading.appendChild(canvas);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);

  const dur = 1.35, total = 0.85 + dur;
  const dot = Math.max(1.6, step * 0.75);
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / 1000;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      const k = Math.min(1, Math.max(0, (t - p.delay) / dur));
      const e = 1 - Math.pow(1 - k, 3);
      const wob = (1 - e) * 26;
      const x = p.sx + (p.tx - p.sx) * e + Math.sin(t * 2.6 + p.seed) * wob;
      const y = p.sy + (p.ty - p.sy) * e + Math.cos(t * 2.1 + p.seed) * wob * 0.5;
      const r = dot + (1 - e) * 7;
      const c = SMOKE.map((v, i) => Math.round(v + (p.col[i] - v) * e * e));
      g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.12 + e * 0.88})`;
      if (e < 0.92) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillRect(x - dot / 2, y - dot / 2, dot, dot);
      }
    }
    if (t < total) requestAnimationFrame(frame);
    else finish();
  }

  function finish() {
    heading.classList.remove('smoke-pending');
    heading.classList.add('smoke-done');
    gsap.to(canvas, { opacity: 0, duration: 0.5, ease: 'power1.out', onComplete: () => canvas.remove() });
  }
  requestAnimationFrame(frame);
}

export function smokeHeadings(root) {
  root.querySelectorAll('[data-smoke]').forEach((h) => {
    if (LITE || REDUCED) {
      gsap.from(h, { opacity: 0, y: REDUCED ? 0 : 24, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
      return;
    }
    h.classList.add('smoke-pending');
    ScrollTrigger.create({
      trigger: h,
      start: 'top 82%',
      once: true,
      onEnter: () => document.fonts.ready.then(() => form(h)),
    });
  });
}
