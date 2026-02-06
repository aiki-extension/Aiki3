/**
 * Controlled Mode - State Machine for Controlled Variant
 * 
 * This module handles ALL controlled variant behavior.
 * Uses a simple state machine: IDLE -> LEARNING -> REWARD -> LEARNING ...
 */

import browser from "webextension-polyfill";
import siteDetector from "./services/siteDetector";
import SessionService from "./services/SessionService";
import timer from "./services/TimerManager";
import storage from "./util/storage";
import { isControlled } from "./util/variantConfig";

// ============================================
// State Machine
// ============================================

const State = {
  IDLE: "idle",
  LEARNING: "learning",
  REWARD: "reward",
};

let currentState = State.IDLE;
// Track tabs we are already redirecting to prevent duplicate redirects/logs.
const redirectingTabs = new Set();
let sessionData = {
  procrastinationUrl: null,
  learningUrl: null,
  tabId: null,
  learningStartedAt: null,
  learningGoalMs: null,
  rewardStartedAt: null,
  rewardGoalMs: null,
};

// ============================================
// Public API
// ============================================

/**
 * Initialize controlled mode on extension startup.
 */
export async function init() {
  currentState = State.IDLE;
  timer.stopAllTimers();
  sessionData = {
    procrastinationUrl: null,
    learningUrl: null,
    tabId: null,
  };
  console.log("[ControlledMode] Initialized");
}

/**
 * Handle navigation event.
 * @param {number} tabId - Tab ID
 * @param {string} url - URL being navigated to
 * @param {string[]} procrastinationHosts - List of procrastination hosts
 * @param {string} learningUrl - Configured learning URL
 * @returns {boolean} true if handled, false otherwise
 */
export async function handleNavigation(tabId, url, procrastinationHosts, learningUrl) {
  if (!learningUrl) return false;

  // Check operating hours - don't redirect outside active hours
  const isWithinOperatingHours = await checkActiveTime();
  if (!isWithinOperatingHours) {
    console.log("[ControlledMode] Outside operating hours, not redirecting");
    return false;
  }

  const isProcrastination = siteDetector.isProcrastinationSite(url, procrastinationHosts);
  const isLearning = siteDetector.isLearningSite(url, learningUrl);

  console.log("[ControlledMode] handleNavigation", {
    state: currentState,
    isProcrastination,
    isLearning,
    url: siteDetector.getSiteName(url)
  });

  switch (currentState) {
    case State.IDLE:
      if (isProcrastination) {
        redirectToLearning(tabId, url, learningUrl);
        return true;
      }
      // Allow direct learning: if user navigates to learning site while in IDLE,
      // start a learning session (without a procrastination trigger URL)
      if (isLearning) {
        startDirectLearningSession(tabId, learningUrl);
        return true;
      }
      break;

    case State.LEARNING:
      if (isProcrastination) {
        // Just redirect back to learning, don't start new session/log event
        // We're already in LEARNING state
        redirectBackToLearning(tabId, learningUrl);
        return true;
      }
      if (isLearning && sessionData.tabId !== tabId) {
        sessionData.tabId = tabId;
      }
      break;

    case State.REWARD:
      if (isProcrastination) {
        sessionData.tabId = tabId;
        return false; // Allow procrastination during reward
      }
      break;
  }

  return false;
}

/**
 * Check if current time is within operating hours.
 * @returns {Promise<boolean>}
 */
async function checkActiveTime() {
  const fromTime = await storage.operatingHours.from.get();
  const toTime = await storage.operatingHours.to.get();
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  if (hours < fromTime.hrs) {
    return false;
  } else if (hours === fromTime.hrs && minutes < fromTime.min) {
    return false;
  }
  if (hours > toTime.hrs) {
    return false;
  } else if (hours === toTime.hrs && minutes > toTime.min) {
    return false;
  }
  return true;
}

/**
 * Handle continue button click (bypass learning).
 * Transitions to REWARD state and redirects to procrastination site.
 * @param {number} tabId - Tab ID
 */
