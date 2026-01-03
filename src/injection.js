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

/**
 * Bootstrap reward overlay on page load if we're in reward mode.
 * This handles full page reloads on procrastination sites.
 */
async function bootstrapRewardOverlayIfNeeded() {
  try {
    // Query background for current timer state
    const timerData = await browser.runtime.sendMessage({ type: "timer:get" });
    
    // If reward timer is active (goal > 0), render the overlay
    if (timerData && timerData.controlledRewardGoal > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!document.getElementById("aiki-reward-overlay")) {
          renderProcrastinationRewardOverlay();
        }
      }, 50);
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
  if (request.action === "display: redirectPrompt") {
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
    } catch (_) {}
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

    // Claim Reward button for controlled variant (initially hidden)
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
        // Request reward from background
        await browser.runtime.sendMessage({ type: "controlled:claimReward" });
      } catch (e) {
        console.log("[Aiki] Failed to claim reward:", e);
      }
    });

    panel.appendChild(heading);
    panel.appendChild(progressLabel);
    panel.appendChild(barShell);
    panel.appendChild(status);
    panel.appendChild(claimRewardBtn);
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
      
      // Check for controlled variant
      const isControlledVariant = msg.isControlledVariant === true;
      const controlledState = msg.controlledState;
      
      // Default panel background (reset from green)
      const defaultBg = "rgba(15, 23, 42, 0.96)";
      
      if (isControlledVariant) {
        // CONTROLLED VARIANT
        if (controlledState === "learning") {
          // LEARNING state: show session-based timer
          const goal = msg.controlledLearningGoal || 0;
          const remaining = typeof msg.controlledLearningRemaining === "number" ? msg.controlledLearningRemaining : 0;
          const elapsed = typeof msg.controlledLearningElapsed === "number" ? msg.controlledLearningElapsed : 0;
          const completed = msg.controlledLearningCompleted || false;
          const progress = Math.max(0, goal - remaining);
          const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;
          
          barFill.style.width = `${percent}%`;
          barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
          heading.textContent = "📚 Learning Session";
          panel.style.background = defaultBg;
          claimRewardBtn.style.display = "none";
          
          // Check if goal is reached (completed or remaining <= 0)
          if (goal > 0 && (remaining <= 0 || completed)) {
            // Show elapsed time / goal (e.g., "1m 40s / 1m 0s")
            progressLabel.textContent = `${formatDuration(elapsed)} / ${formatDuration(goal)}`;
            status.textContent = "Session complete! Claim your reward.";
            panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
            claimRewardBtn.style.display = "block";
          } else if (goal > 0) {
            progressLabel.textContent = `${formatDuration(progress)} / ${formatDuration(goal)}`;
            status.textContent = `Stay focused for ${formatDuration(remaining)} more.`;
          } else {
            progressLabel.textContent = "Starting...";
            status.textContent = "Session starting...";
          }
        } else if (controlledState === "reward") {
          // REWARD state: show procrastination/reward timer
          const goal = msg.controlledRewardGoal || 0;
          const remaining = typeof msg.controlledRewardRemaining === "number" ? msg.controlledRewardRemaining : 0;
          const progress = Math.max(0, goal - remaining);
          const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;
          
          barFill.style.width = `${percent}%`;
          barFill.style.background = "linear-gradient(135deg, #f59e0b, #f97316)";
          progressLabel.textContent = goal > 0 ? `${formatDuration(progress)} / ${formatDuration(goal)}` : "Enjoy!";
          heading.textContent = "🎉 Reward Time";
          status.textContent = goal > 0 ? `Enjoy! ${formatDuration(remaining)} remaining.` : "Your reward time!";
          panel.style.background = "linear-gradient(135deg, #f59e0b80, #f9731680)";
          claimRewardBtn.style.display = "none";
        } else {
          // IDLE state for controlled variant
          heading.textContent = "📚 Aiki Learning";
          progressLabel.textContent = "Ready to learn";
          barFill.style.width = "0%";
          barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
          status.textContent = "Visit a procrastination site to start a learning session.";
          panel.style.background = defaultBg;
          claimRewardBtn.style.display = "none";
        }
      } else {
        // Experimental variant or IDLE: show daily progress
        const goal = typeof msg.dailyGoal === "number" ? msg.dailyGoal : 0;
        const progress = Math.min(
          goal,
          typeof msg.dailyProgress === "number" ? msg.dailyProgress : 0
        );
        const remaining = Math.max(goal - progress, 0);
        const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

        barFill.style.width = `${percent}%`;
        barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
        progressLabel.textContent =
          goal > 0
            ? `${formatDuration(progress)} / ${formatDuration(goal)}`
            : "No goal set yet";
        heading.textContent = "Learning progress";
        claimRewardBtn.style.display = "none";
        panel.style.background = defaultBg;

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

// ============================================
// Reward Overlay Persistence Guards
// ============================================

let rewardOverlayGuardsInstalled = false;
let rewardOverlayEnsureTimeout = null;

const scheduleRewardOverlayEnsure = () => {
  if (rewardOverlayEnsureTimeout) return;
  rewardOverlayEnsureTimeout = setTimeout(() => {
    rewardOverlayEnsureTimeout = null;
    // Only re-render if overlay is missing but should exist
    // Check with background if we're in reward mode
    browser.runtime.sendMessage({ type: "timer:get" })
      .then((data) => {
        if (data && data.controlledRewardGoal > 0 && !document.getElementById("aiki-reward-overlay")) {
          renderProcrastinationRewardOverlay();
        }
      })
      .catch(() => {});
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
    } catch (_) {}
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
 * Render a reward time overlay for controlled variant on procrastination sites.
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
  panel.setAttribute(
    "style",
    `pointer-events: auto; margin: 24px; padding: clamp(14px, 2.5vw, 18px); min-width: 220px; max-width: 280px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(245, 158, 11, 0.35); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 10px; cursor: grab; position: relative; font-size: 13px;`
  );

  const heading = document.createElement("strong");
  heading.textContent = "🎉 Reward time";
  heading.setAttribute("style", "font-size: 0.95em; letter-spacing: 0.01em; font-weight: 600;");

  const progressLabel = document.createElement("span");
  progressLabel.setAttribute(
    "style",
    "font-size: 0.85em; color: rgba(255, 255, 255, 0.92);"
  );
  progressLabel.textContent = "Syncing...";

  const barShell = document.createElement("div");
  barShell.setAttribute(
    "style",
    "width: 100%; height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.3); overflow: hidden;"
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
    "font-size: 0.82em; color: rgba(255, 255, 255, 0.85);"
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
      panel.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
    } catch (e) {
      console.log("[Aiki] Failed to snooze:", e);
    }
  });

  panel.appendChild(heading);
  panel.appendChild(progressLabel);
  panel.appendChild(barShell);
  panel.appendChild(status);
  panel.appendChild(snoozeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Make panel draggable
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

  let port;
  let intervalRef;
  let cleanupCalled = false;
  let warningShown = false;

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    panel.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointerleave", endDrag);
    try { if (port) port.disconnect(); } catch (_) {}
    try { if (intervalRef) clearInterval(intervalRef); } catch (_) {}
    try { overlay.remove(); } catch (_) {}
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
    
    const goal = typeof msg.controlledRewardGoal === "number" ? msg.controlledRewardGoal : 0;
    const remaining = typeof msg.controlledRewardRemaining === "number" ? msg.controlledRewardRemaining : 0;
    
    if (goal <= 0) {
      // No reward timer active, remove overlay
      cleanup();
      return;
    }
    
    // Check if overlay was removed from DOM (e.g., during SPA navigation)
    // If reward is still active but overlay is gone, re-render it
    if (!document.getElementById("aiki-reward-overlay")) {
      console.log("[Aiki] Reward overlay missing from DOM, re-rendering...");
      cleanup(); // Clean up old references
      renderProcrastinationRewardOverlay(); // Re-render
      return;
    }
    
    const progress = Math.max(0, goal - remaining);
    const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;
    
    barFill.style.width = `${percent}%`;
    progressLabel.textContent = `${formatDuration(remaining)} remaining`;
    
    // Show snooze button at 5 seconds or less (but > 0)
    if (remaining <= 5000 && remaining > 0) {
      if (!warningShown) {
        warningShown = true;
        snoozeBtn.style.display = "block";
        panel.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
        panel.style.boxShadow = "0 20px 40px rgba(220, 38, 38, 0.5)";
        heading.textContent = "⚠️ Time's almost up!";
      }
      status.textContent = `Returning to learning in ${Math.ceil(remaining / 1000)} seconds...`;
    } else if (remaining <= 0) {
      status.textContent = "Reward time over! Returning to learning...";
      panel.style.background = "linear-gradient(135deg, #6366f1, #8b5cf6)";
      snoozeBtn.style.display = "none";
    } else if (remaining < 30000) {
      status.textContent = "Almost time to learn again!";
      // Reset warning state if timer was extended
      if (remaining > 5000) {
        warningShown = false;
        snoozeBtn.style.display = "none";
        heading.textContent = "🎉 Reward time";
        panel.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
        panel.style.boxShadow = "0 20px 40px rgba(245, 158, 11, 0.35)";
      }
    } else {
      status.textContent = "Enjoy your break!";
      warningShown = false;
      snoozeBtn.style.display = "none";
      heading.textContent = "🎉 Reward time";
      panel.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
      panel.style.boxShadow = "0 20px 40px rgba(245, 158, 11, 0.35)";
    }
  };

  try {
    port = browser.runtime.connect({ name: "Content Communication" });
    port.onDisconnect.addListener(() => cleanup());
    port.onMessage.addListener((msg) => update(msg));
    
    browser.runtime
      .sendMessage({ type: "timer:get" })
      .then((data) => update(data))
      .catch(() => {});
    
    intervalRef = setInterval(() => {
      try {
        port.postMessage("get: timer");
      } catch (_) {}
    }, 1000);
    
    try {
      port.postMessage("get: timer");
    } catch (_) {}
  } catch (_) {}

  window.addEventListener("beforeunload", cleanup, { once: true });
}

// Export for potential use from background
if (typeof window !== "undefined") {
  window.renderProcrastinationRewardOverlay = renderProcrastinationRewardOverlay;
}

