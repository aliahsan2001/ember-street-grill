/* Small shared helpers: money, escaping, WhatsApp links, toast, storage. */

import { CONFIG } from '../data.js';

export const fmt = (n) => 'Rs ' + Math.round(n).toLocaleString('en-PK');

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function waLink(text) {
  const base = CONFIG.whatsappNumber ? `https://wa.me/${CONFIG.whatsappNumber}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

let toastTimer;
export function toast(html, action) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="toast-flame" aria-hidden="true"></span><span class="toast-text">${html}</span>`;
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { el.classList.remove('is-visible'); action.fn(); });
    el.appendChild(btn);
  }
  requestAnimationFrame(() => el.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 120)));

// Wrap each character in a span for animation. Unlike SplitType this keeps no cache,
// so it is safe for text that changes (SplitType restores the first text it saw).
export function splitChars(el, text = el.textContent) {
  el.setAttribute('aria-label', text);
  el.innerHTML = [...text].map((c) => (c === ' ' ? ' ' : `<span class="ch" aria-hidden="true">${esc(c)}</span>`)).join('');
  return el.querySelectorAll('.ch');
}