export async function handleContinue(tabId) {
  console.log("[ControlledMode] handleContinue", { state: currentState, sessionData });

  // Get stored procrastination URL (may be from sessionData or storage)
  let procrastinationUrl = sessionData.procrastinationUrl;

  // If no procrastination URL in session, try to get from storage
  if (!procrastinationUrl) {
    try {
      const origin = await browser.storage.local.get("origin");
      if (origin?.origin?.url) {
        procrastinationUrl = origin.origin.url;
      }
    } catch (_) { }
  }

  // If still no URL, we can't redirect - just cleanup
  if (!procrastinationUrl) {
    console.log("[ControlledMode] No procrastination URL found, cannot redirect");
    timer.stopAllTimers();
    currentState = State.IDLE;
    return;
  }

  // LOG LEARNING SESSION before transitioning (user bypassed early)
  if (currentState === State.LEARNING && sessionData.learningStartedAt) {
    const timerState = timer.getTimerState("learning");
    const actualDurationMs = timerState.elapsed || (Date.now() - sessionData.learningStartedAt);

    console.log("[ControlledMode] Logging learning session before continue bypass", { actualDurationMs });

    await SessionService.logControlledSession({
      sessionType: "learning",
      startedAt: sessionData.learningStartedAt,
      durationMs: actualDurationMs,
      goalMs: sessionData.learningGoalMs,
      completed: false, // User bypassed early
      learningSite: sessionData.learningUrl,
      procrastinationSite: procrastinationUrl,
    });

    // Remove learning session from activeSessions since we just logged it
    await storage.activeSessions.remove(tabId);
  }

  // Stop any existing timers
  timer.stopAllTimers();

  // Log bypass event
  SessionService.logEventAsync("continue_bypass", {
    procrastinationSite: procrastinationUrl,
    learningSite: sessionData.learningUrl,
  });

  // Transition to REWARD state (not IDLE) - this gives user their procrastination time
  currentState = State.REWARD;
  sessionData.tabId = tabId;
  sessionData.rewardStartedAt = Date.now();

  // Get reward duration and start timer
  const { rewardMs } = await timer.getControlledDurations();
  sessionData.rewardGoalMs = rewardMs;

  // Store in activeSessions for tab close tracking (same as claimReward)
  const participantId = await storage.uid.get();
  if (participantId) {
    await storage.activeSessions.set(tabId, {
      participantId,
      sessionType: "procrastination",
      startedAt: sessionData.rewardStartedAt,
      learningUrl: sessionData.learningUrl,
      procrastinationUrl: procrastinationUrl,
      goalMs: rewardMs,
    });
    console.log("[ControlledMode] Stored procrastination session in activeSessions", { tabId });
  }

  // Navigate to procrastination site
  try {
    await browser.tabs.update(tabId, { url: procrastinationUrl });
  } catch (e) {
    console.log("[ControlledMode] Failed to navigate after continue:", e);
  }

  // Start reward timer
  timer.startTimer("reward", rewardMs, onRewardComplete);

  // Trigger reward overlay display after page loads
  setTimeout(async () => {
    try {
      await browser.tabs.sendMessage(tabId, { action: "display: rewardOverlay" });
    } catch (_) { }
  }, 1500);

  console.log("[ControlledMode] Continue handled, now in REWARD state");
}

/**
 * Get current state for UI.
 * @returns {Object}
 */
export function getState() {
  const timerState = currentState === State.LEARNING
    ? timer.getTimerState("learning")
    : currentState === State.REWARD
      ? timer.getTimerState("reward")
      : { remaining: 0, goal: 0, elapsed: 0, completed: false };

  return {
    state: currentState,
    remainingMs: timerState.remaining,
    goalMs: timerState.goal,
    elapsedMs: timerState.elapsed || 0,
    completed: timerState.completed || false,
    procrastinationUrl: sessionData.procrastinationUrl,
    learningUrl: sessionData.learningUrl,
  };
}

/**
 * Check if in reward state.
 * @returns {boolean}
 */
export function isInReward() {
  return currentState === State.REWARD;
}

/**
 * Cleanup and reset state.
 */
export function cleanup() {
  timer.stopAllTimers();
  currentState = State.IDLE;
  sessionData = {
    procrastinationUrl: null,
    learningUrl: null,
    tabId: null,
  };
  console.log("[ControlledMode] Cleanup complete");
}

