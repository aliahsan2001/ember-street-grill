/* The tray dock (persistent across pages) and the checkout drawer.
   Full mode: a live 3D steel tray. Lite mode: the same dock with an animated list. */

import { CONFIG, img } from '../data.js';
import { Cart, totals, orderId, buildMessage } from './store.js';
import { fmt, esc, toast, store, waLink, idle } from '../core/ui.js';
import { LITE, REDUCED } from '../core/env.js';
import { gsap, lockScroll } from '../core/motion.js';

const DETAILS_KEY = 'ember-details-v2';
let dock, tray3d, drawer, totalTween;
const shown = { value: 0 };

/* ---------- dock ---------- */
function buildDock() {
  dock = document.createElement('aside');
  dock.className = 'tray-dock';
  dock.setAttribute('aria-label', 'Your tray');
  dock.innerHTML = `
    <div class="tray-stage">
      ${LITE ? '<ul class="tray-list" data-tray-list></ul>' : '<canvas data-tray-canvas aria-hidden="true"></canvas>'}
      <span class="tray-hud" aria-hidden="true">TRAY · <span data-tray-pieces>0</span> PCS</span>
    </div>
    <div class="tray-bar">
      <div class="tray-sum">
        <p class="tray-kicker">Your tray · <span data-tray-count>0 items</span></p>
        <p class="tray-total" data-tray-total aria-live="polite">Rs 0</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" data-cart-open>Review &amp; send</button>
    </div>
    <button type="button" class="tray-min" data-tray-min aria-label="Minimise tray"><span></span></button>`;
  document.body.appendChild(dock);
  dock.querySelector('[data-tray-min]').addEventListener('click', () => setDock(dock.classList.contains('is-min') ? 'open' : 'min'));
  dock.querySelector('.tray-bar').addEventListener('click', (e) => {
    if (dock.classList.contains('is-min') && !e.target.closest('button')) setDock('open');
  });
}

function setDock(state) {
  dock.classList.toggle('is-visible', state !== 'hidden');
  dock.classList.toggle('is-min', state === 'min');
  dock.querySelector('[data-tray-min]').setAttribute('aria-label', state === 'min' ? 'Show tray' : 'Minimise tray');
  if (state === 'open') requestAnimationFrame(() => tray3d?.resize());
}

async function ensure3D() {
  if (LITE || tray3d) return tray3d;
  const { Tray3D } = await import('./tray3d.js');
  tray3d = new Tray3D(dock.querySelector('[data-tray-canvas]'), img);
  return tray3d;
}

function paintTotals() {
  const n = Cart.count;
  dock.querySelector('[data-tray-count]').textContent = `${n} item${n === 1 ? '' : 's'}`;
  dock.querySelector('[data-tray-pieces]').textContent = String(n).padStart(2, '0');
  document.querySelectorAll('[data-cart-count]').forEach((b) => {
    b.textContent = n;
    b.hidden = n === 0;
  });
  const end = Cart.subtotal;
  totalTween?.kill();
  const out = dock.querySelector('[data-tray-total]');
  if (REDUCED) { out.textContent = fmt(end); shown.value = end; return; }
  totalTween = gsap.to(shown, { value: end, duration: 0.8, ease: 'power2.out', onUpdate: () => (out.textContent = fmt(shown.value)) });
}

function paintLiteList() {
  const ul = dock.querySelector('[data-tray-list]');
  if (!ul) return;
  const prev = new Set([...ul.children].map((li) => li.dataset.key));
  ul.innerHTML = Cart.items.slice().reverse().map((i) => `
    <li data-key="${esc(i.key)}"><img src="${img(i.img, 640)}" alt="" width="40" height="40"><span>${esc(i.name)}${i.size ? ' · ' + esc(i.size) : ''}</span><b>×${i.qty}</b></li>`).join('');
  [...ul.children].forEach((li) => {
    if (!prev.has(li.dataset.key) && !REDUCED) gsap.from(li, { y: -24, opacity: 0, duration: 0.45, ease: 'back.out(1.6)' });
  });
}

function bumpBadge() {
  document.querySelectorAll('[data-cart-count]').forEach((b) => {
    b.classList.remove('bump');
    void b.offsetWidth;
    b.classList.add('bump');
  });
}

