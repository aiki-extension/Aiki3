/**
 * Install global listeners that nudge the caller to re-render its overlay
 * after history navigation, hash changes, focus, and visibility transitions.
 *
 * Wraps `history.pushState` and `history.replaceState` so SPA navigations
 * trigger the same ensure-callback. The wrapper-flag option prevents
 * double-wrapping when multiple guards (learning + reward) share the page.
 *
 * @param {() => void} ensureFn - Callback invoked on each lifecycle event.
 *   Should be cheap and idempotent — typically a debounced "if my overlay
 *   isn't in the DOM, re-render it".
 * @param {{ wrapperFlag: string }} options - Property name set on wrapped
 *   `history` methods so a second call from a different guard doesn't wrap
 *   them again.
 */
export function installPersistenceGuards(ensureFn, { wrapperFlag }) {
  const wrapHistory = (method) => {
    try {
      const original = history[method];
      if (typeof original !== 'function') return;
      if (original[wrapperFlag]) return;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        ensureFn();
        return result;
      };
      wrapped[wrapperFlag] = true;
      history[method] = wrapped;
    } catch {}
  };

  wrapHistory('pushState');
  wrapHistory('replaceState');

  window.addEventListener('popstate', ensureFn);
  window.addEventListener('hashchange', ensureFn);
  window.addEventListener('focus', ensureFn);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureFn();
  });
}

/**
 * Build a debounced "ensure overlay exists" wrapper. The returned function is
 * safe to call rapidly; it coalesces calls into a single invocation per
 * `delayMs` window.
 *
 * @param {() => void} ensure - The actual re-render call.
 * @param {number} [delayMs=120]
 * @returns {() => void}
 */
export function debounceEnsure(ensure, delayMs = 120) {
  let timeout = null;
  return () => {
    if (timeout) return;
    timeout = setTimeout(() => {
      timeout = null;
      ensure();
    }, delayMs);
  };
}
