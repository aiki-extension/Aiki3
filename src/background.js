import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./services/TimerManager";
import aikistatus from "./services/aikiService";
import setup from "./services/setupService";
//import api from "./services/apiService";


// Manifest V3: No DOM access, no stray variables
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    setup.installationSetup();
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
        aikistatus.killAiki();
        break;
      case "on":
        aikistatus.reviveAiki();
        break;
      case "originTab":
        aikistatus.gotoOriginTab();
        break;
    }
  });
});

// Run setup on service worker start
setup.setup();
