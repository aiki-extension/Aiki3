import browser from "webextension-polyfill";

const l = console.log;
let overlayGuardsInstalled = false;
let overlayEnsureTimeout = null;

const scheduleOverlayEnsure = () => {
  if (overlayEnsureTimeout) return;
  overlayEnsureTimeout = setTimeout(() => {
    overlayEnsureTimeout = null;
    if (!document.getElementById("aiki-overlay")) {
      renderLearningContent().catch(() => {});
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
    } catch (_) {}
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
    const result = await browser.storage.local.get("learningUri");
    const learningUri =
      result && typeof result.learningUri === "string" ? result.learningUri.trim() : "";
    if (!learningUri || !matchesLearningHost(learningUri)) {
      bootstrapAttemptPending = false;
      return;
    }
    try {
      await browser.runtime.sendMessage({ type: "learning:autoStart" });
    } catch (_) {}
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

/* Listener for messages from background script. */
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "display: redirectPrompt") {
    return renderRedirectPrompt(request.url, request.originUrl);
  } else if (request.action === "display: encouragement") {
    return renderLearningContent(request.shouldShowWelcome);
  } else if (request.action === "kill aiki") {
    removeOverlay();
    return Promise.resolve({ action: "end injection" });
  } else if (request.action === "inject blocker") {
    console.log("Request: ", request);
    l("Render blocking function should fire now");
    renderContentBlocker();
  } else if (request.action === "remove blocker") {
    removeOverlay();
  }
});

/**
 * @function
 * @description Removes the aiki interception overlay
 * by searching for DOM elements with the name "aiki-overlay" and calling remove() on it/them.  */
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
      } catch (_) {}
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
          } catch (_) {}
          el.remove();
        }
      }
    }
  } catch (error) {
    // console.log(error);
  }
}

function renderRedirectPrompt(url, originUrl) {
  return new Promise((resolve) => {
    let done = false;
    try {
      removeOverlay();
    } catch (_) {}

    const overlay = document.createElement("div");
    overlay.id = "aiki-overlay";
    overlay.className = "aiki-overlay";
    overlay.setAttribute(
      "style",
      `all: initial; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.98); display: flex; align-items: center; justify-content: center; z-index: 2147483646; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
    );

    const card = document.createElement("div");
    card.setAttribute(
      "style",
      `background: #ffffff; color: #0f172a; width: min(320px, 92vw); padding: clamp(16px, 3vw, 24px); border-radius: 18px; box-shadow: 0 28px 55px rgba(15, 23, 42, 0.35); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 18px; text-align: left; font-size: 14px;`
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
    continueButton.setAttribute(
      "style",
      `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
    );
    continueButton.onmouseenter = () =>
      continueButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
      );
    continueButton.onmouseleave = () =>
      continueButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
      );

    const redirectButton = document.createElement("button");
    redirectButton.textContent = "Redirect";
    redirectButton.setAttribute(
      "style",
      `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
    );
    redirectButton.onmouseenter = () =>
      redirectButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #1d4ed8, #5b21b6); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(29, 78, 216, 0.32); transform: translateY(-1px); transition: transform 0.15s ease, box-shadow 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
      );
    redirectButton.onmouseleave = () =>
      redirectButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease; display: flex; justify-content: center; align-items: center; text-align: center;`
      );

    const finalize = (action) => {
      if (done) return;
      done = true;
      if (action !== "redirect") {
        try {
          removeOverlay();
        } catch (_) {}
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
    } catch (_) {}

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
      resolve({ action: "continue" });
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
    } catch (_) {}

    const overlay = document.createElement("div");
    overlay.id = "aiki-overlay";
    overlay.className = "aiki-overlay";
    overlay.setAttribute(
      "style",
      `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483645; display: flex; justify-content: flex-end; align-items: flex-end; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
    );

    const panel = document.createElement("div");
    panel.setAttribute(
      "style",
      `pointer-events: auto; margin: 24px; padding: clamp(16px, 3vw, 22px); min-width: 260px; max-width: 320px; background: rgba(15, 23, 42, 0.96); color: #f8fafc; border-radius: 18px; box-shadow: 0 24px 45px rgba(15, 23, 42, 0.45); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 12px; cursor: grab; position: relative; font-size: 14px;`
    );

    const heading = document.createElement("strong");
    heading.textContent = "Learning progress";
    heading.setAttribute("style", "font-size: 1em; letter-spacing: 0.01em; font-weight: 600;");

    const progressLabel = document.createElement("span");
    progressLabel.setAttribute(
      "style",
      "font-size: 0.9em; color: rgba(248, 250, 252, 0.88);"
    );
    progressLabel.textContent = "Getting things ready...";

    const barShell = document.createElement("div");
    barShell.setAttribute(
      "style",
      "width: 100%; height: 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.35); overflow: hidden;"
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
      "font-size: 0.88em; color: rgba(248, 250, 252, 0.78);"
    );
    status.textContent = "Stay focused here to earn your time.";

    panel.appendChild(heading);
    panel.appendChild(progressLabel);
    panel.appendChild(barShell);
    panel.appendChild(status);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    installOverlayPersistence();

    let dragState = {
      dragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };

    const onPointerDown = (event) => {
      dragState.dragging = true;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      panel.style.cursor = "grabbing";
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
      panel.style.transform = `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`;
      event.preventDefault();
    };

    const endDrag = () => {
      dragState.dragging = false;
      panel.style.cursor = "grab";
    };

    panel.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointerleave", endDrag);

    const port = browser.runtime.connect({
      name: "Content Communication",
    });

    try {
      port.postMessage("get: timer");
    } catch (_) {}

    let cleanupCalled = false;
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      panel.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointerleave", endDrag);
      try {
        port.disconnect();
      } catch (_) {}
      try {
        clearInterval(intervalRef);
      } catch (_) {}
      try {
        removeOverlay();
      } catch (_) {}
    };

    port.onDisconnect.addListener(() => {
      cleanup();
    });

    overlay.cleanup = cleanup;
    window.addEventListener("beforeunload", cleanup, { once: true });

    const formatDuration = (value) => {
      if (typeof value !== "number" || value <= 0) return "0m 0s";
      const totalSeconds = Math.floor(value / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    };

    const update = (msg) => {
      if (!msg) return;
      const goal = typeof msg.dailyGoal === "number" ? msg.dailyGoal : 0;
      const progress = Math.min(
        goal,
        typeof msg.dailyProgress === "number" ? msg.dailyProgress : 0
      );
      const remaining = Math.max(goal - progress, 0);
      const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

      barFill.style.width = `${percent}%`;
      progressLabel.textContent =
        goal > 0
          ? `${formatDuration(progress)} / ${formatDuration(goal)}`
          : "No goal set yet";

      if (goal > 0 && remaining === 0) {
        status.textContent = "Daily goal complete! Great work.";
        panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
      } else if (goal > 0) {
        status.textContent = `Stay focused for ${formatDuration(
          remaining
        )} more.`;
      } else {
        status.textContent = "Set a goal in Aiki settings to track progress.";
      }
    };

    port.onMessage.addListener((msg) => update(msg));
    try {
      browser.runtime
        .sendMessage({ type: "timer:get" })
        .then((data) => update(data))
        .catch(() => {});
    } catch (_) {}
    try {
      browser.runtime
        .sendMessage({ type: "timer:get" })
        .then((data) => update(data))
        .catch(() => {});
    } catch (_) {}

    const intervalRef = setInterval(() => {
      try {
        port.postMessage("get: timer");
      } catch (_) {}
    }, 1000);

    update(null);

    resolve({ action: "end injection" });
  });
}