/**
 * Snooze the reward timer by adding 1 minute.
 * Works when in REWARD state, or in IDLE state for experimental variant
 * (when prompt was shown but user wants to dismiss and continue procrastinating).
 */
export function snoozeReward() {
  console.log("[ControlledMode] snoozeReward called", { state: currentState });

  if (currentState === State.IDLE && !isControlled()) {
    console.log("[ControlledMode] Experimental: restoring REWARD state from IDLE");
    currentState = State.REWARD;
  }

  if (currentState !== State.REWARD) {
    console.log("[ControlledMode] Not in REWARD state, cannot snooze");
    return false;
  }

  // Add 1 minute (60000ms) to the reward timer
  const SNOOZE_DURATION = 60 * 1000; // 1 minute
  timer.extendTimer("reward", SNOOZE_DURATION);

  // Log the snooze
  SessionService.logEventAsync("reward_snoozed", {
    procrastinationSite: sessionData.procrastinationUrl,
    learningSite: sessionData.learningUrl,
  });

  console.log("[ControlledMode] Reward timer extended by 1 minute");
  return true;
}

// ============================================
// Internal Functions
// ============================================

/**
 * Redirect back to learning site without starting a new session.
 * Used when user tries to visit a procrastination site while already in LEARNING state.
 */
async function redirectBackToLearning(tabId, learningUrl) {
  console.log("[ControlledMode] Redirecting back to learning (no new session)");
  try {
    await browser.tabs.update(tabId, { url: learningUrl });
    sessionData.tabId = tabId;
  } catch (e) {
    console.log("[ControlledMode] Redirect back failed:", e);
  }
}

/**
 * Redirect to learning site and start learning session.
 */
async function redirectToLearning(tabId, procrastinationUrl, learningUrl) {
  console.log("[ControlledMode] Redirecting to learning");
  try {
    // REDIRECT FIRST
    await browser.tabs.update(tabId, { url: learningUrl });

    // Update in-memory state
    timer.stopAllTimers();
    currentState = State.LEARNING;
    sessionData.procrastinationUrl = procrastinationUrl;
    sessionData.learningUrl = learningUrl;
    sessionData.tabId = tabId;
    sessionData.learningStartedAt = Date.now();

    // Get durations
    const { learningMs } = await timer.getControlledDurations();
    sessionData.learningGoalMs = learningMs;

    // ALSO store in activeSessions for tab close tracking (like experimental variant)
    const participantId = await storage.uid.get();
    if (participantId) {
      await storage.activeSessions.set(tabId, {
        participantId,
        sessionType: "learning",
        startedAt: sessionData.learningStartedAt,
        learningUrl: learningUrl,
        procrastinationUrl: procrastinationUrl,
        goalMs: learningMs,
      });
    }

    // Log event (fire and forget) - session is tracked in Sessions table
    SessionService.logEventAsync("controlled_redirect", {
      procrastinationSite: procrastinationUrl,
      learningSite: learningUrl,
    });

    // Start learning timer
    // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
    timer.startTimer("learning", learningMs, onLearningComplete);

    console.log("[ControlledMode] Now in LEARNING state");
  } catch (e) {
    console.log("[ControlledMode] Redirect failed:", e);
  } finally {
    redirectingTabs.delete(tabId);
  }
}

/**
 * Start a direct learning session when user navigates to learning site while in IDLE state.
 * This is different from redirectToLearning - no redirect, no procrastination trigger.
 */
async function startDirectLearningSession(tabId, learningUrl) {
  console.log("[ControlledMode] Starting direct learning session");

  // Update in-memory state
  timer.stopAllTimers();
  currentState = State.LEARNING;
  sessionData.procrastinationUrl = null; // No procrastination trigger
  sessionData.learningUrl = learningUrl;
  sessionData.tabId = tabId;
  sessionData.learningStartedAt = Date.now();

  // Get durations
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;

  // Store in activeSessions for tab close tracking
  const participantId = await storage.uid.get();
  if (participantId) {
    await storage.activeSessions.set(tabId, {
      participantId,
      sessionType: "learning",
      startedAt: sessionData.learningStartedAt,
      learningUrl: learningUrl,
      procrastinationUrl: null, // No procrastination trigger
      goalMs: learningMs,
    });
  }

  // Log event - direct learning start
  SessionService.logEventAsync("direct_learning_start", {
    learningSite: learningUrl,
  });

  // Start learning timer
  timer.startTimer("learning", learningMs, onLearningComplete);

  console.log("[ControlledMode] Now in LEARNING state (direct)");
}

