/* About: the story is printed on a crumpled paper menu card. As it scrolls into view each
   line stamps in letter by letter, then the rubber "Est. 2014" stamp thumps down. */

import SplitType from 'split-type';
import { REDUCED } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/motion.js';

// words stay unbroken (so lines wrap normally), letters inside them animate
function stampable(el) {
  const words = el.innerHTML.split(/(<br\s*\/?>|<small>|<\/small>|\s+)/).map((part) => {
    if (!part || /^\s+$/.test(part)) return part ? ' ' : '';
    if (part.startsWith('<')) return part;
    return `<span class="st-word">${[...part].map((c) => `<span class="st-ch">${c}</span>`).join('')}</span>`;
  });
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  el.innerHTML = words.join('');
  [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
  return el.querySelectorAll('.st-ch');
}

export async function mount(root, ctx) {
  if (REDUCED) return () => {};

  ctx.add(() => {
    const split = new SplitType(root.querySelector('[data-split]'), { types: 'lines, chars', lineClass: 'split-line' });
    gsap.from(split.chars, { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.025, ease: 'power4.out', delay: 0.1 });

    const paper = root.querySelector('[data-paper]');
    // the card drops onto the table, slightly askew
    gsap.from(paper, {
      y: 120, rotation: -6, rotationX: 24, transformPerspective: 1200, opacity: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: paper, start: 'top 85%', once: true },
    });
    gsap.to(paper, { rotation: 1.2, ease: 'none', scrollTrigger: { trigger: paper, start: 'top bottom', end: 'bottom top', scrub: true } });

    root.querySelectorAll('[data-stamp]').forEach((el) => {
      const chars = stampable(el);
      gsap.set(chars, { opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        once: true,
        onEnter: () => gsap.fromTo(chars,
          { opacity: 0, scale: 1.9, rotation: () => gsap.utils.random(-14, 14), filter: 'blur(1.5px)' },
          { opacity: 1, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.32, ease: 'back.out(3)', stagger: Math.min(0.018, 1.6 / chars.length) }),
      });
    });

    const rubber = root.querySelector('[data-rubber]');
    gsap.set(rubber, { opacity: 0 });
    ScrollTrigger.create({
      trigger: rubber,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.timeline()
        .fromTo(rubber, { opacity: 0, scale: 2.4, rotation: -30 }, { opacity: 0.9, scale: 1, rotation: -14, duration: 0.35, ease: 'power4.in', delay: 0.6 })
        .to(paper, { y: 3, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.inOut' }),
    });
  });

  return () => {};
}
