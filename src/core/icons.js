/* Inline SVG sprite, injected once outside the page container so every page can <use> it. */

const sprite = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="i-wa" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.8 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8z"/><path fill="currentColor" d="M8.6 7.3c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6a6.4 6.4 0 0 0 2.6 2.4c.3.2.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.5 0 .6-.3 1.3-.8 1.7-.6.5-1.5.7-2.4.4a9.6 9.6 0 0 1-4.3-2.8 7.4 7.4 0 0 1-1.9-3.6c-.1-.9.1-1.6.5-2.2z"/></symbol>
  <symbol id="i-tray" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3 13h18l-1.6 5.2a2 2 0 0 1-1.9 1.4H6.5a2 2 0 0 1-1.9-1.4L3 13zM7 13a5 5 0 0 1 10 0M12 6v2"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M5 3h3.5l1.7 4.4-2.3 1.4a11 11 0 0 0 7.3 7.3l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol>
  <symbol id="i-flame" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c.6 3.6-2.6 5.4-2.6 8.6a2.6 2.6 0 0 0 5.2 0c0-1.1-.4-2-.9-2.7C16.3 9.3 19 12 19 15.6A7 7 0 0 1 5 15.6C5 10.6 9.3 8.4 12 2z"/></symbol>
  <symbol id="i-chili" viewBox="0 0 24 24"><path fill="currentColor" d="M14.5 6.2c2.6.3 4.6 2.4 4.4 5.2-.3 4.6-5.7 9.3-12.6 9.6-1 0-1.3-1.2-.4-1.6 4.6-2 6.2-5.3 6.6-9.2.2-2.4 1-3.8 2-4zM15 5.3c-.2-1.4.6-2.7 2-3.3l.6 1.1c-.8.4-1.2 1.2-1.1 2.1z"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M3.5 6.5l8.5 6.5 8.5-6.5"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M16 16l4.5 4.5"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-bike" viewBox="0 0 24 24"><circle cx="6" cy="17" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="17" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 17l4-7h5l3 7M13 6h3l1.5 4M8.5 10H6"/></symbol>
  <symbol id="i-spin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M18 3v4h-4M6 21v-4h4"/></symbol>
</svg>`;

export function injectIcons() {
  if (!document.getElementById('i-wa')) document.body.insertAdjacentHTML('afterbegin', sprite);
}
