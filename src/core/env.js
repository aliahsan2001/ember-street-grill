/* What this device can handle. LITE swaps 3D scenes for lighter versions with the same content. */

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE = matchMedia('(pointer: fine)').matches;
export const isSmall = () => innerWidth < 760;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// ?lite or ?full force a mode for testing, and stick for the session
const query = new URLSearchParams(location.search);
try {
  if (query.has('lite')) sessionStorage.setItem('ember-mode', 'lite');
  if (query.has('full')) sessionStorage.setItem('ember-mode', 'full');
} catch { /* storage unavailable */ }
const forced = (() => { try { return sessionStorage.getItem('ember-mode'); } catch { return null; } })();

const weakDevice =
  (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
  (!FINE && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  navigator.connection?.saveData === true;

export const LITE = forced === 'lite' ? true : forced === 'full' ? false : !hasWebGL() || REDUCED || weakDevice;

document.documentElement.classList.toggle('lite', LITE);
document.documentElement.classList.toggle('reduced', REDUCED);
