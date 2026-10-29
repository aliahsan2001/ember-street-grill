# Ember Street Grill: "The shutter opens"

[**Live demo**](https://ember-street-grill.vercel.app) · [Source files](./src/) · [Local setup](#run-it)

## Project at a glance

Cart subscriptions, localStorage persistence, cross-tab updates, delivery calculations, and structured order-message generation.

**Scope:** Frontend concept for a fictional restaurant. WhatsApp handoff prepares a message; it is not an order-processing backend.

**Start reviewing here:** [`src/cart/store.js`](./src/cart/store.js).

Concept project 1 of 8 for the Aqoa Systems portfolio. A fictional BBQ and karahi restaurant in Karachi.

## What's in it
| Page | Signature moment |
|---|---|
| Home | A painted shop shutter rattles up (tap, swipe up or scroll) to reveal a 3D charcoal grill. Section headings form out of smoke. |
| Menu | Categories ride a curved truck-art ribbon that drifts as you scroll. Dishes are floating cut-outs that lift and steam on hover. |
| Deals | Platters on a wooden lazy Susan you drag to spin. Prices tick up as each one lands. |
| About | The story stamps itself letter by letter onto a crumpled paper menu card. |
| Contact | A night street with a glowing map pin. Opening hours light up like neon tubes. |

**Signature interaction:** each dish you add drops into a 3D steel tray (Three.js + Matter.js physics) that follows you across pages. "Send on WhatsApp" slides the tray away and opens a formatted order message.

Also included: smoke page transitions (Barba.js) and an ember cursor that throws sparks. The site has no sound, by design.

## Stack
Vite · Three.js · GSAP + ScrollTrigger · Lenis · Barba.js · SplitType · Matter.js

## Run it
From a terminal:
```bash
npm ci
npm run dev
```
The site uses ES modules, so it needs a server: opening `index.html` by double-clicking won't work. Use `npm run dev`, or `npm run build && npm run preview` to check the production build.

Testing flags: `?lite` forces the lighter version, `?full` forces the 3D one (both stick for the browser session).

## Deploy on Vercel
Import the repo, leave **Root Directory** at the repository root (`./`), and keep the detected **Vite** preset (build `npm run build`, output `dist`). `vercel.json` turns on clean URLs (`/menu`).

## Lighter devices
Phones with little memory, data-saver on, no WebGL, or "reduce motion" set get the same content with lighter scenes: a still of the grill with CSS embers, a list-style tray, and a flat platter carousel. Reduced-motion visitors get simple fades.

## Before publishing
- Search "Ember Street Grill" on Google to check no real business uses the name.
- Contact details are placeholders (`src/data.js` → `CONFIG`, plus `src/partials`).
- `CONFIG.whatsappNumber` is empty on purpose, so WhatsApp lets the visitor pick a chat.

## Files
- `src/main.js`: app shell (Barba transitions, page lifecycle)
- `src/core/`: motion, smoke headings, cursor, transitions, hours
- `src/cart/`: cart store, 3D tray, drawer and WhatsApp message
- `src/three/`: grill and lazy Susan scenes
- `src/pages/`: one module per page
- `public/img/p/`: Unsplash photos (free licence), self-hosted as WebP

Built with 3D generated in code. The brief allows GLB models from Blender or Spline; none were needed here.
