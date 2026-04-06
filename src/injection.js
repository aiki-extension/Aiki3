import browser from "webextension-polyfill";
import { getLearningUrl } from "./services/siteDetector";

const l = console.log;

// ============================================
// SHARED UTILITIES & STYLES
// ============================================

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
const formatDurationShort = (value) => {
  if (typeof value !== "number" || value <= 0) return "0m";
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}m`;
};

/**
 * Make an element draggable.
 * @param {HTMLElement} element - Element to make draggable
 * @returns {{ cleanup: () => void }}
 */
const makeDraggable = (element) => {
  let dragState = { 
    dragging: false, 
    startX: 0, 
    startY: 0,
    currentX: 0,
    currentY: 0,
    intendedX: 0,
    intendedY: 0
  };

  // Determine which corner to snap to based on position
  const getNearestCorner = () => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    return {
      horizontal: centerX > window.innerWidth / 2 ? 'right' : 'left',
      vertical: centerY > window.innerHeight / 2 ? 'bottom' : 'top'
    };
  };

  // Snap position to nearest corner
  const snapToCorner = () => {
    const corner = getNearestCorner();
    const rect = element.getBoundingClientRect();
    const margin = 24; // Corner margin
    
    let x, y;
    
    if (corner.horizontal === 'right') {
      x = window.innerWidth - rect.width - margin;
    } else {
      x = margin;
    }
    
    if (corner.vertical === 'bottom') {
      y = window.innerHeight - rect.height - margin;
    } else {
      y = margin;
    }
    
    return { x, y, corner };
  };

  const applySnappedPosition = (x, y) => {
    const rect = element.getBoundingClientRect();
    const corner = getNearestCorner();
    
    // Instantly convert to the target coordinate system (no transition)
    const prevTransition = element.style.transition;
    element.style.transition = 'none';
    
    if (corner.horizontal === 'right') {
      element.style.left = '';
      element.style.right = `${window.innerWidth - rect.right}px`;
    } else {
      element.style.right = '';
      element.style.left = `${rect.left}px`;
    }
    
    if (corner.vertical === 'bottom') {
      element.style.top = '';
      element.style.bottom = `${window.innerHeight - rect.bottom}px`;
    } else {
      element.style.bottom = '';
      element.style.top = `${rect.top}px`;
    }
    
    // Force reflow
    element.getBoundingClientRect();
    
    // Re-enable transition and animate to snapped position
    element.style.transition = prevTransition;
    
    if (corner.horizontal === 'right') {
      element.style.right = '0px';
    } else {
      element.style.left = '0px';
    }
    
    if (corner.vertical === 'bottom') {
      element.style.bottom = '0px';
    } else {
      element.style.top = '0px';
    }
  };

  // Apply position
  const applyPosition = (x, y) => {
    element.style.right = '';
    element.style.bottom = '';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  };

  const initializePosition = () => {
    const rect = element.getBoundingClientRect();
    dragState.currentX = rect.left;
    dragState.currentY = rect.top;
    dragState.intendedX = rect.left;
    dragState.intendedY = rect.top;
    
    element.style.position = 'fixed';
    element.style.transform = 'none';
    
    // Snap to nearest corner on init
    const { x, y } = snapToCorner();
    dragState.currentX = x;
    dragState.currentY = y;
    dragState.intendedX = x;
    dragState.intendedY = y;
    applySnappedPosition(x, y);
  };

  const updatePosition = (intendedX, intendedY) => {
    // During drag, allow free movement but constrain to bounds
    const rect = element.getBoundingClientRect();
    const margin = 24;
    
    const minX = margin;
    const minY = margin;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    
    const x = Math.max(minX, Math.min(maxX, intendedX));
    const y = Math.max(minY, Math.min(maxY, intendedY));
    
    dragState.currentX = x;
    dragState.currentY = y;

    applyPosition(x, y);
  };

  const syncIntendedPosition = () => {
    // Snap to nearest corner when size changes
    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);
  };

  const onResize = () => {
    // Snap to corner on resize
    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);
  };

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
      return;
    }

    const rect = element.getBoundingClientRect();
    element.style.right = '';
    element.style.bottom = '';
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    dragState.currentX = rect.left;
    dragState.currentY = rect.top;
    dragState.intendedX = rect.left;
    dragState.intendedY = rect.top;

    dragState.dragging = true;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    
    // This temporarily "mutes" the 0.3s from getPanelStyle
    element.style.transition = 'all 0.1s ease-out'

    element.style.cursor = "grabbing";
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event) => {
    if (!dragState.dragging) return;
    
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    
    dragState.intendedX += dx;
    dragState.intendedY += dy;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    
    updatePosition(dragState.intendedX, dragState.intendedY);
    
    event.preventDefault();
    event.stopPropagation();
  };

  const endDrag = (event) => {
    if (!dragState.dragging) return;
    
    dragState.dragging = false;
    // Dragging is over, 0.3s transition can be re-enabled for snap animation
    element.style.transition = 'all 0.3s ease';

    element.style.cursor = "grab";
    
    // Snap to nearest corner when drag ends
    const { x, y } = snapToCorner();
    dragState.intendedX = x;
    dragState.intendedY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    applySnappedPosition(x, y);
    
    if (event.pointerId !== undefined) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  initializePosition();
  
  element.style.cursor = "grab";
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", endDrag);
  element.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", onResize);
  
  return {
    cleanup: () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endDrag);
      element.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("resize", onResize);
    },
    syncIntendedPosition
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

function isFullScreen() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

// ============================================
// OVERLAY PERSISTENCE GUARDS
// ============================================

let overlayGuardsInstalled = false;
let overlayEnsureTimeout = null;

const scheduleOverlayEnsure = () => {
  if (overlayEnsureTimeout) return;
  overlayEnsureTimeout = setTimeout(() => {
    overlayEnsureTimeout = null;
    if (!document.getElementById("aiki-overlay")) {
      renderLearningContent().catch(() => { });
    }
  }, 120);
};

function installOverlayPersistence() {
  if (overlayGuardsInstalled) return;
  overlayGuardsInstalled = true;

  const wrapHistory = (method) => {
    try {
      const original = history[method];
      if (typeof original !== "function") return;
      history[method] = function (...args) {
        const result = original.apply(this, args);
        scheduleOverlayEnsure();
        return result;
      };
    } catch (_) { }
  };

  wrapHistory("pushState");
  wrapHistory("replaceState");

  window.addEventListener("popstate", scheduleOverlayEnsure);
  window.addEventListener("hashchange", scheduleOverlayEnsure);
  window.addEventListener("focus", scheduleOverlayEnsure);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleOverlayEnsure();
    }
  });
}

let bootstrapAttemptPending = false;

const matchesLearningHost = (learningUri) => {
  if (typeof learningUri !== "string" || !learningUri.trim()) return false;
  try {
    const targetHost = new URL(learningUri).hostname.replace(/^www\./, "");
    const currentHost = location.hostname.replace(/^www\./, "");
    return (
      targetHost === currentHost ||
      currentHost.endsWith(`.${targetHost}`) ||
      targetHost.endsWith(`.${currentHost}`)
    );
  } catch (_) {
    return false;
  }
};

async function bootstrapLearningOverlayIfNeeded() {
  if (bootstrapAttemptPending) return;
  bootstrapAttemptPending = true;
  try {
    const learningUri = await getLearningUrl();
    if (!learningUri || !matchesLearningHost(learningUri)) {
      bootstrapAttemptPending = false;
      return;
    }
    try {
      await browser.runtime.sendMessage({ type: "learning:autoStart" });
    } catch (_) { }
    await renderLearningContent();
  } catch (_) {
    // swallow
  } finally {
    bootstrapAttemptPending = false;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapLearningOverlayIfNeeded, { once: true });
} else {
  bootstrapLearningOverlayIfNeeded();
}

/**
 * Bootstrap reward overlay on page load if we're in reward mode.
 * This handles full page reloads on time wasting sites.
 * Only shows on time wasting sites to avoid appearing on other pages.
 */
async function bootstrapRewardOverlayIfNeeded() {
  try {
    // Query background for current timer state
    const timerData = await browser.runtime.sendMessage({ type: "timer:get" });

    // If reward timer is active (goal > 0), check if we're on a time wasting site
    if (timerData && timerData.sessionrewardGoal > 0) {
      // Get time wasting sites list
      const result = await browser.storage.local.get("list");
      const procList = result?.list || [];
      const procHosts = procList.map(item => item?.host || item?.name || "").filter(Boolean);

      // Check if current page matches any time wasting site
      const currentHost = location.hostname.replace(/^www\./, "");
      const isOnProcrastinationSite = procHosts.some(host => {
        const normalizedHost = host.replace(/^www\./, "");
        return currentHost === normalizedHost ||
          currentHost.endsWith("." + normalizedHost) ||
          normalizedHost.endsWith("." + currentHost);
      });

      if (isOnProcrastinationSite) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (!document.getElementById("aiki-reward-overlay")) {
            renderProcrastinationRewardOverlay();
          }
        }, 50);
      }
    }
  } catch (_) {
    // Ignore errors - background might not be ready
  }
}

// Bootstrap reward overlay on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapRewardOverlayIfNeeded, { once: true });
} else {
  bootstrapRewardOverlayIfNeeded();
}

/* Listener for messages from background script. */
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "display:redirectPrompt") {
    return renderRedirectPrompt(request.url, request.originUrl);
  } else if (request.action === "display: encouragement") {
    return renderLearningContent(request.shouldShowWelcome);
  } else if (request.action === "display: rewardOverlay") {
    renderProcrastinationRewardOverlay();
    return Promise.resolve({ action: "reward overlay shown" });
  } else if (request.action === "kill aiki") {
    removeOverlay();
    // Also remove reward overlay if present
    try {
      const rewardOverlay = document.getElementById("aiki-reward-overlay");
      if (rewardOverlay) rewardOverlay.remove();
    } catch (_) { }
    return Promise.resolve({ action: "end injection" });
  } else if (request.action === "display:contentBlocker") {
    return renderContentBlocker(request.originUrl);
  } else if (request.action === "remove blocker") {
    removeOverlay();
  }
});

// Signal to the background that this content script is ready to receive messages.
// Deferred to DOMContentLoaded so document.body exists when the background responds
// with a prompt — all render functions append to document.body.
// applyPreemptiveHide / showImmediatePrompt fire via scripting.executeScript in the
// background, so they are unaffected by this delay.
function sendContentScriptReady() {
  browser.runtime.sendMessage({ type: "contentScript:ready" })
    .then((res) => console.log("[Aiki injection] contentScript:ready ack:", res))
    .catch((err) => console.warn("[Aiki injection] contentScript:ready send failed:", err?.message));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", sendContentScriptReady, { once: true });
} else {
  sendContentScriptReady();
}

/**
 * @function
 * @description Removes the aiki interception overlay by searching for DOM elements 
 * with the name "aiki-overlay". Also calls any cleanup functions attached to the 
 * overlay elements to properly dispose of event listeners and intervals. 
 * This ensures a clean slate before showing new overlays and prevents 
 * duplicate overlays from stacking.
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
  } catch (error) {
    // console.log(error);
  }
}

function renderRedirectPrompt(originUrl) {
  return new Promise((resolve) => {
    let done = false;
    try {
      removeOverlay();
    } catch (_) { }

    const overlay = document.createElement("div");
    overlay.id = "aiki-overlay";
    overlay.className = "aiki-overlay";
    overlay.setAttribute(
      "style",
      `${STYLES.overlayBlocking} ${STYLES.fontBase}`
    );

    const card = document.createElement("div");
    card.setAttribute(
      "style",
      `${STYLES.cardLight} width: min(320px, 92vw); padding: clamp(16px, 3vw, 24px); gap: 18px; text-align: left; ${STYLES.fontBase}`
    );

    const title = document.createElement("h2");
    title.textContent = "Redirect to learning?";
    title.setAttribute("style", "margin: 0; font-size: clamp(1em, 2vw, 1.35em); font-weight: 700; color: #020617; line-height: 1.3;");

    const getHostFromString = (value) => {
      if (!value || typeof value !== "string") return "";
      try {
        return new URL(value).hostname || "";
      } catch (_) {
        return "";
      }
    };

    const getCurrentHost = () => {
      try {
        return window.location.hostname || "";
      } catch (_) {
        return "";
      }
    };

    let host = getCurrentHost() || getHostFromString(originUrl);

    const description = document.createElement("p");
    const formatDomain = (h) => h.replace(/^www\./, "");
    const updateDescription = (h) => {
      description.innerHTML = "";
      if (h) {
        description.appendChild(document.createTextNode("You're visiting "));
        const strong = document.createElement("strong");
        strong.textContent = formatDomain(h);
        description.appendChild(strong);
        description.appendChild(document.createTextNode(". Switch to your learning platform?"));
      } else {
        description.textContent = "You've reached a focus site. Do you want to jump to your learning platform?";
      }
    };

    updateDescription(host);
    description.setAttribute(
      "style",
      "margin: 0; font-size: clamp(0.95em, 1.5vw, 1.1em); line-height: 1.6; color: #1e293b;"
    );

    const actions = document.createElement("div");
    actions.setAttribute(
      "style",
      "display: flex; gap: 12px; justify-content: flex-end;"
    );

    const continueButton = document.createElement("button");
    continueButton.textContent = "Stay here";
    const btnSecStyle = `flex: 1; ${STYLES.btnSecondary} display: flex; justify-content: center; align-items: center; text-align: center;`;
    const btnSecHoverStyle = `flex: 1; ${STYLES.btnSecondaryHover} display: flex; justify-content: center; align-items: center; text-align: center;`;
    continueButton.setAttribute("style", btnSecStyle);
    continueButton.onmouseenter = () => continueButton.setAttribute("style", btnSecHoverStyle);
    continueButton.onmouseleave = () => continueButton.setAttribute("style", btnSecStyle);

    const redirectButton = document.createElement("button");
    redirectButton.textContent = "Redirect";
    const btnPriStyle = `flex: 1; ${STYLES.btnPrimary} display: flex; justify-content: center; align-items: center; text-align: center;`;
    const btnPriHoverStyle = `flex: 1; ${STYLES.btnPrimaryHover} display: flex; justify-content: center; align-items: center; text-align: center;`;
    redirectButton.setAttribute("style", btnPriStyle);
    redirectButton.onmouseenter = () => redirectButton.setAttribute("style", btnPriHoverStyle);
    redirectButton.onmouseleave = () => redirectButton.setAttribute("style", btnPriStyle);

    const finalize = (action) => {
      if (done) return;
      done = true;
      if (action !== "redirect") {
        try {
          removeOverlay();
        } catch (_) { }
      }
      resolve({ action });
    };

    continueButton.addEventListener("click", () => finalize("continue"));
    redirectButton.addEventListener("click", () => finalize("redirect"));

    // Keep host label in sync if the user navigates while the prompt is open.
    let hostWatchInterval = null;
    try {
      hostWatchInterval = setInterval(() => {
        const currentHost = getCurrentHost() || getHostFromString(originUrl);
        if (currentHost && currentHost !== host) {
          host = currentHost;
          updateDescription(host);
        }
      }, 400);
    } catch (_) { }

    actions.appendChild(continueButton);
    actions.appendChild(redirectButton);

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(actions);
    overlay.appendChild(card);

    document.body.appendChild(overlay);
    overlay.cleanup = () => {
      if (done) return;
      done = true;
      if (hostWatchInterval) {
        clearInterval(hostWatchInterval);
        hostWatchInterval = null;
      }
    };
  });
}

function renderLearningContent() {
  return new Promise((resolve) => {
    try {
      removeOverlay();
    } catch (_) { }

    const overlay = document.createElement("div");
    overlay.id = "aiki-overlay";
    overlay.className = "aiki-overlay";
    overlay.setAttribute(
      "style",
      `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483645; display: flex; justify-content: flex-end; align-items: flex-end; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
    );

    const panel = document.createElement("div");
    const isCollapsedKey = "aiki-learning-collapsed";
    let isCollapsed = localStorage.getItem(isCollapsedKey) === "true";

    const getPanelStyle = (collapsed) => `pointer-events: auto; padding: ${collapsed ? "10px 14px" : "clamp(16px, 3vw, 22px)"}; min-width: ${collapsed ? "140px" : "260px"}; max-width: ${collapsed ? "180px" : "320px"}; margin: 8px; background: rgba(15, 23, 42, 0.96); color: #f8fafc; border-radius: ${collapsed ? "12px" : "18px"}; box-shadow: 0 24px 45px rgba(15, 23, 42, 0.45); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? "6px" : "12px"}; cursor: grab; position: relative; font-size: 14px; transition: all 0.3s ease;`;

    function updateOverlayVisibility() {
      if (isFullScreen()) {
        // Store current position before hiding
        panel.dataset.savedLeft = panel.style.left || '';
        panel.dataset.savedRight = panel.style.right || '';
        panel.dataset.savedTop = panel.style.top || '';
        panel.dataset.savedBottom = panel.style.bottom || '';
        overlay.style.display = "none";
      } else {
        overlay.style.display = "flex";
        // Restore saved position after showing
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

    // Listeners for fullscreen
    document.addEventListener("fullscreenchange", updateOverlayVisibility);
    document.addEventListener("webkitfullscreenchange", updateOverlayVisibility);
    document.addEventListener("mozfullscreenchange", updateOverlayVisibility);
    document.addEventListener("MSFullscreenChange", updateOverlayVisibility);

    // Initial check for fullscreen
    updateOverlayVisibility();

    panel.setAttribute("style", getPanelStyle(isCollapsed));

    // Collapse toggle button
    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = isCollapsed ? "▼" : "▲";
    collapseBtn.setAttribute(
      "style",
      "position: absolute; top: 6px; right: 8px; background: transparent; border: none; color: rgba(248, 250, 252, 0.6); cursor: pointer; font-size: 10px; padding: 4px; transition: color 0.2s;"
    );
    collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.color = "rgba(248, 250, 252, 0.95)"; });
    collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.color = "rgba(248, 250, 252, 0.6)"; });

    const heading = document.createElement("strong");
    heading.textContent = "📚 Learning Session";
    heading.setAttribute("style", `font-size: 1em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? "none" : "block"};`);

    const progressLabel = document.createElement("span");
    progressLabel.setAttribute(
      "style",
      `font-size: ${isCollapsed ? "0.95em" : "0.9em"}; color: rgba(248, 250, 252, 0.92); font-weight: ${isCollapsed ? "600" : "400"};`
    );
    progressLabel.textContent = "Getting things ready...";

    const barShell = document.createElement("div");
    barShell.setAttribute(
      "style",
      `width: 100%; height: ${isCollapsed ? "6px" : "10px"}; border-radius: 999px; background: rgba(148, 163, 184, 0.35); overflow: hidden; transition: height 0.3s ease;`
    );

    const barFill = document.createElement("div");
    barFill.setAttribute(
      "style",
      "width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(135deg, #22c55e, #14b8a6); transition: width 0.4s ease;"
    );
    barShell.appendChild(barFill);

    const status = document.createElement("span");
    status.setAttribute(
      "style",
      `font-size: 0.88em; color: rgba(248, 250, 252, 0.78); display: ${isCollapsed ? "none" : "block"};`
    );
    status.textContent = "Stay focused here to earn your time.";

    // Claim Reward button
    const claimRewardBtn = document.createElement("button");
    claimRewardBtn.textContent = "Claim Reward";
    claimRewardBtn.setAttribute(
      "style",
      "display: none; margin-top: 8px; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; border: none; border-radius: 10px; font-size: 0.95em; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center;"
    );
    claimRewardBtn.addEventListener("mouseenter", () => {
      claimRewardBtn.style.transform = "scale(1.02)";
      claimRewardBtn.style.boxShadow = "0 8px 20px rgba(249, 115, 22, 0.4)";
    });
    claimRewardBtn.addEventListener("mouseleave", () => {
      claimRewardBtn.style.transform = "scale(1)";
      claimRewardBtn.style.boxShadow = "none";
    });
    claimRewardBtn.addEventListener("click", async () => {
      try {
        await browser.runtime.sendMessage({ type: "session:claimReward" });
      } catch (e) {
        console.log("[Aiki] Failed to claim reward:", e);
      }
    });

    // Collapse/expand toggle handler
    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      localStorage.setItem(isCollapsedKey, isCollapsed.toString());
      collapseBtn.textContent = isCollapsed ? "▼" : "▲";
      
      // Store current position before changing styles
      const currentLeft = panel.style.left;
      const currentTop = panel.style.top;
      const currentPosition = panel.style.position;
      const currentTransform = panel.style.transform;
      
      // Update the style
      panel.setAttribute("style", getPanelStyle(isCollapsed));
      
      // Restore positioning properties
      if (currentPosition) panel.style.position = currentPosition;
      if (currentLeft) panel.style.left = currentLeft;
      if (currentTop) panel.style.top = currentTop;
      if (currentTransform) panel.style.transform = currentTransform;
      
      heading.style.display = isCollapsed ? "none" : "block";
      status.style.display = isCollapsed ? "none" : "block";
      barShell.style.height = isCollapsed ? "6px" : "10px";
      progressLabel.style.fontSize = isCollapsed ? "0.95em" : "0.9em";
      progressLabel.style.fontWeight = isCollapsed ? "600" : "400";
      
      // Hide snooze button when collapsed
      if (isCollapsed && snoozeBtn.style.display !== "none") {
        snoozeBtn.dataset.wasVisible = "true";
        snoozeBtn.style.display = "none";
      } else if (!isCollapsed && snoozeBtn.dataset.wasVisible === "true") {
        snoozeBtn.style.display = "block";
      }
      
      // Sync the intended position after size change
      setTimeout(() => {
        if (dragHandle && dragHandle.syncIntendedPosition) {
          dragHandle.syncIntendedPosition();
        }
      }, 300);
    };
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse();
    });

    panel.appendChild(collapseBtn);
    panel.appendChild(heading);
    panel.appendChild(progressLabel);
    panel.appendChild(barShell);
    panel.appendChild(status);
    panel.appendChild(claimRewardBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    installOverlayPersistence();

    // Use shared drag utility
    const dragHandle = makeDraggable(panel);

    const update = (msg) => {
    if (!msg) return;

    const defaultBg = "rgba(15, 23, 42, 0.96)";
    
    // Session-based learning
    const sessionRewardGoal = typeof msg.sessionRewardGoal === "number" ? msg.sessionRewardGoal : 0;
    const sessionRewardRemaining = typeof msg.sessionRewardRemaining === "number" ? msg.sessionRewardRemaining : 0;
    const sessionGoal = typeof msg.sessionGoal === "number" ? msg.sessionGoal : 0;
    const sessionRemaining = typeof msg.sessionRemaining === "number" ? msg.sessionRemaining : 0;
    const sessionCompleted = msg.sessionCompleted || false;

    // Check if in reward mode
    if (sessionRewardGoal > 0) {
      // Calculates how much time has been used
      const progress = Math.max(0, sessionRewardGoal - sessionRewardRemaining);
      const percent = sessionRewardGoal > 0 ? Math.min(100, (progress / sessionRewardGoal) * 100) : 0;

      // Updates progress bar to show reward time consumption
      barFill.style.width = `${percent}%`;
      barFill.style.background = "linear-gradient(135deg, #ffffffff, #32CD32)";
      // Displays current/total reward time
      progressLabel.textContent = `${formatDuration(progress)} / ${formatDurationShort(sessionRewardGoal)}`;
      
      // UI updated to show visually that the user is in "Reward Time"
      heading.textContent = "🎉 Reward Time";
      status.textContent = `Enjoy! ${formatDuration(sessionRewardRemaining)} remaining.`;
      panel.style.background = "linear-gradient(135deg, #ADD8E6, #32CD32)";

      // Hides claim button during reward time, as the user already has claimed it
      claimRewardBtn.style.display = "none";
    }
    // Check if in active session
    else if (sessionGoal > 0) {
      // Calculates learning progress within the session
      const progress = Math.max(0, sessionGoal - sessionRemaining);
      const percent = sessionGoal > 0 ? Math.min(100, (progress / sessionGoal) * 100) : 0;
      
      // Progress bar updates to show learning completion
      barFill.style.width = `${percent}%`;
      barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
      heading.textContent = "📚 Learning Session";
      panel.style.background = defaultBg;

      // Session complete
      if (sessionRemaining <= 0 || sessionCompleted) {
        // Display full completion 
        progressLabel.textContent = `${formatDuration(sessionGoal)} / ${formatDurationShort(sessionGoal)}`;
        // Check if daily goal is reached
        const dailyGoal = typeof msg.dailyGoal === "number" ? msg.dailyGoal : 0;
        const dailyProgress = typeof msg.dailyProgress === "number" ? msg.dailyProgress : 0;

        if (dailyGoal > 0 && dailyProgress >= dailyGoal) {
          // Daily goal reached - show celebration instead of claim button
          heading.textContent = "🎉 Daily Goal Reached!";
          status.textContent = "Great work today! Come back tomorrow for more.";
          panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
          claimRewardBtn.style.display = "none";
      } else {
          // Session complete but daily goal not reached - show claim button
          status.textContent = "Session complete! Claim your reward.";
          panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
          claimRewardBtn.style.display = "block";
    }
      }
      // Session in progress
      else {
        // Display current progress and goal (example: "8 15 s/ 15 min")
        progressLabel.textContent = `${formatDuration(progress)} / ${formatDurationShort(sessionGoal)}`;
        status.textContent = `Keep going for ${formatDuration(sessionRemaining)} more.`;
        // Hide claim button
        claimRewardBtn.style.display = "none";
      }
    }
    // Idle state - no active session
    else {
      // Checks if daily goal has been reached
      if (msg.dailyGoal > 0 && msg.dailyProgress >= msg.dailyGoal) {
          heading.textContent = "🎉 Daily Goal Reached!";
          progressLabel.textContent = `${formatDuration(msg.dailyProgress)} completed`;
          barFill.style.width = "100%";
          barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
          status.textContent = "Great work today! Come back tomorrow for more.";
          panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
      } else {
        // Display ready state
        heading.textContent = "📚 Aiki Learning";
        progressLabel.textContent = "Ready to learn";
        // Empty progress bar, as no active session yet
        barFill.style.width = "0%";
        barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
        // Instructions for user to begin a learning session
        status.textContent = "Visit a learning site to start a session.";
        panel.style.background = defaultBg;
        // Hide claim button
        claimRewardBtn.style.display = "none";
      }
    }
  };

    // Use shared timer port utility
    const timerPort = createTimerPort(update);

    let cleanupCalled = false;
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      dragHandle.cleanup();
      timerPort.cleanup();
      try { removeOverlay(); } catch (_) { }
      // Remove fullscreen listeners when cleaning up to prevent memory leaks
      document.removeEventListener("fullscreenchange", updateOverlayVisibility);
      document.removeEventListener("webkitfullscreenchange", updateOverlayVisibility);
      document.removeEventListener("mozfullscreenchange", updateOverlayVisibility);
      document.removeEventListener("MSFullscreenChange", updateOverlayVisibility);
    };

    overlay.cleanup = cleanup;
    window.addEventListener("beforeunload", cleanup, { once: true });
    update(null);

    resolve({ action: "end injection" });
  });
}

