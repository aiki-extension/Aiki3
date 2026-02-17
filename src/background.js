import browser from "webextension-polyfill";
import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./services/TimerManager";
import { setTheme } from "./util/themes";
import badge from "./badge";
import { logAuditEvent, saveUserPreferences } from "./util/logger";
import interventionEngine from "./interventionEngine";

// Manifest V3: No DOM access, no stray variables
let lastKnownRedirectionToggle = null;
let redirectionToggleTransition = Promise.resolve();

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    installationSetup();
  }
});

function buildTimerPayload(timeData) {
  const controlledState = interventionEngine.getState();
  if (controlledState.state === "idle") {
    return { ...timeData, isControlledVariant: false };
  }

  return {
    ...timeData,
    isControlledVariant: true,
    controlledState: controlledState.state,
    controlledProcrastinationUrl: controlledState.procrastinationUrl || "",
    controlledLearningRemaining:
      controlledState.state === "learning" ? controlledState.remainingMs : 0,
    controlledLearningGoal:
      controlledState.state === "learning" ? controlledState.goalMs : 0,
    controlledLearningElapsed:
      controlledState.state === "learning" ? controlledState.elapsedMs : 0,
    controlledLearningCompleted:
      controlledState.state === "learning" ? controlledState.completed : false,
    controlledRewardRemaining:
      controlledState.state === "reward" ? controlledState.remainingMs : 0,
    controlledRewardGoal:
      controlledState.state === "reward" ? controlledState.goalMs : 0,
  };
}

async function isWithinOperatingHours() {
  const [fromTime, toTime] = await Promise.all([
    storage.operatingHours.from.get(),
    storage.operatingHours.to.get(),
  ]);
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = (Number(fromTime?.hrs) || 0) * 60 + (Number(fromTime?.min) || 0);
  const endMinutes = (Number(toTime?.hrs) || 0) * 60 + (Number(toTime?.min) || 0);

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "timer:get") {
    return (async () => {
      try {
        await timer.sync({ restoreState: false });
      } catch (_) { }

      const timeData = timer.getTime();
      return buildTimerPayload(timeData);
    })();
  }


  if (message.type === "learning:autoStart") {

    return (async () => {
      const isEnabled = await storage.redirection.get();
      const isInHours = await isWithinOperatingHours();
      if (!isEnabled || !isInHours) {
        if (timer.isLearningSessionActive()) {
          timer.stopLearningSession();
        }
        return { allowed: false, started: false };
      }

      try {
        if (!timer.isLearningSessionActive()) {
          await timer.startLearningSession();
          return { allowed: true, started: true };
        }
      } catch (_) { }
      return { allowed: true, started: false };
    })();
  }

  if (message.type === "reward:expired") {
    return (async () => {
      try {
        const isEnabled = await storage.redirection.get();
        if (isEnabled) {
          await redirection.checkActiveTab({ ignorePromptCooldown: true });
        }
      } catch (_) { }
      return true;
    })();
  }

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    return (async () => {
      try {
        await redirection.handleBlockerRelease(sender.tab.id, sender.tab.url || "");
      } catch (_) {
        // Fallback cleanup to preserve previous behavior if reward flow fails.
        storage.blockedTabs.remove(sender.tab.id);
        storage.blockedOrigins.remove(sender.tab.id);
      }
      return true;
    })();
  }


  // Handle claim reward for controlled variant
  if (message.type === "controlled:claimReward" && sender && sender.tab) {
    return (async () => {
      try {
        await interventionEngine.claimReward(sender.tab.id);
      } catch (e) {
        console.log("[Background] Failed to claim reward:", e);
      }
      return true;
    })();
  }

  if (message.type === "controlled:snoozeReward") {
    return (async () => {
      try {
        const success = interventionEngine.snoozeReward();
        console.log("[Background] Snooze reward result:", success);
      } catch (e) {
        console.log("[Background] Failed to snooze reward:", e);
      }
      return true;
    })();
  }
});

async function installationSetup() {
  await storage.clearStorage();
  storage.stats.init();
  storage.operatingHours.init();
  setTheme("dark");
  storage.shouldRedirect.set(true);
  await storage.redirection.set(true);
  storage.list.set([]);
  storage.uid.set("");
  // Leave learning URL empty by default; user sets this in settings
  storage.learningUri.set("");
  storage.timeSettings.init();
  try {
    await browser.runtime.openOptionsPage();
  } catch (e) {
    // Fallback if polyfill is unavailable
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }
}

async function setup() {
  intervals.intervalSetup();
  const shouldRedirect = await storage.shouldRedirect.get();
  if (typeof shouldRedirect !== "boolean") {
    await storage.shouldRedirect.set(true);
  }
  await redirection.start();

  await interventionEngine.init();
  try {
    lastKnownRedirectionToggle = await storage.redirection.get();
  } catch (_) {
    lastKnownRedirectionToggle = null;
  }
  console.log("[Background] Intervention engine initialized");
}

async function killAiki() {
  lastKnownRedirectionToggle = false;

  // FIRST: Finalize all active sessions before stopping anything
  // This ensures we capture the exact duration up to the disable moment
  try {
    await redirection.finalizeAllActiveSessions("extension_disabled");
    console.log("[Background] Finalized all active sessions on extension disable");
  } catch (e) {
    console.warn("[Background] Failed to finalize sessions on disable:", e);
  }

  try {
    await interventionEngine.cleanup();
    console.log("[Background] Intervention engine cleaned up on extension disable");
  } catch (e) {
    console.warn("[Background] Failed to cleanup intervention engine:", e);
  }

  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs.map((tab) => {
      if (tab?.id === undefined) return Promise.resolve();
      return browser.tabs.sendMessage(tab.id, { action: "kill aiki" }).catch(() => { });
    })
  );
  timer.stopLearningSession();
  timer.stopBonusTime();
  timer.killAiki();
  badge.remove();
  const user = await storage.uid.get();
  await logAuditEvent({
    participantId: user,
    action: "toggle_redirection",
    settingName: "redirection",
    oldValue: "on",
    newValue: "off",
    participantUpdates: { is_extension_active: false },
  });
  try {
    await saveUserPreferences({ participantId: user, is_active: false });
  } catch (_) { }
}

