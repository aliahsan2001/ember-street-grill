/* Opening hours in Asia/Karachi, including closes that run past midnight. */

import { CONFIG } from '../data.js';

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function fmtTime(hhmm) {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 && h < 24 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`;
}

export function karachiNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    min: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

// day = the trading day (after midnight still counts as the previous evening)
export function status() {
  const { day, min } = karachiNow();
  const today = CONFIG.hours[day];
  const prev = (day + 6) % 7;
  const yesterday = CONFIG.hours[prev];
  const yClose = toMin(yesterday.close), yOpen = toMin(yesterday.open);
  if (yClose < yOpen && min < yClose) return { open: true, label: `Open now · until ${fmtTime(yesterday.close)}`, day: prev, closesIn: yClose - min };
  const o = toMin(today.open);
  let c = toMin(today.close);
  if (c <= o) c += 1440;
  if (min >= o && min < c) return { open: true, label: `Open now · until ${fmtTime(today.close)}`, day, closesIn: c - min };
  if (min < o) return { open: false, label: `Closed · opens ${fmtTime(today.open)}`, day, opensIn: o - min, opensAt: fmtTime(today.open) };
  const next = CONFIG.hours[(day + 1) % 7];
  return { open: false, label: `Closed · opens ${fmtTime(next.open)} tomorrow`, day, opensIn: 1440 - min + toMin(next.open), opensAt: fmtTime(next.open) };
}

export function paintStatus(root = document) {
  const st = status();
  root.querySelectorAll('[data-open-status]').forEach((el) => (el.textContent = st.label));
  root.querySelectorAll('[data-open-wrap]').forEach((el) => el.classList.toggle('is-open', st.open));
  return st;
}
