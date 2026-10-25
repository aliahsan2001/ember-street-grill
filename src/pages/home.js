/* Home: the shutter rolls up to reveal the grill. */

import SplitType from 'split-type';
import { MENU, PLATTERS, DAILY, img } from '../data.js';
import { fmt, esc, idle } from '../core/ui.js';
import { LITE, REDUCED } from '../core/env.js';
import { gsap, lockScroll } from '../core/motion.js';
import { status } from '../core/hours.js';
import { dishCard } from '../cart/dish.js';

const SEEN = 'ember-shutter-open';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function mount(root, ctx) {
  const st = status();
  const cleanups = [];
  renderContent(root, st, cleanups);

  // the grill loads after the text is on screen, so nobody stares at a blank hero
  const wrap = root.querySelector('[data-grill-wrap]');
  let grill = null;
  if (!LITE) {
    idle().then(async () => {
      if (!root.isConnected) return;
      try {
        const { mountGrill } = await import('../three/grill.js');
        if (!root.isConnected) return;
        grill = mountGrill(root.querySelector('[data-grill]'));
        grill.setIntro(shutterDone ? 1 : 0);
      } catch (err) {
        console.warn('Grill unavailable, showing the still', err);
        wrap.classList.add('no-webgl');
      }
    });
  }

  // HUD: live Karachi clock and a coal temperature that drifts
  const clock = root.querySelector('[data-clock]');
  const temp = root.querySelector('[data-temp]');
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(new Date());
    temp.textContent = 630 + Math.round(Math.random() * 30);
  };
  tick();
  const hudTimer = setInterval(tick, 2500);
  cleanups.push(() => clearInterval(hudTimer));

  /* ---------- shutter ---------- */
  const shutter = root.querySelector('[data-shutter]');
  let shutterDone = false;
  const seen = (() => { try { return sessionStorage.getItem(SEEN); } catch { return null; } })();

  const finish = () => {
    shutterDone = true;
    shutter.remove();
    lockScroll(false);
    grill?.setIntro(1);
    heroIntro(root, ctx);
  };

  const posterMode = import.meta.env.DEV && new URLSearchParams(location.search).has('poster');
  if (posterMode) document.documentElement.classList.add('poster-mode');
  if (seen || REDUCED || posterMode) {
    finish();
  } else {
    lockScroll(true);
    gsap.from(shutter.querySelectorAll('.shutter-sign > *, .shutter-gate > *'), { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, delay: 0.15 });

    const open = () => {
      if (shutter.classList.contains('is-opening')) return;
      shutter.classList.add('is-opening');
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* ignore */ }
      const curtain = shutter.querySelector('[data-curtain]');
      const intro = { v: 0 };
      const tl = gsap.timeline({ onComplete: finish });
      // if animation frames stall, jump to the end so the shutter can't stay shut
      setTimeout(() => { if (!shutterDone) tl.progress(1); }, 3000);
      tl
        // rattle as the lock gives, then the roll up
        .to(curtain, { y: -10, duration: 0.06, repeat: 5, yoyo: true, ease: 'none' })
        .to(curtain, { yPercent: -100, duration: 1.25, ease: 'power3.inOut' })
        .to(curtain, { '--ridge-shift': '120px', duration: 1.25, ease: 'power3.inOut' }, '<')
        .to(intro, { v: 1, duration: 1.4, ease: 'power2.out', onUpdate: () => grill?.setIntro(intro.v) }, '<0.2')
        .to(shutter.querySelector('.shutter-housing'), { yPercent: -110, duration: 0.45, ease: 'power2.in' }, '-=0.35');
    };

    shutter.querySelector('[data-open-shutter]').addEventListener('click', open);

    // swipe up, scroll down or a key press also lift it
    let startY = null;
    shutter.addEventListener('pointerdown', (e) => { startY = e.clientY; });
    shutter.addEventListener('pointermove', (e) => { if (startY !== null && startY - e.clientY > 60) open(); });
    shutter.addEventListener('pointerup', () => { startY = null; });
    shutter.addEventListener('wheel', (e) => { if (e.deltaY > 10) open(); }, { passive: true });
    const onKey = (e) => { if (['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.target.closest('button')) open(); };
    addEventListener('keydown', onKey);
    cleanups.push(() => removeEventListener('keydown', onKey));
  }

  cleanups.push(() => { grill?.dispose(); lockScroll(false); });
  return () => cleanups.forEach((fn) => fn());
}

function heroIntro(root, ctx) {
  if (REDUCED) return;
  ctx.add(() => {
    const h1 = root.querySelector('[data-split]');
    const split = new SplitType(h1, { types: 'lines, chars', lineClass: 'split-line' });
    gsap.from(split.chars, { yPercent: 110, rotation: 8, opacity: 0, duration: 0.9, stagger: 0.022, ease: 'power4.out' });
    gsap.from(root.querySelectorAll('[data-hero-fade]'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.1, delay: 0.35 });
    gsap.from(root.querySelectorAll('.hud'), { opacity: 0, duration: 1.2, delay: 0.6 });
  });
}

function renderContent(root, st, cleanups) {
  /* today's special with a live countdown */
  const d = DAILY[st.day];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  root.querySelector('[data-daily]').innerHTML = `
    <article class="daily" data-reveal>
      <div class="daily-media"><img src="${img(d.img, 1000)}" alt="${esc(d.item)}" loading="lazy" decoding="async"></div>
      <div class="daily-body">
        <p class="daily-day"><span class="live">Today</span>${DAY_NAMES[st.day]} special</p>
        <h3>${esc(d.title)}</h3>
        <p class="daily-item">${esc(d.item)} · ${esc(d.note)}</p>
        <div class="daily-price"><strong>${fmt(d.price)}</strong><s>${fmt(d.was)}</s><span class="save">Save ${fmt(d.was - d.price)}</span></div>
        <p class="countdown-label">${st.open ? 'Deal ends when the kitchen closes in' : `Kitchen fires up at ${st.opensAt}. Starts in`}</p>
        <div class="countdown" aria-hidden="true"><div><b data-h>00</b><span>hrs</span></div><div><b data-m>00</b><span>min</span></div><div><b data-s>00</b><span>sec</span></div></div>
        <div class="hero-ctas">
          <button type="button" class="btn btn-primary" data-add-daily="${st.day}">Drop in tray <svg aria-hidden="true"><use href="#i-tray"/></svg></button>
          <a class="btn btn-ghost" href="/deals#week">This week's specials</a>
        </div>
        <div class="week-strip" aria-label="Specials this week">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<span class="${i === st.day ? 'is-today' : ''}" title="${esc(DAILY[i].title)}">${days[i]}</span>`).join('')}</div>
      </div>
    </article>`;
  const end = Date.now() + (st.open ? st.closesIn : st.opensIn) * 60000 - new Date().getSeconds() * 1000;
  const [h, m, s] = ['[data-h]', '[data-m]', '[data-s]'].map((q) => root.querySelector(q));
  const pad = (n) => String(n).padStart(2, '0');
  const cd = () => {
    const left = Math.max(0, end - Date.now());
    h.textContent = pad(Math.floor(left / 3600000));
    m.textContent = pad(Math.floor(left / 60000) % 60);
    s.textContent = pad(Math.floor(left / 1000) % 60);
  };
  cd();
  const timer = setInterval(cd, 1000);
  cleanups.push(() => clearInterval(timer));

  /* three platters as a teaser for the deals table */
  root.querySelector('[data-platters]').innerHTML = ['family-feast', 'grill-tower', 'date-duo'].map((id) => {
    const p = PLATTERS.find((x) => x.id === id);
    return `
      <article class="platter-card" data-reveal data-tilt="5">
        <img src="${img(p.img, 640)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
        <span class="platter-badge">${esc(p.tag)}</span>
        <div class="platter-card-body">
          <p class="platter-serves">${esc(p.serves)}</p>
          <h3>${esc(p.name)}</h3>
          <p class="platter-price"><strong>${fmt(p.price)}</strong><s>${fmt(p.was)}</s></p>
          <button type="button" class="btn btn-primary btn-sm" data-add-platter="${p.id}">Drop in tray</button>
        </div>
      </article>`;
  }).join('');

  root.querySelector('[data-signature]').innerHTML = ['seekh', 'ck-karahi', 'malai', 'tikka-roll'].map((id) => dishCard(MENU.find((x) => x.id === id))).join('');

  /* phone follows the pointer around its resting angle */
  const stage = root.querySelector('[data-phone-stage]');
  const phone = root.querySelector('[data-phone]');
  if (!REDUCED && matchMedia('(pointer: fine)').matches) {
    const ry = gsap.quickTo(phone, 'rotationY', { duration: 0.6 });
    const rx = gsap.quickTo(phone, 'rotationX', { duration: 0.6 });
    gsap.set(phone, { rotationY: -16, rotationX: 6, transformPerspective: 1600 });
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      ry(-16 + ((e.clientX - r.left) / r.width - 0.5) * 30);
      rx(6 - ((e.clientY - r.top) / r.height - 0.5) * 16);
    });
    stage.addEventListener('pointerleave', () => { ry(-16); rx(6); });
  }
}
