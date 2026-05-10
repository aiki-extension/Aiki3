const l = console.log;

/**
 * Detect whether the document is in fullscreen across vendor-prefixed APIs.
 * @returns {boolean}
 */
export function isFullScreen() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement,
  );
}

/**
 * Remove the aiki interception overlay (`#aiki-overlay` and any
 * `.aiki-overlay` elements). Calls each element's `cleanup()` before removal
 * so subscriptions/intervals are torn down deterministically.
 */
export function removeOverlay() {
  l('Removing aiki-overlay');
  try {
    const element = document.getElementById('aiki-overlay');
    l('Element: ', element);
    if (element) {
      try {
        if (typeof element.cleanup === 'function') {
          element.cleanup();
          element.cleanup = undefined;
        }
      } catch {}
      element.remove();
    }
    const elements = document.getElementsByClassName('aiki-overlay');
    l('Elements: ', elements);
    if (elements.length > 0) {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el && el.remove) {
          try {
            if (typeof el.cleanup === 'function') {
              el.cleanup();
              el.cleanup = undefined;
            }
          } catch {}
          el.remove();
        }
      }
    }
  } catch {}
}

/* Floating Overlay Helpers */

/* Prompt Overlay Helpers */
