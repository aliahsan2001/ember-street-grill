/* Deals: platters arrive on a lazy Susan. Whatever lands in front is described in the panel,
   and its price ticks up like a counter. */

import SplitType from 'split-type';
import { PLATTERS, DAILY, CONFIG, img } from '../data.js';
import { fmt, esc, waLink, idle, splitChars } from '../core/ui.js';
import { LITE, REDUCED } from '../core/env.js';
import { gsap } from '../core/motion.js';
import { status } from '../core/hours.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function mount(root, ctx) {
  const cleanups = [];
  const st = status();
  const panel = root.querySelector('[data-panel]');
  const $ = (s) => panel.querySelector(s);
  const priceShown = { v: 0 };
  let current = 0, priceTween;

  function land(i) {
    current = i;
    const p = PLATTERS[i];
    root.querySelector('[data-index]').textContent = i + 1;
    $('[data-tag]').textContent = p.tag;
    $('[data-serves]').textContent = p.serves;
    $('[data-name]').textContent = p.name;
    $('[data-items]').innerHTML = p.items.map((x) => `<li><svg aria-hidden="true"><use href="#i-check"/></svg>${esc(x)}</li>`).join('');
    $('[data-was]').textContent = fmt(p.was);
    $('[data-save]').textContent = `Save ${fmt(p.was - p.price)}`;
    $('[data-add-current]').dataset.addPlatter = p.id;
    $('[data-add-current]').setAttribute('aria-label', `Drop ${p.name} in your tray`);
    const out = $('[data-price]');
    priceTween?.kill();
    if (REDUCED) { out.textContent = fmt(p.price); return; }
    // the price ticks up as the platter lands
    priceShown.v = 0;
    priceTween = gsap.to(priceShown, { v: p.price, duration: 1.1, ease: 'power3.out', onUpdate: () => (out.textContent = fmt(priceShown.v)) });
    gsap.from(splitChars($('[data-name]'), p.name), { yPercent: 80, opacity: 0, duration: 0.5, stagger: 0.02, ease: 'power3.out' });
    gsap.from(panel.querySelectorAll('.tick-list li'), { x: -14, opacity: 0, duration: 0.4, stagger: 0.05, delay: 0.1 });
  }

  /* the table itself (or a simple still for lighter devices) */
  const stage = root.querySelector('[data-susan-stage]');
  let susan = null;
  const lite = () => {
    stage.classList.add('is-lite');
    root.querySelector('[data-susan-lite]').hidden = false;
    root.querySelector('[data-drag-hint]').firstChild.textContent = 'Platter ';
    const show = (i) => {
      const im = root.querySelector('[data-lite-img]');
      im.src = img(PLATTERS[i].img, 640);
      im.alt = PLATTERS[i].name;
      if (!REDUCED) gsap.fromTo(im, { rotation: -40, scale: 0.85, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 0.6 });
      land(i);
    };
    show(0);
    return {
      next: () => show((current + 1) % PLATTERS.length),
      prev: () => show((current - 1 + PLATTERS.length) % PLATTERS.length),
      dispose() {},
    };
  };

  if (LITE) susan = lite();
  else {
    land(0);
    idle().then(async () => {
      if (!root.isConnected) return;
      try {
        const { mountSusan } = await import('../three/susan.js');
        if (!root.isConnected) return;
        susan = mountSusan(root.querySelector('[data-susan]'), { images: PLATTERS.map((p) => img(p.img, 1000)), onLand: land });
      } catch (err) {
        console.warn('Lazy Susan unavailable', err);
        susan = lite();
      }
    });
  }
  root.querySelector('[data-next]').addEventListener('click', () => susan?.next());
  root.querySelector('[data-prev]').addEventListener('click', () => susan?.prev());
  const onKey = (e) => {
    if (!stage.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (e.key === 'ArrowRight') susan?.next();
    if (e.key === 'ArrowLeft') susan?.prev();
  };
  addEventListener('keydown', onKey);
  cleanups.push(() => { removeEventListener('keydown', onKey); susan?.dispose(); priceTween?.kill(); });

  if (!REDUCED) ctx.add(() => {
    const split = new SplitType(root.querySelector('[data-split]'), { types: 'lines, chars', lineClass: 'split-line' });
    gsap.from(split.chars, { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.025, ease: 'power4.out', delay: 0.1 });
  });

  /* tonight's special */
  const d = DAILY[st.day];
  root.querySelector('[data-daily]').innerHTML = `
    <article class="daily" data-reveal>
      <div class="daily-media"><img src="${img(d.img, 1000)}" alt="${esc(d.item)}" loading="lazy" decoding="async"></div>
      <div class="daily-body">
        <p class="daily-day"><span class="live">Today</span>${DAY_NAMES[st.day]} special</p>
        <h3>${esc(d.title)}</h3>
        <p class="daily-item">${esc(d.item)} · ${esc(d.note)}</p>
        <div class="daily-price"><strong>${fmt(d.price)}</strong><s>${fmt(d.was)}</s><span class="save">Save ${fmt(d.was - d.price)}</span></div>
        <p class="daily-item status-line ${st.open ? 'is-open' : ''}" data-open-wrap><span class="status-dot"></span>${esc(st.label)}</p>
        <div class="hero-ctas"><button type="button" class="btn btn-primary" data-add-daily="${st.day}">Drop in tray <svg aria-hidden="true"><use href="#i-tray"/></svg></button></div>
      </div>
    </article>`;

  /* the week */
  root.querySelector('[data-week]').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((i) => {
    const w = DAILY[i];
    const today = i === st.day;
    return `
      <article class="wk ${today ? 'is-today' : ''}" data-reveal>
        <div class="wk-media"><img src="${img(w.img, 640)}" alt="" loading="lazy" decoding="async"></div>
        <div class="wk-body">
          <p class="wk-day">${DAY_NAMES[i]}${today ? ' <span class="today-tag">Today</span>' : ''}</p>
          <h3>${esc(w.title)}</h3>
          <p class="wk-item">${esc(w.item)}</p>
          <p class="wk-price"><strong>${fmt(w.price)}</strong> <s>${fmt(w.was)}</s></p>
          ${today ? `<button type="button" class="btn btn-primary btn-sm" data-add-daily="${i}">Drop in tray</button>` : `<p class="wk-later">Back on ${DAY_NAMES[i]}</p>`}
        </div>
      </article>`;
  }).join('');

  root.querySelectorAll('[data-wa-bulk]').forEach((a) => {
    a.href = waLink(`Hi ${CONFIG.name}! I'd like a quote for a group order.\n\nDate: \nNumber of guests: \nArea: \nDishes we're thinking of: `);
  });

  return () => cleanups.forEach((fn) => fn());
}