function renderContentBlocker(originUrl) {
  return new Promise((resolve) => {
  try {
    removeOverlay();
  } catch (_) { }

  const overlay = document.createElement("div");
  overlay.id = "aiki-overlay";
  overlay.className = "aiki-overlay";
  overlay.setAttribute(
    "style",
    `all: initial; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.98); display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: clamp(16px, 4vw, 28px); font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
  );

  const card = document.createElement("div");
  card.setAttribute(
    "style",
    `width: min(420px, 92vw); max-width: 420px; min-width: 300px; border-radius: 22px; background: rgba(15, 23, 42, 0.98); color: #f8fafc; box-shadow: 0 32px 70px rgba(15, 23, 42, 0.55); display: flex; flex-direction: column; gap: 18px; padding: clamp(22px, 3.5vw, 28px); font-family: 'Inter', 'Segoe UI', sans-serif;`
  );

  const title = document.createElement("h2");
  title.textContent = "Keep learning";
  title.setAttribute("style", "margin: 0; font-size: clamp(1.15em, 1vw + 0.65em, 1.45em); font-weight: 700; letter-spacing: 0.01em; color: #f8fafc;");

  const description = document.createElement("p");
  description.textContent = "You're mid-session. Head back to your focus site to keep building momentum.";
  description.setAttribute("style", "margin: 0; font-size: clamp(0.9em, 1vw + 0.4em, 1.05em); line-height: 1.6; color: rgba(241, 245, 249, 0.9);");

  const progressLabel = document.createElement("span");
  progressLabel.setAttribute("style", "font-size: clamp(0.9em, 1vw + 0.35em, 1.05em); color: rgba(241, 245, 249, 0.88);");
  progressLabel.textContent = "Syncing progress...";

  const barShell = document.createElement("div");
  barShell.setAttribute("style", "width: 100%; height: 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.3); overflow: hidden;");

  const barFill = document.createElement("div");
  barFill.setAttribute(
    "style",
    "width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(135deg, #22c55e, #14b8a6); transition: width 0.3s ease;"
  );
  barShell.appendChild(barFill);

  const status = document.createElement("span");
  status.setAttribute("style", "font-size: clamp(0.85em, 1vw + 0.3em, 1em); color: rgba(241, 245, 249, 0.78);");
  status.textContent = "Stay focused a little longer to unlock breaks.";

  const actions = document.createElement("div");
  actions.setAttribute("style", "display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;");

  const continueButton = document.createElement("button");
  continueButton.textContent = "Visit site anyway";
  continueButton.setAttribute(
    "style",
    `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #f9fafb; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
  );
  continueButton.onmouseenter = () =>
    continueButton.setAttribute(
      "style",
      `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(56,189,248,0.7); background: rgba(56,189,248,0.15); color: #e0f2fe; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
    );
  continueButton.onmouseleave = () =>
    continueButton.setAttribute(
      "style",
      `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #f9fafb; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
    );

  const button = document.createElement("button");
  button.textContent = "Return to learning";
  button.setAttribute(
    "style",
    `padding: 10px 16px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; border-radius: 999px; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(37, 99, 235, 0.28);`
  );

  actions.appendChild(continueButton);
  actions.appendChild(button);

  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(progressLabel);
  card.appendChild(barShell);
  card.appendChild(status);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const update = (msg) => {
    if (!msg) return;
    const goal = typeof msg.dailyGoal === "number" ? msg.dailyGoal : 0;
    const progress = typeof msg.dailyProgress === "number" ? msg.dailyProgress : 0;
    const remaining = Math.max(goal - progress, 0);
    const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0; // Cap bar at 100% visually

    barFill.style.width = `${percent}%`;
    progressLabel.textContent = goal > 0
      ? `${formatDuration(progress)} / ${formatDurationShort(goal)}`
      : "No learning goal set yet";

    if (goal > 0 && remaining === 0) {
      status.textContent = "Goal complete! Take a well-deserved break.";
    } else if (goal > 0) {
      status.textContent = `Keep going for ${formatDuration(remaining)} more.`;
    } else {
      status.textContent = "Set a goal in settings to track progress.";
    }
  };

  // Use shared timer port utility
  const timerPort = createTimerPort(update);

  let cleanupCalled = false;
  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    timerPort.cleanup();
    try { overlay.remove(); } catch (_) { }
  };

  overlay.cleanup = cleanup;

  continueButton.addEventListener("click", () => {
    cleanup();
    resolve({ action: "continue" });
  });

  button.addEventListener("click", async () => {
    try {
      const result = await getLearningUrl();
      const uri = (typeof result === "string" ? result.trim() : "");
      if (uri) {
        cleanup();
        resolve({ action: "return" });
        location.href = uri;
        return;
      }
    } catch (_) { }
    cleanup();
    resolve({ action: "return" });
  });
  }); // end Promise
}

// ============================================
// Reward Overlay Persistence Guards
// ============================================

let rewardOverlayGuardsInstalled = false;
let rewardOverlayEnsureTimeout = null;

const scheduleRewardOverlayEnsure = () => {
  if (rewardOverlayEnsureTimeout) return;
  rewardOverlayEnsureTimeout = setTimeout(async () => {
    rewardOverlayEnsureTimeout = null;
    try {
      // Check with background if we're in reward mode
      const data = await browser.runtime.sendMessage({ type: "timer:get" });
      if (data && data.sessionRewardGoal > 0 && !document.getElementById("aiki-reward-overlay")) {
        // Also check if we're on a time wasting site
        const result = await browser.storage.local.get("list");
        const procList = result?.list || [];
        const procHosts = procList.map(item => item?.host || item?.name || "").filter(Boolean);

        const currentHost = location.hostname.replace(/^www\./, "");
        const isOnProcrastinationSite = procHosts.some(host => {
          const normalizedHost = host.replace(/^www\./, "");
          return currentHost === normalizedHost ||
            currentHost.endsWith("." + normalizedHost) ||
            normalizedHost.endsWith("." + currentHost);
        });

        if (isOnProcrastinationSite) {
          renderProcrastinationRewardOverlay();
        }
      }
    } catch (_) { }
  }, 120);
};

function installRewardOverlayPersistence() {
  if (rewardOverlayGuardsInstalled) return;
  rewardOverlayGuardsInstalled = true;

  const wrapHistory = (method) => {
    try {
      const original = history[method];
      if (typeof original !== "function") return;
      // Only wrap once - check if already wrapped
      if (original._aikiRewardWrapped) return;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        scheduleRewardOverlayEnsure();
        return result;
      };
      wrapped._aikiRewardWrapped = true;
      history[method] = wrapped;
    } catch (_) { }
  };

  wrapHistory("pushState");
  wrapHistory("replaceState");

  window.addEventListener("popstate", scheduleRewardOverlayEnsure);
  window.addEventListener("hashchange", scheduleRewardOverlayEnsure);
  window.addEventListener("focus", scheduleRewardOverlayEnsure);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleRewardOverlayEnsure();
    }
  });
}

/**
 * Render a reward time overlay for controlled variant on time wasting sites.
 * Non-blocking panel showing countdown until learning resumes.
 * Shows snooze button at 5 seconds remaining.
 */
function renderProcrastinationRewardOverlay() {
  // Install persistence guards on first render
  installRewardOverlayPersistence();

  // Check if overlay already exists
  if (document.getElementById("aiki-reward-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "aiki-reward-overlay";
  overlay.setAttribute(
    "style",
    `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483644; display: flex; justify-content: flex-end; align-items: flex-start; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
  );

  const panel = document.createElement("div");
  const isCollapsedKey = "aiki-reward-collapsed";
  let isCollapsed = localStorage.getItem(isCollapsedKey) === "true";

  const getPanelStyle = (collapsed, bg = "linear-gradient(135deg, #ADD8E6, #32CD32)") => `pointer-events: auto; margin: 24px; padding: ${collapsed ? "8px 12px" : "clamp(14px, 2.5vw, 18px)"}; min-width: ${collapsed ? "120px" : "220px"}; max-width: ${collapsed ? "160px" : "280px"}; background: ${bg}; color: #ffffff; border-radius: ${collapsed ? "10px" : "16px"}; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? "4px" : "10px"}; cursor: grab; position: relative; font-size: 13px; transition: all 0.3s ease;`;

  let currentBg = "linear-gradient(135deg, #ADD8E6, #32CD32)";
  panel.setAttribute("style", getPanelStyle(isCollapsed, currentBg));

  // Collapse toggle button
  const collapseBtn = document.createElement("button");
  collapseBtn.textContent = isCollapsed ? "▼" : "▲";
  collapseBtn.setAttribute(
    "style",
    "position: absolute; top: 4px; right: 6px; background: transparent; border: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; font-size: 10px; padding: 4px; transition: color 0.2s;"
  );
  collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.color = "rgba(255, 255, 255, 0.95)"; });
  collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.color = "rgba(255, 255, 255, 0.6)"; });

  const heading = document.createElement("strong");
  heading.textContent = "🎉 Reward time";
  heading.setAttribute("style", `font-size: 0.95em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? "none" : "block"};`);

  const progressLabel = document.createElement("span");
  progressLabel.setAttribute(
    "style",
    `font-size: ${isCollapsed ? "0.9em" : "0.85em"}; color: rgba(255, 255, 255, 0.95); font-weight: ${isCollapsed ? "600" : "400"};`
  );
  progressLabel.textContent = "Syncing...";

  const barShell = document.createElement("div");
  barShell.setAttribute(
    "style",
    `width: 100%; height: ${isCollapsed ? "5px" : "8px"}; border-radius: 999px; background: rgba(255, 255, 255, 0.3); overflow: hidden; transition: height 0.3s ease;`
  );

  const barFill = document.createElement("div");
  barFill.setAttribute(
    "style",
    "width: 0%; height: 100%; border-radius: inherit; background: #ffffff; transition: width 0.4s ease;"
  );
  barShell.appendChild(barFill);

  const status = document.createElement("span");
  status.setAttribute(
    "style",
    `font-size: 0.82em; color: rgba(255, 255, 255, 0.85); display: ${isCollapsed ? "none" : "block"};`
  );
  status.textContent = "Enjoy your break!";

  // Snooze button (hidden initially, shows at 5 seconds remaining)
  const snoozeBtn = document.createElement("button");
  snoozeBtn.textContent = "⏰ +1 Minute";
  snoozeBtn.setAttribute(
    "style",
    "display: none; margin-top: 6px; padding: 10px 16px; background: rgba(255, 255, 255, 0.95); color: #b45309; border: none; border-radius: 10px; font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center;"
  );
  snoozeBtn.addEventListener("mouseenter", () => {
    snoozeBtn.style.transform = "scale(1.02)";
    snoozeBtn.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
  });
  snoozeBtn.addEventListener("mouseleave", () => {
    snoozeBtn.style.transform = "scale(1)";
    snoozeBtn.style.boxShadow = "none";
  });
  snoozeBtn.addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({ type: "controlled:snoozeReward" });
      // Hide button after snooze
      snoozeBtn.style.display = "none";
      status.textContent = "Added 1 minute! Enjoy!";
      currentBg = "linear-gradient(135deg, #22c55e, #14b8a6)";
      panel.style.background = currentBg;
    } catch (e) {
      console.log("[Aiki] Failed to snooze:", e);
    }
  });

  // Collapse/expand toggle handler
  const toggleCollapse = () => {
    isCollapsed = !isCollapsed;
    localStorage.setItem(isCollapsedKey, isCollapsed.toString());
    collapseBtn.textContent = isCollapsed ? "▼" : "▲";
    
    // Store current position before changing styles
    const currentLeft = panel.style.left;
    const currentRight = panel.style.right;
    const currentTop = panel.style.top;
    const currentBottom = panel.style.bottom;
    const currentPosition = panel.style.position;
    const currentTransform = panel.style.transform;
    
    // Update the style
    panel.setAttribute("style", getPanelStyle(isCollapsed, currentBg));
    
    // Restore positioning properties
    if (currentPosition) panel.style.position = currentPosition;
    if (currentLeft) panel.style.left = currentLeft;
    if (currentRight) panel.style.right = currentRight;
    if (currentTop) panel.style.top = currentTop;
    if (currentBottom) panel.style.bottom = currentBottom;
    if (currentTransform) panel.style.transform = currentTransform;
    
    heading.style.display = isCollapsed ? "none" : "block";
    status.style.display = isCollapsed ? "none" : "block";
    barShell.style.height = isCollapsed ? "5px" : "8px";
    progressLabel.style.fontSize = isCollapsed ? "0.9em" : "0.85em";
    progressLabel.style.fontWeight = isCollapsed ? "600" : "400";
    
    // Hide snooze button when collapsed
    if (isCollapsed && snoozeBtn.style.display !== "none") {
      snoozeBtn.dataset.wasVisible = "true";
      snoozeBtn.style.display = "none";
    } else if (!isCollapsed && snoozeBtn.dataset.wasVisible === "true") {
      snoozeBtn.style.display = "block";
    }
    
    // Sync the intended position after size change
    setTimeout(() => {
      if (dragHandle && dragHandle.syncIntendedPosition) {
        dragHandle.syncIntendedPosition();
      }
    }, 300);
  };
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCollapse();
  });

  panel.appendChild(collapseBtn);
  panel.appendChild(heading);
  panel.appendChild(progressLabel);
  panel.appendChild(barShell);
  panel.appendChild(status);
  panel.appendChild(snoozeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Use shared drag utility
  const dragHandle = makeDraggable(panel);

  let cleanupCalled = false;
  let warningShown = false;

  const update = (msg) => {
    if (!msg) return;
    const goal = typeof msg.sessionRewardGoal === "number" ? msg.sessionRewardGoal : 0;
    const remaining = typeof msg.sessionRewardRemaining === "number" ? msg.sessionRewardRemaining : 0;

    if (goal <= 0) {
      cleanup();
      return;
    }

    if (!document.getElementById("aiki-reward-overlay")) {
      console.log("[Aiki] Reward overlay missing from DOM, re-rendering...");
      cleanup();
      renderProcrastinationRewardOverlay();
      return;
    }

    const progress = Math.max(0, goal - remaining);
    const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

    barFill.style.width = `${percent}%`;
    progressLabel.textContent = `${formatDuration(remaining)} remaining`;

    if (remaining <= 5000 && remaining > 0) {
      if (!warningShown) {
        warningShown = true;
        snoozeBtn.style.display = "block";
        panel.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
        heading.textContent = "⚠️ Time's almost up!";
      }
      status.textContent = `Returning to learning in ${Math.ceil(remaining / 1000)} seconds...`;
    } else if (remaining <= 0) {
      status.textContent = "Reward time over! Returning to learning...";
      panel.style.background = "linear-gradient(135deg, #6366f1, #8b5cf6)";
      snoozeBtn.style.display = "none";
    } else if (remaining < 30000) {
      status.textContent = "Almost time to learn again!";
      if (remaining > 5000) {
        warningShown = false;
        snoozeBtn.style.display = "none";
        heading.textContent = "🎉 Reward time";
        panel.style.background = "linear-gradient(135deg, #ADD8E6, #32CD32)";
      }
    } else {
      status.textContent = "Enjoy your break!";
      warningShown = false;
      snoozeBtn.style.display = "none";
      heading.textContent = "🎉 Reward time";
      panel.style.background = "linear-gradient(135deg, #ADD8E6, #32CD32)";
    }
  };

  // Use shared timer port utility
  const timerPort = createTimerPort(update);

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    dragHandle.cleanup();
    timerPort.cleanup();
    try { overlay.remove(); } catch (_) { }
  };

  overlay.cleanup = cleanup;
  window.addEventListener("beforeunload", cleanup, { once: true });
}