/**
 * Called when learning timer completes.
 * Does NOT auto-transition to REWARD - waits for user to click "Claim Reward".
 */
async function onLearningComplete() {
  console.log("[ControlledMode] Learning timer complete - awaiting user claim");

  if (currentState !== State.LEARNING) return;

  const { procrastinationUrl, learningUrl } = sessionData;

  // Log completion
  SessionService.logEventAsync("learning_timer_complete", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });

  // DO NOT transition to REWARD here!
  // Stay in LEARNING state with timer at 0
  // The UI will show the green panel with "Claim Reward" button
  // Transition happens when user clicks the button (via claimReward())

  console.log("[ControlledMode] Timer complete, staying in LEARNING. User must click Claim Reward.");
}

/**
 * Called when user clicks "Claim Reward" button.
 * Transitions to REWARD state and redirects to procrastination site.
 * @param {number} tabId - Tab ID
 */
export async function claimReward(tabId) {
  console.log("[ControlledMode] claimReward called", { state: currentState, tabId });

  if (currentState !== State.LEARNING) {
    console.log("[ControlledMode] Not in LEARNING state, ignoring claim");
    return;
  }

  const { procrastinationUrl, learningUrl, learningStartedAt, learningGoalMs } = sessionData;

  // Get the actual elapsed time from the timer (only counts time when on learning tab)
  const learningTimerState = timer.getTimerState("learning");
  const actualLearningDurationMs = learningTimerState.elapsed || 0;

  // LOG LEARNING SESSION TO DATABASE with completed=true
  SessionService.logControlledSession({
    sessionType: "learning",
    startedAt: learningStartedAt,
    durationMs: actualLearningDurationMs,
    goalMs: learningGoalMs,
    completed: true, // User completed their learning goal
    learningSite: learningUrl,
    procrastinationSite: procrastinationUrl,
  });


  await storage.activeSessions.remove(tabId);

  // CHECK IF DAILY GOAL IS MET
  const dailyProgress = await storage.dailyProgress.get();
  const dailyGoalSettings = await storage.timeSettings.dailyGoal.get();
  const dailyGoalMs = ((dailyGoalSettings?.min || 0) * 60 + (dailyGoalSettings?.sec || 0)) * 1000;

  console.log("[ControlledMode] Daily goal check:", { dailyProgress, dailyGoalMs, met: dailyProgress >= dailyGoalMs });

  if (dailyGoalMs > 0 && dailyProgress >= dailyGoalMs) {
    // DAILY GOAL IS MET! Grant unlimited access for the day
    console.log("[ControlledMode] Daily goal met! Granting unlimited access.");

    currentState = State.IDLE;
    timer.stopAllTimers();

    // Log event
    SessionService.logEventAsync("daily_goal_completed", {
      procrastinationSite: procrastinationUrl,
      learningSite: learningUrl,
      dailyProgress,
      dailyGoalMs,
    });

    // Disable interception for the day by setting shouldRedirect to false
    await storage.shouldRedirect.set(false);

    // Redirect to procrastination site without any overlay
    if (tabId && procrastinationUrl) {
      try {
        await browser.tabs.update(tabId, { url: procrastinationUrl });
        // Remove any overlays
        setTimeout(async () => {
          try {
            await browser.tabs.sendMessage(tabId, { action: "kill aiki" });
          } catch (_) { }
        }, 1500);
      } catch (e) {
        console.log("[ControlledMode] Failed to redirect:", e);
      }
    }

    console.log("[ControlledMode] Daily goal achieved - unlimited access granted");
    return;
  }

  // DAILY GOAL NOT MET - proceed with standard reward mode
  // Transition to REWARD
  currentState = State.REWARD;
  sessionData.tabId = tabId;
  sessionData.rewardStartedAt = Date.now();

  // Get reward duration
  const { rewardMs } = await timer.getControlledDurations();
  sessionData.rewardGoalMs = rewardMs;

  // Log event
  SessionService.logEventAsync("reward_claimed", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });

  // Redirect to procrastination site
  if (tabId && procrastinationUrl) {
    try {
      await browser.tabs.update(tabId, { url: procrastinationUrl });
    } catch (e) {
      console.log("[ControlledMode] Failed to redirect to procrastination:", e);
    }
  }

  // Update activeSessions for reward/procrastination tracking
  const participantId = await storage.uid.get();
  if (participantId) {
    await storage.activeSessions.set(tabId, {
      participantId,
      sessionType: "procrastination",
      startedAt: sessionData.rewardStartedAt,
      learningUrl: learningUrl,
      procrastinationUrl: procrastinationUrl,
      goalMs: rewardMs,
    });
  }

  // Start reward timer
  timer.startTimer("reward", rewardMs, onRewardComplete);

  // Trigger reward overlay display after page loads
  setTimeout(async () => {
    try {
      await browser.tabs.sendMessage(tabId, { action: "display: rewardOverlay" });
    } catch (_) { }
  }, 1500);

  console.log("[ControlledMode] Now in REWARD state");
}

