import browser from "webextension-polyfill";
import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./services/TimerManager";
import { setTheme } from "./util/themes";



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
      } catch (_) { }
      const timeData = timer.getTime();
      return { ...timeData, isControlledVariant: false };
    })();
  }


  if (message.type === "learning:autoStart") {

    return (async () => {
      try {
        if (!timer.isLearningSessionActive()) {
          await timer.startLearningSession();
        }
      } catch (_) { }
      return true;
    })();
  }

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    storage.blockedTabs.remove(sender.tab.id);
    storage.blockedOrigins.remove(sender.tab.id);
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
  await redirection.start();
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
}

async function reviveAiki() {
  redirection.checkActiveTab();
}

async function gotoOriginTab() {
  const origin = await storage.origin.get();
  try {
    await browser.tabs.update(origin.tabId, { active: true });
  } catch (_) { }
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
            } catch (_) { }
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
          } catch (_) { }
          if (isDisconnected) return;
          try {
            const timeData = timer.getTime();
            port.postMessage({ ...timeData, isControlledVariant: false });
            
          } catch (error) {
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
