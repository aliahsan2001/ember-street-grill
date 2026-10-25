/* Menu: categories ride a curved ribbon that drifts sideways as you scroll (and can be
   dragged). Each category is its own section with a smoke-formed heading. */

import SplitType from 'split-type';
import { MENU, CATEGORIES } from '../data.js';
import { esc } from '../core/ui.js';
import { REDUCED } from '../core/env.js';
import { gsap, ScrollTrigger, scrollToEl } from '../core/motion.js';
import { dishCard } from '../cart/dish.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const CATS = CATEGORIES.filter((c) => c.id !== 'all');

export async function mount(root, ctx) {
  const cleanups = [];

  root.querySelector('[data-menu]').innerHTML = CATS.map((c) => {
    const items = MENU.filter((m) => m.cat === c.id);
    return `
      <section class="menu-group" id="cat-${c.id}" data-group="${c.id}" aria-labelledby="g-${c.id}">
        <div class="menu-group-head">
          <h2 id="g-${c.id}" class="display" data-smoke>${esc(c.label)}</h2>
          <span class="hud" data-group-count>${items.length} dishes</span>
        </div>
        <div class="dish-grid">${items.map(dishCard).join('')}</div>
      </section>`;
  }).join('');

  if (!REDUCED) ctx.add(() => {
    const split = new SplitType(root.querySelector('[data-split]'), { types: 'lines, chars', lineClass: 'split-line' });
    gsap.from(split.chars, { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.02, ease: 'power4.out', delay: 0.1 });
  });

  cleanups.push(ribbon(root, ctx));
  cleanups.push(search(root));
  return () => cleanups.forEach((fn) => fn?.());
}

/* ---------- the curved ribbon ---------- */
function ribbon(root, ctx) {
  const wrap = root.querySelector('[data-ribbon-wrap]');
  const svg = root.querySelector('[data-ribbon]');
  let path, labels = [], loop = 0, shift = 0, drag = 0, active = CATS[0].id, raf;

  function build() {
    const w = wrap.clientWidth, h = 110;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = `M ${-60} 62 C ${w * 0.2} 6, ${w * 0.42} 104, ${w * 0.62} 54 S ${w * 0.9} 14, ${w + 60} 50`;
    svg.innerHTML = `
      <defs><path id="rib-path" d="${d}"/></defs>
      <use href="#rib-path" class="rib-shadow"/>
      <use href="#rib-path" class="rib-band"/>
      <use href="#rib-path" class="rib-trim rib-trim-a" transform="translate(0,-25)"/>
      <use href="#rib-path" class="rib-trim rib-trim-b" transform="translate(0,25)"/>
      <use href="#rib-path" class="rib-stitch" transform="translate(0,-19)"/>
      <use href="#rib-path" class="rib-stitch" transform="translate(0,19)"/>
      <g data-labels></g>`;
    path = svg.querySelector('#rib-path');
    const g = svg.querySelector('[data-labels]');
    const total = path.getTotalLength();

    // measure one run of labels, then repeat it enough times to cover the band
    const run = [];
    CATS.forEach((c) => {
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('class', 'rib-label');
      t.setAttribute('dy', '0.35em');
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-label', `Jump to ${c.label}`);
      t.dataset.cat = c.id;
      const tp = document.createElementNS(SVGNS, 'textPath');
      tp.setAttribute('href', '#rib-path');
      tp.textContent = c.label;
      t.appendChild(tp);
      g.appendChild(t);
      run.push({ el: t, tp, width: t.getComputedTextLength() });
      const star = document.createElementNS(SVGNS, 'text');
      star.setAttribute('class', 'rib-star');
      star.setAttribute('dy', '0.35em');
      star.setAttribute('aria-hidden', 'true');
      const stp = document.createElementNS(SVGNS, 'textPath');
      stp.setAttribute('href', '#rib-path');
      stp.textContent = '✦';
      star.appendChild(stp);
      g.appendChild(star);
      run.push({ el: star, tp: stp, width: 18, star: true });
    });
    const gap = 34;
    loop = run.reduce((n, r) => n + r.width + gap, 0);
    labels = [];
    const copies = Math.ceil(total / loop) + 1;
    for (let k = 0; k < copies; k++) {
      let at = k * loop;
      run.forEach((r, i) => {
        const el = k === 0 ? r.el : r.el.cloneNode(true);
        if (k > 0) {
          g.appendChild(el);
          if (!r.star) el.setAttribute('tabindex', '-1'); // only the first run is in the tab order
        }
        labels.push({ el, tp: el.firstChild, base: at, cat: el.dataset.cat });
        at += r.width + gap;
        void i;
      });
    }
    paintActive();
    place();
  }

  function place() {
    const s = ((shift + drag) % loop + loop) % loop;
    for (const l of labels) l.tp.setAttribute('startOffset', l.base - s);
  }

  function paintActive() {
    labels.forEach((l) => l.el.classList.toggle('is-active', l.cat === active));
  }

  function jump(cat) {
    const sec = root.querySelector(`#cat-${cat}`);
    if (sec) scrollToEl(sec, -190);
  }

  svg.addEventListener('click', (e) => {
    const t = e.target.closest('.rib-label');
    if (t && !moved) jump(t.dataset.cat);
  });
  svg.addEventListener('keydown', (e) => {
    const t = e.target.closest('.rib-label');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jump(t.dataset.cat); }
  });

  // drag sideways
  let startX = null, startDrag = 0, moved = false;
  svg.addEventListener('pointerdown', (e) => { startX = e.clientX; startDrag = drag; moved = false; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    drag = startDrag - dx;
    place();
  });
  const end = () => { startX = null; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  // drift with the page
  const onScroll = () => {
    shift = scrollY * 0.45;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(place);
  };
  if (!REDUCED) addEventListener('scroll', onScroll, { passive: true });

  ctx.add(() => {
    CATS.forEach((c) => ScrollTrigger.create({
      trigger: root.querySelector(`#cat-${c.id}`),
      start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) { active = c.id; paintActive(); } },
    }));
  });

  const ro = new ResizeObserver(() => build());
  ro.observe(wrap);
  document.fonts.ready.then(() => wrap.isConnected && build());

  return () => { ro.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
}

/* ---------- search ---------- */
function search(root) {
  const input = root.querySelector('[data-search]');
  const empty = root.querySelector('[data-empty]');
  const count = root.querySelector('[data-results-count]');
  let t;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll('[data-group]').forEach((group) => {
      let visible = 0;
      group.querySelectorAll('[data-dish]').forEach((card) => {
        const item = MENU.find((m) => m.id === card.dataset.dish);
        const match = !q || `${item.name} ${item.desc} ${item.cat}`.toLowerCase().includes(q);
        card.hidden = !match;
        if (match) visible++;
      });
      group.hidden = visible === 0;
      group.querySelector('[data-group-count]').textContent = `${visible} dish${visible === 1 ? '' : 'es'}`;
      shown += visible;
    });
    empty.hidden = shown > 0;
    count.textContent = `${shown} dish${shown === 1 ? '' : 'es'}`;
    ScrollTrigger.refresh();
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 140); });
  root.querySelector('[data-clear-search]').addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
  return () => clearTimeout(t);
}
