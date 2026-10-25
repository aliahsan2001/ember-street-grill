/* Page transition: a puff of smoke sweeps across, the page swaps underneath, the smoke clears.
   About one second end to end. Reduced motion gets a plain fade. */

import { gsap } from './motion.js';
import { REDUCED } from './env.js';

let veil;

// Resolve when the timeline ends, or force it to the end if animation frames stall
// (some browsers pause or heavily throttle requestAnimationFrame), so a page change never hangs.
function settle(tl, ms) {
  return Promise.race([
    tl.then(() => {}),
    new Promise((r) => setTimeout(() => { tl.progress(1); r(); }, ms)),
  ]);
}

function build() {
  veil = document.createElement('div');
  veil.className = 'smoke-veil';
  veil.setAttribute('aria-hidden', 'true');
  // a cluster of soft blobs reads as billowing smoke when they move at slightly different speeds
  const blobs = Array.from({ length: 14 }, (_, i) => {
    const s = 38 + Math.random() * 40;
    return `<span style="--s:${s}vmax;--x:${(i % 7) * 15 - 10}%;--y:${Math.floor(i / 7) * 52 - 10 + Math.random() * 20}%;--d:${Math.random()}"></span>`;
  }).join('');
  veil.innerHTML = `<div class="smoke-veil-inner">${blobs}</div><div class="smoke-veil-ember"></div>`;
  document.body.appendChild(veil);
}

export function cover() {
  if (!veil) build();
  const inner = veil.querySelector('.smoke-veil-inner');
  const blobs = veil.querySelectorAll('span');
  veil.classList.add('is-active');
  if (REDUCED) return settle(gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.3 }), 600);
  gsap.set(veil, { opacity: 1 });
  const tl = gsap.timeline();
  tl.fromTo(inner, { xPercent: -130 }, { xPercent: -15, duration: 0.5, ease: 'power2.in' }, 0)
    .fromTo(blobs, { scale: 0.6, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.5, stagger: { each: 0.015, from: 'random' }, ease: 'sine.out' }, 0)
    .fromTo(veil.querySelector('.smoke-veil-ember'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2);
  return settle(tl, 900);
}

export function reveal() {
  const inner = veil.querySelector('.smoke-veil-inner');
  const blobs = veil.querySelectorAll('span');
  const done = () => veil.classList.remove('is-active');
  if (REDUCED) return settle(gsap.to(veil, { opacity: 0, duration: 0.3, onComplete: done }), 600);
  const tl = gsap.timeline({ onComplete: done });
  tl.to(inner, { xPercent: 110, duration: 0.6, ease: 'power2.out' }, 0)
    .to(blobs, { scale: 1.4, opacity: 0, duration: 0.6, stagger: { each: 0.01, from: 'random' }, ease: 'power1.out' }, 0)
    .to(veil.querySelector('.smoke-veil-ember'), { opacity: 0, duration: 0.3 }, 0)
    .set(veil, { opacity: 0 });
  return settle(tl, 1000);
}
