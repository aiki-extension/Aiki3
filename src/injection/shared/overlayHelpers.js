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

/* ----- Floating Overlay Helpers ----- */
export function createCollapseButton(isCollapsed, {
  color = 'rgba(255,255,255,0.6)',
  hoverColor = 'rgba(255,255,255,0.95)',
  top = '6px',
  right = '8px',
} = {}) {
  const btn = document.createElement('button');
  btn.textContent = isCollapsed ? '▼' : '▲';
  btn.setAttribute(
    'style',
    `position: absolute; top: ${top}; right: ${right}; background: transparent; border: none; color: ${color}; cursor: pointer; font-size: 10px; padding: 4px; transition: color 0.2s;`,
  );
  btn.addEventListener('mouseenter', () => { btn.style.color = hoverColor; });
  btn.addEventListener('mouseleave', () => { btn.style.color = color; });
  return btn;
}

export function watchFullscreen(overlay, panel) {
  function handleChange() {
    if (isFullScreen()) {
      panel.dataset.savedLeft = panel.style.left || '';
      panel.dataset.savedRight = panel.style.right || '';
      panel.dataset.savedTop = panel.style.top || '';
      panel.dataset.savedBottom = panel.style.bottom || '';
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        if (panel.dataset.savedLeft !== undefined) {
          panel.style.left = panel.dataset.savedLeft;
          panel.style.right = panel.dataset.savedRight;
          panel.style.top = panel.dataset.savedTop;
          panel.style.bottom = panel.dataset.savedBottom;
        }
      });
    }
  }

  document.addEventListener('fullscreenchange', handleChange);
  document.addEventListener('webkitfullscreenchange', handleChange);
  document.addEventListener('mozfullscreenchange', handleChange);
  document.addEventListener('MSFullscreenChange', handleChange);
  handleChange();

  return () => {
    document.removeEventListener('fullscreenchange', handleChange);
    document.removeEventListener('webkitfullscreenchange', handleChange);
    document.removeEventListener('mozfullscreenchange', handleChange);
    document.removeEventListener('MSFullscreenChange', handleChange);
  };
}

/* ----- Prompt Overlay Helpers ----- */