// Export for potential use from background
if (typeof window !== "undefined") {
  window.renderProcrastinationRewardOverlay = renderProcrastinationRewardOverlay;
}


// Check if we're in reward mode when content script loads
// This ensures the overlay persists across navigations
(async () => {
  try {
    // Small delay to ensure page is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check with background if we're in reward mode
    const data = await browser.runtime.sendMessage({ type: "timer:get" });
    if (data && data.sessionRewardGoal > 0) {
      // Get time wasting site list
      const result = await browser.storage.local.get("list");
      const timeWastingList = result?.list || [];
      const timeWastingHosts = timeWastingList.map(item => item?.host || item?.name || "").filter(Boolean);

      // Check if we're on a time wasting site
      const currentHost = location.hostname.replace(/^www\./, "");
      const isOnTimeWastingSite = timeWastingHosts.some(host => {
        const normalizedHost = host.replace(/^www\./, "");
        return currentHost === normalizedHost ||
          currentHost.endsWith("." + normalizedHost) ||
          normalizedHost.endsWith("." + currentHost);
      });

      // If in reward mode and on a time wasting site, show overlay
      if (isOnTimeWastingSite) {
        console.log("[Aiki] Auto-restoring reward overlay on page load");
        renderProcrastinationRewardOverlay();
      }
    }
  } catch (e) {
    console.log("[Aiki] Failed to bootstrap reward overlay:", e.message || e);
  }
})();

