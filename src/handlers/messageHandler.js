import storage from "../util/storage";
import timer from "../services/TimerManager";
import browser from "webextension-polyfill";
import { parseTime } from "../util/utilities";
import { loginUser, registerUser} from "../services/apiService";

/*
This module handles incoming messages from content scripts and other parts of the extension. 
It processes different message types, such as timer requests, learning session management, and blocker release commands. 
The handler ensures that messages are valid and performs the appropriate actions based on the message type.
*/

// Input: apiCall result { ok, message, data }
// Output: { ok: boolean, message: string, token: string | null }
function validateResult(result) {
  if (!result.ok) {
    return { ok: false, message: result.message, token: null };
  } else {
    const token = result?.data?.token ?? result?.token ?? null;
    return { ok: true, message: "", token };
  }
}

export async function handleMessage(message, sender) {

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
  
  if (message.type === "auth:login") {
      const result = await loginUser({ email: message.email, password: message.password });
      return validateResult(result);
  }

  if (message.type === "auth:register") {
      const result = await registerUser({ email: message.email, password: message.password });
      return validateResult(result);
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
        
        // Check if the user is on reward time
        // If they are, then don't start a new session immediately 
        if (timer.isSessionRewardActive()) {
          console.log("[Session] User is in reward mode, not starting new session");
          return { inRewardMode: true };
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
          console.log("[Session] Reward complete!");
          
          // Re-enable redirects when reward time expires
          await storage.shouldRedirect.set(true);
          
          // Check if user is on a time wasting site before showing redirect prompt
          try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
              const currentUrl = tabs[0].url;
              const learningUrl = await storage.learningUri.get();
              
              // Checks if URL matches learning site
              const isOnLearningSite = (url, learningUri) => {
                if (!learningUri || !url) return false;
                try {
                  const learningHost = new URL(learningUri).hostname.replace(/^www\./, "");
                  const currentHost = new URL(url).hostname.replace(/^www\./, "");
                  return (
                    learningHost === currentHost ||
                    currentHost.endsWith(`.${learningHost}`) ||
                    learningHost.endsWith(`.${currentHost}`)
                  );
                } catch (_) {
                  return false;
                }
              };
              
              // Checks if URL matches a time wasting site
              const isOnTimeWastingSite = async (url) => {
                try {
                  const currentHost = new URL(url).hostname.replace(/^www\./, "");
                  const timeWasteList = await storage.list.get();
                  const procHosts = (timeWasteList || []).map(item => item?.host || item?.name || "").filter(Boolean);
                  
                  return procHosts.some(host => {
                    const normalizedHost = host.replace(/^www\./, "");
                    return currentHost === normalizedHost ||
                      currentHost.endsWith("." + normalizedHost) ||
                      normalizedHost.endsWith("." + currentHost);
                  });
                } catch (_) {
                  return false;
                }
              };
              
              // Only show redirect prompt if on time wasting site
              if (await isOnTimeWastingSite(currentUrl)) {
                console.log("[Session] On time wasting site, showing redirect prompt");
                
                // Show redirect prompt
                const response = await browser.tabs.sendMessage(tabs[0].id, {
                  action: "display: redirectPrompt",
                  url: learningUrl,
                  originUrl: timeWastingUrl
                });
                
                // If user clicks "Redirect", navigate to learning site
                if (response && response.action === "redirect") {
                  console.log("[Session] User chose to redirect to learning");
                  await browser.tabs.update(tabs[0].id, { url: learningUrl });
                } else {
                  console.log("[Session] User chose to stay on time wasting site");
                }
              } else if (isOnLearningSite(currentUrl, learningUrl)) {
                console.log("[Session] On learning site, starting new session");
                // Trigger session start on learning site
                try {
                  await browser.tabs.sendMessage(tabs[0].id, {
                    action: "display: encouragement"
                  });
                } catch (e) {
                  console.log("[Session] Failed to send encouragement message:", e);
                }
                // Also trigger learning:autoStart to begin a new session
                // This will start the session timer and show the learning overlay
                await (async () => {
                  const sessionMinutes = await storage.sessionSettings.sessionMinutes.get();
                  const sessionSeconds = await storage.sessionSettings.sessionSeconds.get();
                  const sessionDuration = (sessionMinutes * 60 * 1000) + (sessionSeconds * 1000);
                  
                  await timer.startSessionTimer(sessionDuration, () => {
                    console.log("[Session] Session complete!");
                  });
                })();
              } else {
                console.log("[Session] On neutral site, no action needed");
              }
            }
          } catch (e) {
            console.error("[Session] Failed to handle reward completion:", e);
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
}
