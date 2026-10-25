/* GSAP + ScrollTrigger + Lenis wired together once for the whole site. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { REDUCED } from './env.js';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

export { gsap, ScrollTrigger };
export let lenis = null;

export function initSmoothScroll() {
  if (REDUCED) return;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const lockScroll = (lock) => {
  document.documentElement.classList.toggle('no-scroll', lock);
  if (lenis) lock ? lenis.stop() : lenis.start();
};

export function scrollToEl(el, offset = -110) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: REDUCED ? 'auto' : 'smooth' });
}

export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

// [data-reveal] fade-ups, scoped to a page so they die with it
export function reveals(root) {
  const items = root.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  if (REDUCED) { gsap.set(items, { opacity: 1 }); items.forEach((el) => el.classList.add('is-in')); return; }
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => batch.forEach((el) => el.classList.add('is-in')) || gsap.fromTo(batch,
      { opacity: 0, y: 36 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, overwrite: true }),
  });
}

// numbers that count up when seen
export function counters(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (REDUCED) { el.textContent = end; return; }
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
}

// cards that tilt toward the pointer
export function tilt(root) {
  if (REDUCED || !matchMedia('(pointer: fine)').matches) return;
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = Number(el.dataset.tilt) || 8;
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      rx(((e.clientY - r.top) / r.height - 0.5) * -max);
      ry(((e.clientX - r.left) / r.width - 0.5) * max);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}
