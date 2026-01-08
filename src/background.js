import browser from "webextension-polyfill";
import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./timer";
import { setTheme } from "./util/themes";
import badge from "./badge";
import { logAuditEvent, saveUserPreferences } from "./util/logger";
import controlledMode from "./controlledMode";
import { isControlled } from "./util/variantConfig";

// Manifest V3: No DOM access, no stray variables

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    installationSetup();
  }
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "timer:get") {
    return (async () => {
      try {
        await timer.sync();
      } catch (_) {}
      
      const timeData = timer.getTime();
      
      // Add controlled mode state if controlled variant
      if (isControlled()) {
        const controlledState = controlledMode.getState();
        return {
          ...timeData,
          isControlledVariant: true,
          controlledState: controlledState.state,
          controlledLearningRemaining: controlledState.state === "learning" ? controlledState.remainingMs : 0,
          controlledLearningGoal: controlledState.state === "learning" ? controlledState.goalMs : 0,
          controlledLearningElapsed: controlledState.state === "learning" ? controlledState.elapsedMs : 0,
          controlledLearningCompleted: controlledState.state === "learning" ? controlledState.completed : false,
          controlledRewardRemaining: controlledState.state === "reward" ? controlledState.remainingMs : 0,
          controlledRewardGoal: controlledState.state === "reward" ? controlledState.goalMs : 0,
        };
      }
      
      return { ...timeData, isControlledVariant: false };
    })();
  }


  if (message.type === "learning:autoStart") {

    return (async () => {
      try {
        if (!timer.isLearningSessionActive()) {
          await timer.startLearningSession();
        }
      } catch (_) {}
      return true;
    })();
  }

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    storage.blockedTabs.remove(sender.tab.id);
    storage.blockedOrigins.remove(sender.tab.id);
  }

  // Handle claim reward for controlled variant
  if (message.type === "controlled:claimReward" && sender && sender.tab) {
    return (async () => {
      try {
        if (isControlled()) {
          // Use the dedicated claimReward function which handles the full transition
          await controlledMode.claimReward(sender.tab.id);
        }
      } catch (e) {
        console.log("[Background] Failed to claim reward:", e);
      }
      return true;
    })();
  }
  
  // Handle snooze reward for controlled variant (adds 1 minute)
  if (message.type === "controlled:snoozeReward") {
    return (async () => {
      try {
        if (isControlled()) {
          const success = controlledMode.snoozeReward();
          console.log("[Background] Snooze reward result:", success);
        }
      } catch (e) {
        console.log("[Background] Failed to snooze reward:", e);
      }
      return true;
    })();
  }
});

async function installationSetup() {
  storage.clearStorage();
  storage.stats.init();
  storage.operatingHours.init();
  setTheme("dark");
  storage.shouldRedirect.set(true);
  storage.redirection.toggle();
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
  storage.shouldRedirect.set(true);
  redirection.navigationListener.start();
  redirection.tabChangeListener.start();
  redirection.windowChangeListener.start();
  redirection.addOriginTabCloseListener();
  
  // Initialize controlled mode if applicable
  if (isControlled()) {
    await controlledMode.init();
    redirection.registerProcrastinationGuards(); // Register tab close listeners for session logging
    console.log("[Background] Controlled mode initialized");
  }
}

async function killAiki() {
  // FIRST: Finalize all active sessions before stopping anything
  // This ensures we capture the exact duration up to the disable moment
  try {
    await redirection.finalizeAllActiveSessions("extension_disabled");
    console.log("[Background] Finalized all active sessions on extension disable");
  } catch (e) {
    console.warn("[Background] Failed to finalize sessions on disable:", e);
  }
  
  // For controlled variant, also cleanup controlledMode state
  if (isControlled()) {
    try {
      await controlledMode.cleanup();
      console.log("[Background] Controlled mode cleaned up on extension disable");
    } catch (e) {
      console.warn("[Background] Failed to cleanup controlled mode:", e);
    }
  }
  
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  try {
    await browser.tabs.sendMessage(tabs[0].id, { action: "kill aiki" });
  } catch (_) {
    // Tab may not have content script or context invalidated
  }
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
  } catch (_) {}
}

async function reviveAiki() {
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
  } catch (_) {}
}

async function gotoOriginTab() {
  const origin = await storage.origin.get();
  try {
    await browser.tabs.update(origin.tabId, { active: true });
  } catch (_) {}
}

// Manifest V3: Use runtime.onConnect for port messaging
browser.runtime.onConnect.addListener(function (port) {
  let isDisconnected = false;
  port.onDisconnect.addListener(() => {
    isDisconnected = true;
  });
  port.onMessage.addListener(function (msg) {
    console.log("[Aiki Debug] Port message received:", msg, "parsed as:", msg.split(": ")[1]);
    switch (msg.split(": ")[1]) {
      case "user":
        intervals.logger.restart();
        break;
      case "list":
        intervals.counter.restart();
        redirection.navigationListener.restart();
        break;
      case "origin": {
        const segments = msg.split(": ");
        const action = segments[2];
        console.log("[Aiki Debug] Background received origin message:", { msg, action, segments });
        (async () => {
          let tabId = port.sender?.tab?.id;
          if (tabId === undefined) {
            try {
              const [activeTab] = await browser.tabs.query({
                active: true,
                currentWindow: true,
              });
              tabId = activeTab?.id;
            } catch (_) {}
          }
          console.log("[Aiki Debug] Calling redirection.gotoOrigin with:", { action, tabId, type: "popup" });
          redirection.gotoOrigin(action, {
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
            await timer.sync();
          } catch (_) {}
          if (isDisconnected) return;
          try {
            const timeData = timer.getTime();
            // Add controlled mode state if controlled variant
            if (isControlled()) {
              const controlledState = controlledMode.getState();
              port.postMessage({
                ...timeData,
                isControlledVariant: true,
                controlledState: controlledState.state,
                controlledLearningRemaining: controlledState.state === "learning" ? controlledState.remainingMs : 0,
                controlledLearningGoal: controlledState.state === "learning" ? controlledState.goalMs : 0,
                controlledLearningElapsed: controlledState.state === "learning" ? controlledState.elapsedMs : 0,
                controlledLearningCompleted: controlledState.state === "learning" ? controlledState.completed : false,
                controlledRewardRemaining: controlledState.state === "reward" ? controlledState.remainingMs : 0,
                controlledRewardGoal: controlledState.state === "reward" ? controlledState.goalMs : 0,
              });
            } else {
              port.postMessage({ ...timeData, isControlledVariant: false });
            }
          } catch (error) {
            // Port might have been disconnected between sync and post
          }
        })();
        break;
      case "off":
        killAiki();
        break;
      case "on":
        reviveAiki();
        break;
      case "originTab":
        gotoOriginTab();
        break;
    }
  });
});

// Run setup on service worker start
setup();
