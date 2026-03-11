import browser from "webextension-polyfill";
import intervals from "./intervals";
import storage from "./util/storage";
import redirection from "./redirection";
import timer from "./services/TimerManager";
import { setTheme } from "./util/themes";
import { parseTime } from "./util/utilities";

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
      return timeData;
    })();
  }

  if (message.type === "learning:autoStart") {
    return (async () => {
      try {
        // Get information on the daily goal
        const dailyGoal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
        const dailyProgress = await storage.dailyProgress.get();
        // Check if user already has met their daily goal, if yes then don't create a new session
        if (dailyGoal > 0 && dailyProgress >= dailyGoal) {
          console.log("[Session] Daily goal already reached! Progress:", dailyProgress, "Goal:", dailyGoal);
          return { goalReached: true };
        }
        
        // Get session duration from settings (minutes + seconds)
        const sessionMinutes = await storage.sessionSettings.sessionMinutes.get();
        const sessionSeconds = await storage.sessionSettings.sessionSeconds.get();
        const sessionDuration = (sessionMinutes * 60 * 1000) + (sessionSeconds * 1000);
        
        // Check if session is already active
        if (timer.isSessionActive()) {
          // Gets current session goal
          const currentGoal = timer.getTime().sessionGoal;
          
          // If settings changed, update the session with new duration
          if (currentGoal && currentGoal !== sessionDuration) {
            console.log("[Session] Settings changed, updating session duration from", currentGoal, "to", sessionDuration);
            
            // Calculate progress percentage
            const elapsed = timer.getTime().sessionElapsed || 0;
            const progressRatio = currentGoal > 0 ? elapsed / currentGoal : 0;
            
            // Apply same progress ratio to new duration
            const newElapsed = Math.floor(sessionDuration * progressRatio);
            const newRemaining = sessionDuration - newElapsed;
            
            // Update the timer with new goal and adjusted remaining time
            timer.stopSessionTimer();
            timer.sessionGoal = sessionDuration;
            timer.sessionRemaining = Math.max(0, newRemaining);
            timer.sessionElapsed = newElapsed;
            
            // Restart the timer interval
            timer.sessionIntervalRef = setInterval(() => {
              timer.decrementSession().catch(() => {});
            }, 1000);
            
            console.log("[Session] Updated session - goal:", sessionDuration, "remaining:", newRemaining);
          } else {
            console.log("[Session] Session already running with same duration");
          }
        } else {
          // Start new session timer
          await timer.startSessionTimer(sessionDuration, () => {
            console.log("[Session] Session complete!");
            // Timer will stop automatically; user must claim reward via button
          });
        }
      } catch (e) {
        console.error("[Session] Failed to start session:", e);
      }
      return true;
    })();
  }

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    storage.blockedTabs.remove(sender.tab.id);
    storage.blockedOrigins.remove(sender.tab.id);
  }

  if (message.type === "session:claimReward") {
    return (async () => {
      try {
        // Get origin (time wasting site)
        let origin = await storage.origin.get();
        let timeWastingUrl = origin?.url;
        
        // If no origin saved (manual navigation), use first site from time wasting list
        if (!timeWastingUrl) {
          const timeWasteList = await storage.list.get();
          if (timeWasteList && timeWasteList.length > 0) {
            const firstTimeWaste = timeWasteList[0];
            // Build URL from host or name
            if (firstTimeWaste.host) {
              timeWastingUrl = firstTimeWaste.host.startsWith('http') 
                ? firstTimeWaste.host 
                : `https://${firstTimeWaste.host}`;
            } else if (firstTimeWaste.name) {
              timeWastingUrl = `https://${firstTimeWaste.name}`;
            }
            console.log("[Session] No origin saved, using first time wasting site:", timeWastingUrl);
          }
        }
        
        if (!timeWastingUrl) {
          console.error("[Session] No time wasting site found!");
          return false;
        }
        
        // Get reward duration from settings
        const rewardMinutes = await storage.sessionSettings.rewardMinutes.get();
        const rewardSeconds = await storage.sessionSettings.rewardSeconds.get();
        const rewardDuration = (rewardMinutes * 60 * 1000) + (rewardSeconds * 1000);
        
        // This prevents the redirect prompt from showing immediately
        await storage.shouldRedirect.set(false);
        
        // Start reward timer with callback to show redirect prompt when done
        await timer.startSessionRewardTimer(rewardDuration, async () => {
          console.log("[Session] Reward complete! Showing redirect prompt...");
          
          // Re-enable redirects when reward time expires
          await storage.shouldRedirect.set(true);
          
          // Show prompt on the time wasting site
          try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id) {
              const learningUrl = await storage.learningUri.get();
              
              // Handles the redirect prompt response
              const response = await browser.tabs.sendMessage(tabs[0].id, {
                action: "display: redirectPrompt",
                url: learningUrl,
                originUrl: timeWastingUrl
              });
              
              // If user clicks "Redirect", then navigate to the learning site
              if (response && response.action === "redirect") {
                console.log("[Session] User chose to redirect to learning");
                await browser.tabs.update(tabs[0].id, { url: learningUrl });
              } else {
                console.log("[Session] User chose to stay on time wasting site");
              }
            }
          } catch (e) {
            console.error("[Session] Failed to show redirect prompt:", e);
          }
        });
        
        // Redirect to time wasting site after reward timer started
        if (sender?.tab?.id) {
          console.log("[Session] Redirecting to:", timeWastingUrl);
          await browser.tabs.update(sender.tab.id, { url: timeWastingUrl });
          
          // Trigger reward overlay after page loads
          setTimeout(async () => {
            try {
              await browser.tabs.sendMessage(sender.tab.id, {
                action: "display: rewardOverlay"
              });
              console.log("[Session] Reward overlay message sent");
            } catch (e) {
              console.error("[Session] Failed to show reward overlay:", e);
            }
          }, 1500);
        }
        
      } catch (e) {
        console.error("[Session] Failed to start reward:", e);
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
            port.postMessage(timeData);
            
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