async function onCartChange(items, change) {
  paintTotals();
  if (!items.length) { setDock('hidden'); tray3d?.sync([]); paintLiteList(); return; }
  if (change.type === 'add') {
    setDock('open');
    bumpBadge();
    const item = items.find((i) => i.key === change.key);
    if (change.origin) toast(`<strong>${esc(item.name)}</strong> dropped in your tray`, { label: 'Review', fn: () => Drawer.open() });
  } else if (!dock.classList.contains('is-visible')) setDock('min');
  paintLiteList();
  (await ensure3D())?.sync(items);
  if (drawer?.isOpen) drawer.render();
}

/* ---------- drawer ---------- */
const Drawer = (() => {
  let root, panel, view = 'cart', lastFocus, fresh = false, currentId = orderId();
  const details = Object.assign({ type: 'delivery', name: '', phone: '', address: '', notes: '', payment: 'Cash on delivery' }, store.get(DETAILS_KEY, {}));

  function build() {
    root = document.createElement('div');
    root.className = 'drawer-root';
    root.innerHTML = `
      <div class="drawer-backdrop" data-close></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1" data-lenis-prevent>
        <header class="drawer-head">
          <button type="button" class="icon-btn" data-back aria-label="Back to your tray" hidden><svg aria-hidden="true"><use href="#i-back"/></svg></button>
          <div class="drawer-titles">
            <p class="drawer-kicker" data-kicker>Step 1 of 2</p>
            <h2 id="drawer-title" data-title>Your tray</h2>
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Close"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
        </header>
        <div class="drawer-progress"><span data-progress></span></div>
        <div class="drawer-body" data-body></div>
        <footer class="drawer-foot" data-foot></footer>
      </aside>`;
    document.body.appendChild(root);
    panel = root.querySelector('.drawer');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('keydown', onKey);
  }

  function open(start = 'cart') {
    if (!root) build();
    lastFocus = document.activeElement;
    document.querySelector('.toast')?.classList.remove('is-visible');
    view = start;
    fresh = true;
    render();
    root.classList.add('is-open');
    lockScroll(true);
    setTimeout(() => panel.focus(), 60);
  }

  function close() {
    if (!root) return;
    root.classList.remove('is-open');
    lockScroll(false);
    lastFocus?.focus?.();
  }

  function setView(v) { view = v; render(); root.querySelector('[data-body]').scrollTop = 0; }

  function render() {
    const $ = (s) => root.querySelector(s);
    const body = $('[data-body]'), foot = $('[data-foot]');
    const items = Cart.items;
    if (view === 'details' && !items.length) view = 'cart';
    $('[data-back]').hidden = view !== 'details';
    if (view === 'cart') {
      $('[data-title]').textContent = 'Your tray';
      $('[data-kicker]').textContent = items.length ? 'Step 1 of 2 · Review' : 'Nothing here yet';
      $('[data-progress]').style.width = items.length ? '50%' : '0%';
      body.innerHTML = items.length ? cartList() : emptyState();
      foot.innerHTML = items.length ? cartFoot() : '';
      foot.hidden = !items.length;
      fresh = false;
    } else if (view === 'details') {
      $('[data-title]').textContent = 'Delivery details';
      $('[data-kicker]').textContent = 'Step 2 of 2 · Send on WhatsApp';
      $('[data-progress]').style.width = '100%';
      body.innerHTML = detailsForm();
      foot.innerHTML = detailsFoot();
      foot.hidden = false;
      updatePreview();
    } else {
      $('[data-title]').textContent = 'Order on its way';
      $('[data-kicker]').textContent = 'Almost there';
      $('[data-progress]').style.width = '100%';
      body.innerHTML = sentState();
      foot.innerHTML = '';
      foot.hidden = true;
    }
  }

  const emptyState = () => `
    <div class="drawer-empty">
      <div class="empty-grill" aria-hidden="true"><span></span><span></span><span></span></div>
      <h3>The grill's hot. Your tray's empty.</h3>
      <p>Add a few dishes from the menu and we'll turn them into a ready-to-send WhatsApp order.</p>
      <a class="btn btn-primary" href="/menu" data-close>Browse the menu</a>
    </div>`;

  const cartList = () => `<ul class="cart-list${fresh ? '' : ' is-static'}">${Cart.items.map((i) => `
      <li class="cart-line">
        <img src="${img(i.img, 640)}" alt="" width="64" height="64">
        <div>
          <p class="cart-line-name">${esc(i.name)}</p>
          <p class="cart-line-meta">${i.size ? esc(i.size) + ' · ' : ''}${fmt(i.price)}</p>
          <div class="stepper stepper-sm" role="group" aria-label="Quantity for ${esc(i.name)}">
            <button type="button" data-qty="-1" data-key="${esc(i.key)}" aria-label="Remove one">−</button>
            <span>${i.qty}</span>
            <button type="button" data-qty="1" data-key="${esc(i.key)}" aria-label="Add one">+</button>
          </div>
        </div>
        <div class="cart-line-end">
          <p class="cart-line-total">${fmt(i.price * i.qty)}</p>
          <button type="button" class="link-btn" data-remove="${esc(i.key)}">Remove</button>
        </div>
      </li>`).join('')}</ul>
    <a class="add-more" href="/menu" data-close>+ Add more from the menu</a>`;

  function summaryRows(type) {
    const t = totals(type);
    const toFree = CONFIG.freeDeliveryOver - t.subtotal;
    return `
      <div class="summary-row"><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>
      ${type === 'delivery' ? `<div class="summary-row"><span>Delivery</span><span>${t.delivery ? fmt(t.delivery) : '<b class="free">Free</b>'}</span></div>` : ''}
      ${type === 'delivery' && toFree > 0 ? `<p class="summary-hint">Add ${fmt(toFree)} more for free delivery</p>` : ''}
      <div class="summary-row summary-total"><span>Total</span><span>${fmt(t.total)}</span></div>`;
  }

  const cartFoot = () => `
    ${summaryRows(details.type)}
    ${details.type === 'delivery' && Cart.subtotal < CONFIG.minDeliveryOrder ? `<p class="summary-warn">Minimum for delivery is ${fmt(CONFIG.minDeliveryOrder)}. You can still order for pickup.</p>` : ''}
    <button type="button" class="btn btn-primary btn-block" data-goto="details">Continue to details <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>`;

  function detailsForm() {
    const d = details;
    return `
      <form class="order-form" data-order-form novalidate>
        <fieldset class="seg" aria-label="Order type">
          <label><input type="radio" name="type" value="delivery" ${d.type === 'delivery' ? 'checked' : ''}><span>Delivery</span></label>
          <label><input type="radio" name="type" value="pickup" ${d.type === 'pickup' ? 'checked' : ''}><span>Pickup</span></label>
        </fieldset>
        <div class="field">
          <label for="f-name">Your name</label>
          <input id="f-name" name="name" autocomplete="name" value="${esc(d.name)}" placeholder="e.g. Sana Ahmed">
          <p class="field-error" data-error="name"></p>
        </div>
        <div class="field">
          <label for="f-phone">Phone number</label>
          <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(d.phone)}" placeholder="03XX XXXXXXX">
          <p class="field-error" data-error="phone"></p>
        </div>
        <div class="field" data-address-field ${d.type === 'pickup' ? 'hidden' : ''}>
          <label for="f-address">Delivery address</label>
          <textarea id="f-address" name="address" rows="2" autocomplete="street-address" placeholder="House, street, block, area">${esc(d.address)}</textarea>
          <p class="field-error" data-error="address"></p>
        </div>
        <div class="field">
          <label for="f-payment">Payment</label>
          <select id="f-payment" name="payment">${['Cash on delivery', 'Bank transfer', 'Card on pickup'].map((p) => `<option ${p === d.payment ? 'selected' : ''}>${p}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="f-notes">Notes for the kitchen <span class="optional">optional</span></label>
          <input id="f-notes" name="notes" value="${esc(d.notes)}" placeholder="Extra spicy, no onions, ring the bell twice…">
        </div>
      </form>
      <div class="wa-preview" aria-label="Preview of your WhatsApp message">
        <p class="wa-preview-label"><svg aria-hidden="true"><use href="#i-wa"/></svg>Message preview</p>
        <div class="wa-chat"><div class="wa-bubble"><pre data-wa-preview></pre><span class="wa-time">now ✓✓</span></div></div>
      </div>`;
  }

  const detailsFoot = () => `
    <div data-summary>${summaryRows(details.type)}</div>
    <button type="button" class="btn btn-wa btn-block" data-send><svg aria-hidden="true"><use href="#i-wa"/></svg>Send on WhatsApp</button>
    <p class="foot-note">WhatsApp opens with your order typed out. Just tap send.</p>`;

  const sentState = () => `
    <div class="sent">
      <div class="sent-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h3>Your order is waiting in WhatsApp</h3>
      <p>Order <strong>${esc(currentId)}</strong> is written out for you. Tap <b>send</b> in WhatsApp and the kitchen will confirm within a few minutes.</p>
      <p class="sent-sub">Didn't open? <button type="button" class="link-btn link-wa" data-resend>Try again</button></p>
      <div class="sent-actions">
        <button type="button" class="btn btn-primary" data-new-order>Start a new order</button>
        <button type="button" class="btn btn-ghost" data-keep>Keep this order</button>
      </div>
    </div>`;

  function readForm() {
    const form = root.querySelector('[data-order-form]');
    if (!form) return;
    const fd = new FormData(form);
    Object.assign(details, { type: fd.get('type'), name: fd.get('name') || '', phone: fd.get('phone') || '', address: fd.get('address') || '', notes: fd.get('notes') || '', payment: fd.get('payment') });
    store.set(DETAILS_KEY, details);
  }

  function updatePreview() {
    const pre = root.querySelector('[data-wa-preview]');
    if (pre) pre.innerHTML = esc(buildMessage(details, currentId)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
    const sum = root.querySelector('[data-summary]');
    if (sum) sum.innerHTML = summaryRows(details.type);
  }

  function validate() {
    const errors = {};
    if (details.name.trim().length < 2) errors.name = 'Please add your name.';
    if (!/^(\+92|0092|0)?3\d{9}$/.test(details.phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a mobile number like 0300 1234567.';
    if (details.type === 'delivery' && details.address.trim().length < 8) errors.address = 'Add your full address so the rider can find you.';
    if (details.type === 'delivery' && Cart.subtotal < CONFIG.minDeliveryOrder) errors.address = `Delivery starts at ${fmt(CONFIG.minDeliveryOrder)}. Switch to pickup or add a little more.`;
    root.querySelectorAll('[data-error]').forEach((p) => {
      const msg = errors[p.dataset.error] || '';
      p.textContent = msg;
      p.parentElement.querySelector('input, textarea')?.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
    const first = Object.keys(errors)[0];
    if (first) root.querySelector(`[name="${first}"]`)?.focus();
    return !first;
  }

  function send() {
    readForm();
    if (!validate()) return;
    const url = waLink(buildMessage(details, currentId));
    // the tray slides away with the order, then WhatsApp opens
    if (!REDUCED) gsap.to(dock, { x: '120%', rotation: 8, duration: 0.6, ease: 'power3.in' });
    window.open(url, '_blank', 'noopener');
    setView('sent');
  }

  function onClick(e) {
    const t = e.target.closest('button, a, [data-close]');
    if (!t) return;
    if (t.matches('[data-close]')) return close();
    if (t.matches('[data-back]')) { readForm(); return setView('cart'); }
    if (t.dataset.goto) return setView(t.dataset.goto);
    if (t.dataset.qty) { const it = Cart.items.find((i) => i.key === t.dataset.key); return Cart.setQty(t.dataset.key, (it?.qty || 0) + Number(t.dataset.qty)); }
    if (t.dataset.remove) return Cart.setQty(t.dataset.remove, 0);
    if (t.matches('[data-send]')) return send();
    if (t.matches('[data-resend]')) return window.open(waLink(buildMessage(details, currentId)), '_blank', 'noopener');
    if (t.matches('[data-new-order]')) { currentId = orderId(); gsap.set(dock, { x: 0, rotation: 0 }); Cart.clear(); return close(); }
    if (t.matches('[data-keep]')) { gsap.to(dock, { x: 0, rotation: 0, duration: 0.6, ease: 'power3.out' }); return setView('cart'); }
  }

  function onInput(e) {
    if (!e.target.closest('[data-order-form]')) return;
    readForm();
    root.querySelector('[data-address-field]').hidden = details.type === 'pickup';
    const err = e.target.parentElement.querySelector('.field-error');
    if (err?.textContent) { err.textContent = ''; e.target.setAttribute('aria-invalid', 'false'); }
    updatePreview();
  }

  function onKey(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button:not([hidden]), a[href], input, select, textarea')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  return {
    open, close,
    get isOpen() { return root?.classList.contains('is-open'); },
    render: () => view !== 'sent' && render(),
  };
})();

export function initTray() {
  buildDock();
  Cart.subscribe(onCartChange);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); Drawer.open(); }
  });
  paintTotals();
  if (Cart.count) {
    setDock('min');
    paintLiteList();
    // restore the pile once the page itself has settled
    idle().then(async () => (await ensure3D())?.sync(Cart.items, 90));
  }
}

export { Drawer };
