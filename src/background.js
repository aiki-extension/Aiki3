import browser from "webextension-polyfill";
import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./timer";
import { setTheme } from "./util/themes";
import badge from "./badge";
import firebase from "./util/firebase";
import { makeDate } from "./util/utilities";
import { participantResource } from "./util/constants";

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
      return timer.getTime();
    })();
  }

  if (message.type === "stats:skip") {
    storage.stats.skip();
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
  redirection.addMirceaListener();
  intervals.intervalSetup();
  storage.shouldRedirect.set(true);
  redirection.navigationListener.start();
  redirection.tabChangeListener.start();
  redirection.windowChangeListener.start();
  redirection.addOriginTabCloseListener();
}

async function killAiki() {
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
  firebase.addLog(
    {
      user: user,
      event: "User toggled redirection off",
      date: makeDate(),
    },
    "config"
  );
}

async function reviveAiki() {
  redirection.checkActiveTab();
  const user = await storage.uid.get();
  firebase.addLog(
    {
      user: user,
      event: "User toggled redirection on",
      date: makeDate(),
    },
    "config"
  );
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
            port.postMessage(timer.getTime());
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
