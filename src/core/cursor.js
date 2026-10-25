/* The cursor is a small ember. Fast movement throws sparks that arc and fade.
   Mouse/trackpad only; touch devices keep their normal behaviour. */

import { FINE, REDUCED } from './env.js';

export function initCursor() {
  if (!FINE || REDUCED) return;
  document.documentElement.classList.add('has-ember-cursor');

  const dot = document.createElement('div');
  dot.className = 'ember-cursor';
  dot.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'spark-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas, dot);

  const g = canvas.getContext('2d');
  let dpr = 1;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  size();
  addEventListener('resize', size);

  const sparks = [];
  let x = -100, y = -100, lx = x, ly = y, lt = performance.now(), running = false;

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    dot.classList.add('is-visible');
    const now = performance.now();
    const dt = Math.max(8, now - lt);
    const vx = (x - lx) / dt, vy = (y - ly) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed > 1.1) {
      const n = Math.min(6, Math.floor(speed * 1.6));
      for (let i = 0; i < n; i++) {
        sparks.push({
          x, y,
          vx: -vx * (0.15 + Math.random() * 0.35) + (Math.random() - 0.5) * 1.6,
          vy: -vy * (0.15 + Math.random() * 0.35) - Math.random() * 1.8,
          life: 1, decay: 0.018 + Math.random() * 0.03, size: 1 + Math.random() * 1.6,
        });
      }
      if (!running) { running = true; requestAnimationFrame(tick); }
    }
    lx = x; ly = y; lt = now;
  }, { passive: true });

  document.addEventListener('pointerleave', () => dot.classList.remove('is-visible'));
  document.addEventListener('pointerover', (e) => {
    dot.classList.toggle('is-hover', !!e.target.closest('a, button, [role="button"], input, select, textarea, label, [data-drag]'));
  });
  addEventListener('pointerdown', () => dot.classList.add('is-down'));
  addEventListener('pointerup', () => dot.classList.remove('is-down'));

  function tick() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vy += 0.12; // gravity pulls sparks into an arc
      s.vx *= 0.97;
      s.x += s.vx * 6; s.y += s.vy * 6;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const hue = 18 + s.life * 28;
      g.strokeStyle = `hsla(${hue}, 100%, ${50 + s.life * 30}%, ${s.life})`;
      g.lineWidth = s.size;
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
      g.stroke();
    }
    if (sparks.length) requestAnimationFrame(tick);
    else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  }
}
