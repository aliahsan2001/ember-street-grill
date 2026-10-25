/* Contact: a night street with a glowing map pin over the shop, and opening hours that
   light up like a neon sign. The message form opens WhatsApp with everything filled in. */

import SplitType from 'split-type';
import { CONFIG } from '../data.js';
import { waLink, esc } from '../core/ui.js';
import { REDUCED, FINE } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/motion.js';
import { karachiNow, fmtTime, status } from '../core/hours.js';

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function mount(root, ctx) {
  const cleanups = [];
  buildSkyline(root);
  buildNeonHours(root);
  cleanups.push(contactForm(root));
  root.querySelectorAll('[data-accordion]').forEach((group) => group.addEventListener('toggle', (e) => {
    if (e.target.open) group.querySelectorAll('details[open]').forEach((d) => d !== e.target && (d.open = false));
  }, true));

  if (!REDUCED) ctx.add(() => {
    const split = new SplitType(root.querySelector('[data-split]'), { types: 'lines, chars', lineClass: 'split-line' });
    gsap.from(split.chars, { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.025, ease: 'power4.out', delay: 0.15 });

    // the street scrolls away in layers
    root.querySelectorAll('[data-depth]').forEach((layer) => {
      gsap.to(layer, { yPercent: Number(layer.dataset.depth) * 18, ease: 'none', scrollTrigger: { trigger: root.querySelector('[data-street]'), start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.from(root.querySelector('[data-pin]'), { y: -180, opacity: 0, duration: 1.1, ease: 'bounce.out', delay: 0.5 });

    // neon tubes buzz on one after another
    const board = root.querySelector('[data-neon-board]');
    ScrollTrigger.create({ trigger: board, start: 'top 75%', once: true, onEnter: () => board.classList.add('is-lit') });
  });
  if (REDUCED) root.querySelector('[data-neon-board]').classList.add('is-lit');

  // mouse parallax: nearer layers move more
  if (!REDUCED && FINE) {
    const street = root.querySelector('[data-street]');
    const movers = [...root.querySelectorAll('[data-depth]')].map((l) => ({ x: gsap.quickTo(l, 'x', { duration: 0.9, ease: 'power3.out' }), d: Number(l.dataset.depth) }));
    const onMove = (e) => {
      const r = street.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      movers.forEach((m) => m.x(-nx * 40 * m.d));
    };
    street.addEventListener('pointermove', onMove);
  }

  return () => cleanups.forEach((fn) => fn?.());
}

function buildSkyline(root) {
  // stars
  const stars = root.querySelector('[data-stars]');
  stars.innerHTML = Array.from({ length: 70 }, () => {
    const s = Math.random() * 1.8 + 0.6;
    return `<i style="left:${Math.random() * 100}%;top:${Math.random() * 55}%;width:${s}px;height:${s}px;animation-delay:${(Math.random() * 4).toFixed(2)}s"></i>`;
  }).join('');

  // far buildings with a scatter of lit windows
  const svg = root.querySelector('[data-skyline]');
  const W = 1600, H = 420;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let x = -20, out = '';
  while (x < W) {
    const w = 60 + Math.random() * 110, h = 120 + Math.random() * 230;
    const top = H - h;
    out += `<rect x="${x}" y="${top}" width="${w}" height="${h}" class="bld"/>`;
    if (Math.random() > 0.6) out += `<rect x="${x + w / 2 - 2}" y="${top - 30}" width="3" height="30" class="bld"/>`;
    for (let wy = top + 14; wy < H - 20; wy += 18) {
      for (let wx = x + 10; wx < x + w - 12; wx += 16) {
        const r = Math.random();
        if (r > 0.82) out += `<rect x="${wx}" y="${wy}" width="7" height="9" class="win${r > 0.97 ? ' flick' : ''}"/>`;
      }
    }
    x += w + 4 + Math.random() * 10;
  }
  svg.innerHTML = out;
}

function buildNeonHours(root) {
  const st = status();
  const today = karachiNow().day;
  const order = [1, 2, 3, 4, 5, 6, 0];
  root.querySelector('[data-neon-hours]').innerHTML = order.map((d, i) => {
    const h = CONFIG.hours[d];
    const isToday = d === st.day || (d === today && st.day === today);
    return `<li class="${isToday ? 'is-today' : ''}" style="--i:${i}">
      <span class="n-day">${SHORT[d]}${isToday ? '<em>Tonight</em>' : ''}</span>
      <span class="n-time">${fmtTime(h.open)} – ${fmtTime(h.close)}</span></li>`;
  }).join('');
  const sign = root.querySelector('[data-open-sign]');
  sign.classList.toggle('is-closed', !st.open);
  root.querySelector('[data-open-word]').textContent = st.open ? 'Open' : 'Closed';
  void esc;
}

function contactForm(root) {
  const form = root.querySelector('[data-contact-form]');
  if (!form) return null;
  const topic = form.querySelector('[data-topic]');
  const bookingFields = form.querySelectorAll('[data-booking-only]');
  const syncTopic = () => {
    const show = topic.value === 'Table booking' || topic.value === 'Catering or large order';
    bookingFields.forEach((f) => (f.hidden = !show));
  };
  topic.addEventListener('change', syncTopic);
  syncTopic();

  const setError = (name, msg) => {
    const p = form.querySelector(`[data-error="${name}"]`);
    if (p) p.textContent = msg;
    form.elements[name]?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  form.addEventListener('input', (e) => { if (e.target.name) setError(e.target.name, ''); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const errors = {};
    if ((d.name || '').trim().length < 2) errors.name = 'Please add your name.';
    if (!/^(\+92|0092|0)?3\d{9}$/.test((d.phone || '').replace(/[\s-]/g, ''))) errors.phone = 'Enter a mobile number like 0300 1234567.';
    if (!['Table booking', 'Catering or large order'].includes(d.topic) && (d.message || '').trim().length < 4) errors.message = 'Tell us a little more.';
    ['name', 'phone', 'message'].forEach((k) => setError(k, errors[k] || ''));
    const first = Object.keys(errors)[0];
    if (first) { form.elements[first].focus(); return; }
    const when = d.date ? new Date(d.date).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const lines = [`*${d.topic} · ${CONFIG.name}*`, '', `Name: ${d.name.trim()}`, `Phone: ${d.phone.trim()}`];
    if (!bookingFields[0].hidden) {
      if (d.guests) lines.push(`Guests: ${d.guests}`);
      if (when) lines.push(`When: ${when}`);
    }
    if (d.message?.trim()) lines.push('', d.message.trim());
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    form.querySelector('[data-form-done]').hidden = false;
  });
  return null;
}
