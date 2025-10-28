import browser from "webextension-polyfill";

const l = console.log;

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
      `position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 2147483646;`
    );

    const card = document.createElement("div");
    card.setAttribute(
      "style",
      `background: #ffffff; color: #111827; min-width: 320px; max-width: 360px; padding: 24px; border-radius: 16px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 16px; text-align: left;`
    );

    const title = document.createElement("h2");
    title.textContent = "Redirect to learning?";
    title.setAttribute("style", "margin: 0; font-size: 1.2rem; font-weight: 600;");

    let host = "";
    try {
      host = originUrl ? new URL(originUrl).hostname : "";
    } catch (_) {}

    const description = document.createElement("p");
    description.textContent = host
      ? `You're visiting ${host}. Switch to your learning platform?`
      : "You've reached a focus site. Do you want to jump to your learning platform?";
    description.setAttribute(
      "style",
      "margin: 0; font-size: 0.95rem; line-height: 1.4; color: #4b5563;"
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
      `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
    );
    continueButton.onmouseenter = () =>
      continueButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
      );
    continueButton.onmouseleave = () =>
      continueButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
      );

    const redirectButton = document.createElement("button");
    redirectButton.textContent = "Redirect";
    redirectButton.setAttribute(
      "style",
      `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease;`
    );
    redirectButton.onmouseenter = () =>
      redirectButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #1d4ed8, #5b21b6); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(29, 78, 216, 0.32); transform: translateY(-1px); transition: transform 0.15s ease, box-shadow 0.15s ease;`
      );
    redirectButton.onmouseleave = () =>
      redirectButton.setAttribute(
        "style",
        `flex: 1; padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease;`
      );

    const finalize = (action) => {
      if (done) return;
      done = true;
      try {
        removeOverlay();
      } catch (_) {}
      resolve({ action });
    };

    continueButton.addEventListener("click", () => finalize("continue"));
    redirectButton.addEventListener("click", () => finalize("redirect"));

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
      `position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483645; display: flex; justify-content: flex-end; align-items: flex-end;`
    );

    const panel = document.createElement("div");
    panel.setAttribute(
      "style",
      `pointer-events: auto; margin: 24px; padding: 18px 20px; min-width: 260px; background: rgba(15, 23, 42, 0.92); color: #f9fafb; border-radius: 14px; box-shadow: 0 18px 35px rgba(15, 23, 42, 0.35); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 12px; cursor: grab; position: relative;`
    );

    const heading = document.createElement("strong");
    heading.textContent = "Learning progress";
    heading.setAttribute("style", "font-size: 0.95rem; letter-spacing: 0.01em;");

    const progressLabel = document.createElement("span");
    progressLabel.setAttribute(
      "style",
      "font-size: 0.85rem; color: rgba(226, 232, 240, 0.85);"
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
      "font-size: 0.82rem; color: rgba(226, 232, 240, 0.75);"
    );
    status.textContent = "Stay focused here to earn your time.";

    panel.appendChild(heading);
    panel.appendChild(progressLabel);
    panel.appendChild(barShell);
    panel.appendChild(status);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

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
    `position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: 24px;`
  );

  const card = document.createElement("div");
  card.setAttribute(
    "style",
    `width: min(420px, 90%); border-radius: 18px; background: rgba(15, 23, 42, 0.92); color: #f9fafb; box-shadow: 0 24px 55px rgba(15, 23, 42, 0.45); display: flex; flex-direction: column; gap: 16px; padding: 24px; font-family: 'Inter', 'Segoe UI', sans-serif;`
  );

  const title = document.createElement("h2");
  title.textContent = "Keep learning";
  title.setAttribute("style", "margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: 0.01em;");

  const description = document.createElement("p");
  description.textContent = "You're mid-session. Head back to your focus site to keep building momentum.";
  description.setAttribute("style", "margin: 0; font-size: 0.95rem; line-height: 1.5; opacity: 0.85;");

  const progressLabel = document.createElement("span");
  progressLabel.setAttribute("style", "font-size: 0.9rem; opacity: 0.8;");
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
  status.setAttribute("style", "font-size: 0.85rem; opacity: 0.75;");
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
