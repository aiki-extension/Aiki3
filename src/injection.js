import browser from "webextension-polyfill";

import { createOverlayPersistence } from "./injection/modules/persistence";
import {
  STYLES,
  createTimerPort,
  formatDuration,
  makeDraggable,
  matchesHost,
  matchesProcrastinationHost,
  removeOverlay,
  removeRewardOverlay,
} from "./injection/modules/uiUtils";
import { createRedirectPromptOverlay } from "./injection/overlays/redirectPromptOverlay";
import { createLearningOverlay } from "./injection/overlays/learningOverlay";
import { createBlockerOverlay } from "./injection/overlays/blockerOverlay";
import { createRewardOverlay } from "./injection/overlays/rewardOverlay";

const { registerPersistenceCallback } = createOverlayPersistence();

let renderLearningContent = () => Promise.resolve({ action: "end injection" });
let renderProcrastinationRewardOverlay = () => { };

let learningEnsureTimeout = null;
const requestLearningOverlayAllowance = async () => {
  try {
    const response = await browser.runtime.sendMessage({ type: "learning:autoStart" });
    if (response && typeof response === "object") {
      return response.allowed === true;
    }
    return response === true;
  } catch (_) {
    return false;
  }
};

const scheduleLearningEnsure = () => {
  if (learningEnsureTimeout) return;
  learningEnsureTimeout = setTimeout(async () => {
    learningEnsureTimeout = null;
    if (document.getElementById("aiki-overlay")) return;
    const result = await browser.storage.local.get("learningUri");
    const learningUri = result?.learningUri?.trim?.() || "";
    if (!learningUri || !matchesHost(learningUri)) return;
    const shouldShow = await requestLearningOverlayAllowance();
    if (!shouldShow) return;
    renderLearningContent().catch(() => { });
  }, 120);
};

let bootstrapAttemptPending = false;

async function bootstrapLearningOverlayIfNeeded() {
  if (bootstrapAttemptPending) return;
  bootstrapAttemptPending = true;
  try {
    const result = await browser.storage.local.get("learningUri");
    const learningUri = result?.learningUri?.trim?.() || "";
    if (!learningUri || !matchesHost(learningUri)) {
      return;
    }
    const shouldShow = await requestLearningOverlayAllowance();
    if (!shouldShow) return;
    await renderLearningContent();
  } catch (_) {
  } finally {
    bootstrapAttemptPending = false;
  }
}

// Reward overlay persistence
let rewardEnsureTimeout = null;
const scheduleRewardEnsure = async () => {
  if (rewardEnsureTimeout) return;
  rewardEnsureTimeout = setTimeout(async () => {
    rewardEnsureTimeout = null;
    try {
      const data = await browser.runtime.sendMessage({ type: "timer:get" });
      if (data?.controlledRewardGoal > 0 && !document.getElementById("aiki-reward-overlay")) {
        const result = await browser.storage.local.get("list");
        const procHosts = (result?.list || []).map(item => item?.host || item?.name || "").filter(Boolean);
        if (matchesProcrastinationHost(procHosts)) {
          renderProcrastinationRewardOverlay();
        }
      }
    } catch (_) { }
  }, 120);
};

async function bootstrapRewardOverlayIfNeeded() {
  try {
    const timerData = await browser.runtime.sendMessage({ type: "timer:get" });
    // Check for both controlled variant reward AND experimental variant reward
    const hasControlledReward = timerData?.controlledRewardGoal > 0;
    const hasExperimentalReward = timerData?.rewardUnlockAt > Date.now();

    if (hasControlledReward || hasExperimentalReward) {
      const result = await browser.storage.local.get("list");
      const procHosts = (result?.list || []).map(item => item?.host || item?.name || "").filter(Boolean);
      if (matchesProcrastinationHost(procHosts)) {
        setTimeout(() => {
          if (!document.getElementById("aiki-reward-overlay")) {
            renderProcrastinationRewardOverlay();
          }
        }, 50);
      }
    }
  } catch (_) { }
}

renderProcrastinationRewardOverlay = createRewardOverlay({
  registerPersistenceCallback,
  scheduleRewardEnsure,
  makeDraggable,
  createTimerPort,
  formatDuration,
});

const renderRedirectPrompt = createRedirectPromptOverlay({
  STYLES,
  removeOverlay,
  renderProcrastinationRewardOverlay,
});

renderLearningContent = createLearningOverlay({
  registerPersistenceCallback,
  scheduleLearningEnsure,
  removeOverlay,
  makeDraggable,
  createTimerPort,
  formatDuration,
});

const renderContentBlocker = createBlockerOverlay({
  removeOverlay,
  createTimerPort,
  formatDuration,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapLearningOverlayIfNeeded, { once: true });
} else {
  bootstrapLearningOverlayIfNeeded();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapRewardOverlayIfNeeded, { once: true });
} else {
  bootstrapRewardOverlayIfNeeded();
}

/* Listener for messages from background script. */
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "display: redirectPrompt") {
    return renderRedirectPrompt(request.originUrl);
  } else if (request.action === "display: encouragement") {
    return renderLearningContent(request.shouldShowWelcome);
  } else if (request.action === "display: rewardOverlay") {
    renderProcrastinationRewardOverlay();
    return Promise.resolve({ action: "reward overlay shown" });
  } else if (request.action === "kill aiki") {
    removeOverlay();
    removeRewardOverlay();
    return Promise.resolve({ action: "end injection" });
  } else if (request.action === "inject blocker") {
    renderContentBlocker();
    return Promise.resolve({ action: "blocker injected" });
  } else if (request.action === "remove blocker") {
    removeOverlay();
    return Promise.resolve({ action: "blocker removed" });
  }
});
