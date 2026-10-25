/* Dish cards: a round cut-out of the dish floats above each card and lifts (with a wisp of
   steam) on hover. Add / size / quantity controls feed the tray. One delegated listener
   serves every page. */

import { MENU, PLATTERS, DAILY, img } from '../data.js';
import { Cart } from './store.js';
import { fmt, esc } from '../core/ui.js';

const TAGS = {
  bestseller: '<span class="tag tag-hot"><svg aria-hidden="true"><use href="#i-flame"/></svg>Bestseller</span>',
  spicy: '<span class="tag tag-spicy"><svg aria-hidden="true"><use href="#i-chili"/></svg>Spicy</span>',
};

const STEAM = `<svg class="steam" viewBox="0 0 60 80" aria-hidden="true">
  <path d="M18 78c-8-12 8-18 0-30s8-18 0-30"/><path d="M30 78c-8-12 8-18 0-30s8-18 0-30"/><path d="M42 78c-8-12 8-18 0-30s8-18 0-30"/></svg>`;

export const kindOf = (item) => (item.cat === 'drinks' ? 'cup' : 'plate');

export function dishCard(item) {
  const sizes = item.sizes;
  const price = sizes ? sizes[0].price : item.price;
  return `
    <article class="dish" data-dish="${item.id}" data-reveal>
      <div class="dish-card" data-tilt="6">
        <div class="dish-float">
          ${STEAM}
          <img class="dish-cut" src="${img(item.img, 640)}" alt="${esc(item.name)}" loading="lazy" decoding="async" width="220" height="220">
          <span class="dish-shadow" aria-hidden="true"></span>
        </div>
        <div class="dish-tags">${(item.tags || []).map((t) => TAGS[t]).join('')}</div>
        <div class="dish-body">
          <h3 class="dish-name">${esc(item.name)}</h3>
          <p class="dish-desc">${esc(item.desc)}</p>
          ${sizes ? `<div class="size-pick" role="radiogroup" aria-label="Size for ${esc(item.name)}">${sizes.map((s, k) => `
            <label><input type="radio" name="size-${item.id}" value="${esc(s.label)}" data-price="${s.price}" ${k === 0 ? 'checked' : ''}><span>${esc(s.label)}</span></label>`).join('')}</div>` : ''}
          <div class="dish-foot">
            <p class="price" data-price-out>${fmt(price)}</p>
            <div class="dish-action" data-action></div>
          </div>
        </div>
      </div>
    </article>`;
}

const selectedSize = (card) => {
  const r = card.querySelector('.size-pick input:checked');
  return r ? { label: r.value, price: Number(r.dataset.price) } : null;
};

function refresh(card) {
  const item = MENU.find((m) => m.id === card.dataset.dish);
  if (!item) return;
  const size = selectedSize(card);
  const qty = Cart.qtyOf(item.id, size?.label);
  const action = card.querySelector('[data-action]');
  const mode = qty > 0 ? 'stepper' : 'add';
  if (action.dataset.mode === mode && mode === 'stepper') { action.querySelector('[data-qty-out]').textContent = qty; return; }
  action.dataset.mode = mode;
  action.innerHTML = qty > 0
    ? `<div class="stepper" role="group" aria-label="Quantity of ${esc(item.name)}">
         <button type="button" data-step="-1" aria-label="Remove one">−</button><span data-qty-out aria-live="polite">${qty}</span><button type="button" data-step="1" aria-label="Add one">+</button></div>`
    : `<button type="button" class="btn btn-add" data-add aria-label="Add ${esc(item.name)} to your tray"><svg aria-hidden="true"><use href="#i-tray"/></svg>Add</button>`;
}

export const refreshDishes = (root = document) => root.querySelectorAll('[data-dish]').forEach(refresh);

export function initDishControls() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-dish]');
    if (card) {
      const item = MENU.find((m) => m.id === card.dataset.dish);
      const size = selectedSize(card);
      const entry = { id: item.id, name: item.name, size: size?.label, price: size ? size.price : item.price, img: item.img, kind: kindOf(item) };
      if (e.target.closest('[data-add]')) { lift(card); Cart.add(entry, true); }
      else if (e.target.closest('[data-step]')) {
        if (Number(e.target.closest('[data-step]').dataset.step) > 0) { lift(card); Cart.add(entry); }
        else Cart.change(item.id, size?.label, -1);
      }
      return;
    }
    const deal = e.target.closest('[data-add-platter]');
    if (deal) {
      const p = PLATTERS.find((x) => x.id === deal.dataset.addPlatter);
      Cart.add({ id: 'deal-' + p.id, name: p.name + ' (deal)', price: p.price, img: p.img, kind: 'platter' }, true);
      return;
    }
    const daily = e.target.closest('[data-add-daily]');
    if (daily) {
      const d = DAILY[Number(daily.dataset.addDaily)];
      Cart.add({ id: 'daily-' + daily.dataset.addDaily, name: `${d.item} · ${d.title}`, price: d.price, img: d.img, kind: 'platter' }, true);
    }
  });

  document.addEventListener('change', (e) => {
    const card = e.target.closest('[data-dish]');
    if (!card || !e.target.matches('.size-pick input')) return;
    const out = card.querySelector('[data-price-out]');
    out.textContent = fmt(Number(e.target.dataset.price));
    out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
    refresh(card);
  });

  Cart.subscribe(() => refreshDishes());
}

// the cut-out hops as it heads for the tray
function lift(card) {
  const f = card.querySelector('.dish-float');
  f.classList.remove('is-launch'); void f.offsetWidth; f.classList.add('is-launch');
}