/**
 * Called when reward timer completes.
 */
async function onRewardComplete() {
  console.log("[ControlledMode] Reward timer complete");

  if (currentState !== State.REWARD) return;

  // Check if extension is enabled (user might have turned it off)
  const isEnabled = await storage.redirection.get();
  if (!isEnabled) {
    console.log("[ControlledMode] Extension is disabled, not redirecting");
    // Reset to IDLE state since extension is off
    currentState = State.IDLE;
    sessionData = { procrastinationUrl: null, learningUrl: null, tabId: null, learningStartedAt: null, learningGoalMs: null, rewardStartedAt: null, rewardGoalMs: null };
    return;
  }

  const { procrastinationUrl, learningUrl, tabId, rewardStartedAt, rewardGoalMs } = sessionData;

  // Get the actual elapsed time from the reward timer
  const rewardTimerState = timer.getTimerState("reward");
  const actualRewardDurationMs = rewardTimerState.elapsed || rewardGoalMs || 0;

  // LOG REWARD (PROCRASTINATION) SESSION TO DATABASE with completed=true
  SessionService.logControlledSession({
    sessionType: "procrastination",
    startedAt: rewardStartedAt,
    durationMs: actualRewardDurationMs,
    goalMs: rewardGoalMs,
    completed: true, // User used all their reward time
    learningSite: learningUrl,
    procrastinationSite: procrastinationUrl,
  });

  // Reward session has been logged; clear activeSessions entry to avoid
  // finalizeSession re-logging the same procrastination session on tab close.
  if (tabId) {
    await storage.activeSessions.remove(tabId);
  }

  // Log expiry event
  SessionService.logEventAsync("reward_timer_expiry", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });

  // VARIANT-SPECIFIC BEHAVIOR:
  // Controlled: auto-redirect to learning
  // Experimental: show "keep learning" overlay (user chooses)
  if (!isControlled()) {
    // EXPERIMENTAL: Reset to IDLE and show consent prompt overlay
    currentState = State.IDLE;
    console.log("[ControlledMode] Experimental variant: showing consent prompt overlay");

    // Find active procrastination tab and show the prompt overlay
    try {
      const procList = await storage.list.get();
      const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);
      const allTabs = await browser.tabs.query({});

      for (const tab of allTabs) {
        if (tab.url && siteDetector.isProcrastinationSite(tab.url, procHosts)) {
          // Send message to show redirect prompt overlay
          try {
            await browser.tabs.sendMessage(tab.id, {
              action: "display: redirectPrompt",
              url: learningUrl,
              originUrl: tab.url,
            });
            console.log("[ControlledMode] Sent redirect prompt to tab:", tab.id);
          } catch (_) {
            // Tab might not have content script
          }
        }
      }
    } catch (e) {
      console.log("[ControlledMode] Failed to show prompt overlay:", e);
    }
    return; // Don't auto-redirect for experimental
  }

  // Transition back to LEARNING
  currentState = State.LEARNING;
  sessionData.learningStartedAt = Date.now();

  // Get learning duration
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;

  // NOTE: Session logging happens in Sessions table, not here

  // Redirect the ACTIVE procrastination tab to learning
  // User may have switched tabs, so we need to find the current active procrastination tab
  if (learningUrl) {
    try {
      // Get procrastination hosts list
      const procList = await storage.list.get();
      const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);

      // Get all tabs and find active procrastination tabs
      const allTabs = await browser.tabs.query({});
      const activeTabs = allTabs.filter(tab => tab.active);

      // First, try to redirect the currently focused/active procrastination tab
      let redirected = false;
      for (const tab of activeTabs) {
        if (tab.url && siteDetector.isProcrastinationSite(tab.url, procHosts)) {
          await browser.tabs.update(tab.id, { url: learningUrl });
          sessionData.tabId = tab.id; // Update to the new tab
          console.log("[ControlledMode] Redirected active procrastination tab:", tab.id);
          redirected = true;
          break;
        }
      }

      // If no active procrastination tab, try the original stored tabId
      if (!redirected && tabId) {
        try {
          const originalTab = await browser.tabs.get(tabId);
          if (originalTab && originalTab.url && siteDetector.isProcrastinationSite(originalTab.url, procHosts)) {
            await browser.tabs.update(tabId, { url: learningUrl });
            console.log("[ControlledMode] Redirected original tab:", tabId);
            redirected = true;
          }
        } catch (e) {
          // Original tab might be closed
        }
      }

      // If still not redirected, redirect any procrastination tab
      if (!redirected) {
        for (const tab of allTabs) {
          if (tab.url && siteDetector.isProcrastinationSite(tab.url, procHosts)) {
            await browser.tabs.update(tab.id, { url: learningUrl });
            sessionData.tabId = tab.id;
            console.log("[ControlledMode] Redirected first found procrastination tab:", tab.id);
            break;
          }
        }
      }
    } catch (e) {
      console.log("[ControlledMode] Failed to find/redirect procrastination tab:", e);
      // Fallback to original tabId
      if (tabId && learningUrl) {
        try {
          await browser.tabs.update(tabId, { url: learningUrl });
        } catch (_) { }
      }
    }
  }

  // Start learning timer
  // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
  timer.startTimer("learning", learningMs, onLearningComplete);

  console.log("[ControlledMode] Back to LEARNING state");
}