async function reviveAiki() {
  lastKnownRedirectionToggle = true;
  redirection.checkActiveTab();
  const user = await storage.uid.get();
  await logAuditEvent({
    participantId: user,
    action: "toggle_redirection",
    settingName: "redirection",
    oldValue: "off",
    newValue: "on",
    participantUpdates: { is_extension_active: true },
  });
  try {
    await saveUserPreferences({ participantId: user, is_active: true });
  } catch (_) { }
}

async function gotoOriginTab() {
  const origin = await storage.origin.get();
  try {
    await browser.tabs.update(origin.tabId, { active: true });
  } catch (_) { }
}

function parsePortMessage(msg) {
  if (typeof msg !== "string") return null;
  const raw = msg.trim();
  if (!raw) return null;

  const segments = raw
    .split(":")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) return null;

  return {
    raw,
    command: segments[0].toLowerCase(),
    topic: (segments[1] || "").toLowerCase(),
    detail: segments.slice(2).join(": ").trim().toLowerCase(),
    segments,
  };
}

// Manifest V3: Use runtime.onConnect for port messaging
browser.runtime.onConnect.addListener(function (port) {
  let isDisconnected = false;
  port.onDisconnect.addListener(() => {
    isDisconnected = true;
  });
  port.onMessage.addListener(function (msg) {
    const parsed = parsePortMessage(msg);
    if (!parsed) {
      console.warn("[Aiki Debug] Ignoring malformed port message:", msg);
      return;
    }

    const messageType = parsed.topic || parsed.command;
    console.log("[Aiki Debug] Port message received:", msg, "parsed as:", messageType);

    switch (messageType) {
      case "user":
        intervals.logger.restart();
        break;
      case "list":
        intervals.counter.restart();
        redirection.navigationListener.restart();
        redirection.checkActiveTab();
        break;
      case "origin": {
        const action = parsed.detail;
        console.log("[Aiki Debug] Background received origin message:", { msg, action, segments: parsed.segments });
        (async () => {
          let tabId = port.sender?.tab?.id;
          if (tabId === undefined) {
            try {
              const [activeTab] = await browser.tabs.query({
                active: true,
                currentWindow: true,
              });
              tabId = activeTab?.id;
            } catch (_) { }
          }
          console.log("[Aiki Debug] Calling redirection.gotoOrigin with:", { action, tabId, type: "popup" });
          await redirection.gotoOrigin(action, {
            type: "popup",
            tabId,
            restoreAll: action === "skip",
          });
          redirection.removeLearningSiteLoadedListener();
        })();
        break;
      }
      case "timer":
        (async () => {
          try {
            await timer.sync({ restoreState: false });
          } catch (_) { }
          if (isDisconnected) return;
          try {
            const timeData = timer.getTime();
            port.postMessage(buildTimerPayload(timeData));
          } catch (error) {
            // Port might have been disconnected between sync and post
          }
        })();
        break;
      case "off":
        storage.redirection.set(false).catch(() => { });
        break;
      case "on":
        storage.redirection.set(true).catch(() => { });
        break;
      case "origintab":
        gotoOriginTab();
        break;
    }
  });
});

// Run setup on service worker start
setup();

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;

  if (changes.toggled) {
    const oldValue = changes.toggled.oldValue;
    const newValue = changes.toggled.newValue;
    if (typeof newValue === "boolean") {
      if (typeof oldValue !== "boolean") {
        lastKnownRedirectionToggle = newValue;
      } else if (newValue !== oldValue && lastKnownRedirectionToggle !== newValue) {
        lastKnownRedirectionToggle = newValue;
        redirectionToggleTransition = redirectionToggleTransition
          .then(() => (newValue ? reviveAiki() : killAiki()))
          .catch((e) => {
            console.warn("[Background] Failed to apply redirection toggle change:", e);
          });
        await redirectionToggleTransition;
      }
    }
  }

  if (changes.list) {
    try {
      intervals.counter.restart();
      await redirection.navigationListener.restart();
      await redirection.checkActiveTab();
    } catch (e) {
      console.warn("[Background] Failed to refresh listeners after list change:", e);
    }
  }

  if (changes.dailyGoal) {
    console.log("[Background] Daily goal changed:", changes.dailyGoal);

    const newGoal = changes.dailyGoal.newValue;
    if (!newGoal) return;

    const newGoalMs = ((newGoal.min || 0) * 60 + (newGoal.sec || 0)) * 1000;

    const dailyProgress = await storage.dailyProgress.get();

    console.log("[Background] Re-evaluating goal:", { dailyProgress, newGoalMs, stillMet: dailyProgress >= newGoalMs });

    if (newGoalMs > 0 && dailyProgress < newGoalMs) {
      console.log("[Background] Daily goal no longer met - resuming interception");
      await storage.shouldRedirect.set(true);

      redirection.checkActiveTab();
    } else if (newGoalMs > 0 && dailyProgress >= newGoalMs) {
      console.log("[Background] Daily goal met - keeping interception disabled for today");
      await storage.shouldRedirect.set(false);
    }
  }
});
