/* Cart state (saved in localStorage) and the WhatsApp order message. */

import { CONFIG } from '../data.js';
import { fmt, store } from '../core/ui.js';

const KEY = 'ember-cart-v2';
let items = store.get(KEY, []);
const listeners = new Set();

const keyOf = (id, size) => id + '|' + (size || '');

function commit(change) {
  store.set(KEY, items);
  listeners.forEach((fn) => fn(items, change));
}

export const Cart = {
  get items() { return items; },
  get count() { return items.reduce((n, i) => n + i.qty, 0); },
  get subtotal() { return items.reduce((n, i) => n + i.price * i.qty, 0); },
  qtyOf(id, size) { return items.find((i) => i.key === keyOf(id, size))?.qty || 0; },

  // entry: { id, name, size, price, img, kind } ; kind: 'plate' | 'cup' | 'platter'
  add(entry, origin) {
    const key = keyOf(entry.id, entry.size);
    const found = items.find((i) => i.key === key);
    if (found) found.qty += 1;
    else items.push({ key, id: entry.id, name: entry.name, size: entry.size || '', price: entry.price, img: entry.img || '', kind: entry.kind || 'plate', qty: 1 });
    commit({ type: 'add', key, origin });
  },
  setQty(key, qty) {
    const found = items.find((i) => i.key === key);
    if (!found) return;
    const before = found.qty;
    if (qty <= 0) items = items.filter((i) => i.key !== key);
    else found.qty = Math.min(qty, 30);
    commit({ type: qty > before ? 'add' : 'remove', key });
  },
  change(id, size, delta) {
    const key = keyOf(id, size);
    const found = items.find((i) => i.key === key);
    if (found) this.setQty(key, found.qty + delta);
  },
  clear() { items = []; commit({ type: 'clear' }); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

// keep tabs in sync
addEventListener('storage', (e) => {
  if (e.key === KEY) { items = store.get(KEY, []); commit({ type: 'sync' }); }
});

export function totals(type) {
  const subtotal = Cart.subtotal;
  const delivery = type === 'delivery' && subtotal > 0 && subtotal < CONFIG.freeDeliveryOver ? CONFIG.deliveryFee : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

export const orderId = () => 'ESG-' + Date.now().toString(36).slice(-5).toUpperCase();

export function buildMessage(d, id) {
  const t = totals(d.type);
  const lines = [`*New order · ${CONFIG.name}*`, `Order ${id}`, '', `*${d.type === 'delivery' ? 'Delivery' : 'Pickup'}*`, `Name: ${d.name || '—'}`, `Phone: ${d.phone || '—'}`];
  if (d.type === 'delivery') lines.push(`Address: ${d.address || '—'}`);
  lines.push('', '*Items*');
  items.forEach((i) => lines.push(`${i.qty} × ${i.name}${i.size ? ' (' + i.size + ')' : ''} — ${fmt(i.price * i.qty)}`));
  lines.push('', `Subtotal: ${fmt(t.subtotal)}`);
  if (d.type === 'delivery') lines.push(`Delivery: ${t.delivery ? fmt(t.delivery) : 'Free'}`);
  lines.push(`*Total: ${fmt(t.total)}*`, `Payment: ${d.payment}`);
  if (d.notes && d.notes.trim()) lines.push('', `Notes: ${d.notes.trim()}`);
  return lines.join('\n');
}