/**
 * Handle tab close event - reset state and timers.
 * NOTE: Session logging is handled by finalizeSession in redirection.js
 * which uses activeSessions storage. This function only cleans up in-memory state.
 * @param {number} tabId - Tab ID that was closed
 */
export async function handleTabClose(tabId) {
  console.log("[ControlledMode] handleTabClose called", {
    closedTabId: tabId,
    trackedTabId: sessionData.tabId,
    currentState
  });

  // Only handle if this is our tracked tab or we're in an active state
  if (currentState === State.IDLE) {
    console.log("[ControlledMode] In IDLE state, nothing to reset");
    return;
  }

  // If we have a tracked tab and it's not this one, skip
  if (sessionData.tabId && sessionData.tabId !== tabId) {
    console.log("[ControlledMode] Tab ID mismatch, skipping", { expected: sessionData.tabId, got: tabId });
    return;
  }

  // Stop timers and reset state
  // NOTE: Session is logged by finalizeSession in redirection.js using activeSessions storage
  timer.stopAllTimers();
  currentState = State.IDLE;
  sessionData = {
    procrastinationUrl: null,
    learningUrl: null,
    tabId: null,
    learningStartedAt: null,
    learningGoalMs: null,
    rewardStartedAt: null,
    rewardGoalMs: null,
  };

  console.log("[ControlledMode] Tab closed, in-memory state reset (session logged by finalizeSession)");
}

// ============================================
// Export
// ============================================

export default {
  init,
  handleNavigation,
  handleContinue,
  claimReward,
  snoozeReward,
  getState,
  isInReward,
  cleanup,
  handleTabClose,
  State,
};