function renderContentBlocker() {
  try {
    removeOverlay();
  } catch (_) {}

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
  actions.setAttribute(
    "style",
    "display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;"
  );

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

  let cleanupCalled = false;
  let intervalRef;
  let port;

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    try {
      if (intervalRef) clearInterval(intervalRef);
    } catch (_) {}
    try {
      if (port) port.disconnect();
    } catch (_) {}
    try {
      overlay.remove();
    } catch (_) {}
  };

  overlay.cleanup = cleanup;

  const formatDuration = (value) => {
    if (typeof value !== "number" || value <= 0) return "0m 0s";
    const totalSeconds = Math.floor(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const update = (msg) => {
    if (!msg) return;
    const goal = typeof msg.dailyGoal === "number" ? msg.dailyGoal : 0;
    const progress = Math.min(goal, typeof msg.dailyProgress === "number" ? msg.dailyProgress : 0);
    const remaining = Math.max(goal - progress, 0);
    const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

    barFill.style.width = `${percent}%`;
    progressLabel.textContent = goal > 0
      ? `${formatDuration(progress)} / ${formatDuration(goal)}`
      : "No learning goal set yet";

    if (goal > 0 && remaining === 0) {
      status.textContent = "Goal complete! Take a well-deserved break.";
    } else if (goal > 0) {
      status.textContent = `Keep going for ${formatDuration(remaining)} more.`;
    } else {
      status.textContent = "Set a goal in settings to track progress.";
    }
  };

  try {
    port = browser.runtime.connect({ name: "Content Communication" });
    port.onDisconnect.addListener(() => cleanup());
    port.onMessage.addListener((msg) => update(msg));
    try {
      browser.runtime
        .sendMessage({ type: "timer:get" })
        .then((data) => update(data))
        .catch(() => {});
    } catch (_) {}
    intervalRef = setInterval(() => {
      try {
        port.postMessage("get: timer");
      } catch (_) {}
    }, 1000);
    try {
      port.postMessage("get: timer");
    } catch (_) {}
  } catch (_) {}

  continueButton.addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({ type: "stats:skip" });
    } catch (_) {}
    try {
      await browser.runtime.sendMessage({ type: "blocker:release" });
    } catch (_) {}
    cleanup();
  });

  button.addEventListener("click", async () => {
    try {
      const result = await browser.storage.local.get("learningUri");
      const uri = result && typeof result.learningUri === "string" ? result.learningUri.trim() : "";
      if (uri) {
        cleanup();
        location.href = uri;
        return;
      }
    } catch (_) {}

    try {
      if (port) {
        port.postMessage("goto: originTab");
      } else {
        const keepAlive = browser.runtime.connect({ name: "Content Communication" });
        keepAlive.postMessage("goto: originTab");
        setTimeout(() => {
          try { keepAlive.disconnect(); } catch (_) {}
        }, 150);
      }
    } catch (_) {}

    cleanup();
  });
}
