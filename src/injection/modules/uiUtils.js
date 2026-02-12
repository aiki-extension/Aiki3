import browser from "webextension-polyfill";

const l = console.log;

// Style constants (inline to avoid host CSS conflicts)
const STYLES = {
  // Base font and reset
  fontBase: `font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`,

  // Overlay types
  overlayBlocking: `all: initial; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.98); display: flex; align-items: center; justify-content: center; z-index: 2147483646;`,
  overlayTransparent: `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; display: flex;`,

  // Card containers
  cardLight: `background: #ffffff; color: #0f172a; border-radius: 18px; box-shadow: 0 28px 55px rgba(15, 23, 42, 0.35); display: flex; flex-direction: column;`,
  cardDark: `background: rgba(15, 23, 42, 0.98); color: #f8fafc; border-radius: 22px; box-shadow: 0 32px 70px rgba(15, 23, 42, 0.55); display: flex; flex-direction: column;`,

  // Buttons
  btnPrimary: `padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease;`,
  btnPrimaryHover: `padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #1d4ed8, #5b21b6); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(29, 78, 216, 0.32); transform: translateY(-1px);`,
  btnSecondary: `padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`,
  btnSecondaryHover: `padding: 10px 14px; border-radius: 999px; border: 1px solid #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: 600; cursor: pointer;`,

  // Progress bar
  progressShell: `width: 100%; border-radius: 999px; overflow: hidden;`,
  progressFill: `height: 100%; border-radius: inherit; transition: width 0.4s ease;`,
  progressGreen: `background: linear-gradient(135deg, #22c55e, #14b8a6);`,
};

/**
 * Format milliseconds as "Xm Ys" string.
 */
const formatDuration = (value) => {
  if (typeof value !== "number" || value <= 0) return "0m 0s";
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

/**
 * Make an element draggable.
 * @param {HTMLElement} element - Element to make draggable
 * @returns {{ cleanup: () => void }}
 */
const makeDraggable = (element) => {
  let dragState = { dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 };

  const onPointerDown = (event) => {
    dragState.dragging = true;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    element.style.cursor = "grabbing";
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragState.dragging) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    dragState.offsetX += dx;
    dragState.offsetY += dy;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    element.style.transform = `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`;
    event.preventDefault();
  };

  const endDrag = () => {
    dragState.dragging = false;
    element.style.cursor = "grab";
  };

  element.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointerleave", endDrag);

  return {
    cleanup: () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointerleave", endDrag);
    }
  };
};

/**
 * Create a timer communication port with polling.
 * @param {(msg: any) => void} updateCallback - Function to call on each timer update
 * @returns {{ port: any, intervalRef: number, cleanup: () => void }}
 */
const createTimerPort = (updateCallback) => {
  let port = null;
  let intervalRef = null;
  let cleanupCalled = false;

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    try { if (port) port.disconnect(); } catch (_) { }
    try { if (intervalRef) clearInterval(intervalRef); } catch (_) { }
  };

  try {
    port = browser.runtime.connect({ name: "Content Communication" });
    port.onDisconnect.addListener(cleanup);
    port.onMessage.addListener(updateCallback);

    browser.runtime
      .sendMessage({ type: "timer:get" })
      .then(updateCallback)
      .catch(() => { });

    intervalRef = setInterval(() => {
      try { port.postMessage("get: timer"); } catch (_) { }
    }, 1000);

    try { port.postMessage("get: timer"); } catch (_) { }
  } catch (_) { }

  return { port, intervalRef, cleanup };
};

// Shared host matching helper
const matchesHost = (targetUri, currentHost = location.hostname.replace(/^www\./, "")) => {
  if (typeof targetUri !== "string" || !targetUri.trim()) return false;
  try {
    const targetHost = new URL(targetUri).hostname.replace(/^www\./, "");
    return targetHost === currentHost ||
      currentHost.endsWith(`.${targetHost}`) ||
      targetHost.endsWith(`.${currentHost}`);
  } catch (_) {
    return false;
  }
};

const matchesProcrastinationHost = (procHosts, currentHost = location.hostname.replace(/^www\./, "")) => {
  return procHosts.some(host => {
    const normalizedHost = host.replace(/^www\./, "");
    return currentHost === normalizedHost ||
      currentHost.endsWith("." + normalizedHost) ||
      normalizedHost.endsWith("." + currentHost);
  });
};

/**
 * Removes aiki overlay elements.
 */
function removeOverlay() {
  l("Removing aiki-overlay");
  try {
    const element = document.getElementById("aiki-overlay");
    l("Element: ", element);
    if (element) {
      try {
        if (typeof element.cleanup === "function") {
          element.cleanup();
          element.cleanup = undefined;
        }
      } catch (_) { }
      element.remove();
    }
    const elements = document.getElementsByClassName("aiki-overlay");
    l("Elements: ", elements);
    if (elements.length > 0) {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el && el.remove) {
          try {
            if (typeof el.cleanup === "function") {
              el.cleanup();
              el.cleanup = undefined;
            }
          } catch (_) { }
          el.remove();
        }
      }
    }
  } catch (_) {
    // noop
  }
}

function removeRewardOverlay() {
  try {
    const rewardOverlay = document.getElementById("aiki-reward-overlay");
    if (rewardOverlay) rewardOverlay.remove();
  } catch (_) { }
}

export {
  STYLES,
  formatDuration,
  makeDraggable,
  createTimerPort,
  matchesHost,
  matchesProcrastinationHost,
  removeOverlay,
  removeRewardOverlay,
};
