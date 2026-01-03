/**
 * Controlled Mode - State Machine for Controlled Variant
 * 
 * This module handles ALL controlled variant behavior.
 * Uses a simple state machine: IDLE -> LEARNING -> REWARD -> LEARNING ...
 */

import browser from "webextension-polyfill";
import siteDetector from "./core/siteDetector";
import sessionManager from "./core/sessionManager";
import timer from "./timer";
import storage from "./util/storage";

// ============================================
// State Machine
// ============================================

const State = {
  IDLE: "idle",
  LEARNING: "learning", 
  REWARD: "reward",
};

let currentState = State.IDLE;
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
export function handleNavigation(tabId, url, procrastinationHosts, learningUrl) {
  if (!learningUrl) return false;
  
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
      break;
      
    case State.LEARNING:
      if (isProcrastination) {
        redirectToLearning(tabId, url, learningUrl);
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
    } catch (_) {}
  }
  
  // If still no URL, we can't redirect - just cleanup
  if (!procrastinationUrl) {
    console.log("[ControlledMode] No procrastination URL found, cannot redirect");
    timer.stopAllTimers();
    currentState = State.IDLE;
    return;
  }
  
  // Stop any existing timers
  timer.stopAllTimers();
  
  // Log bypass
  sessionManager.logEventAsync("controlled:continue_bypass", {
    procrastinationSite: procrastinationUrl,
    learningSite: sessionData.learningUrl,
  });
  
  // Transition to REWARD state (not IDLE) - this gives user their procrastination time
  currentState = State.REWARD;
  sessionData.tabId = tabId;
  
  // Get reward duration and start timer
  const { rewardMs } = await timer.getControlledDurations();
  
  // Log reward session start
  sessionManager.logEventAsync("controlled:reward_session_start", {
    procrastinationSite: procrastinationUrl,
    learningSite: sessionData.learningUrl,
    eventData: `${rewardMs / 60000} minutes (via continue)`,
  });
  
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
    } catch (_) {}
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
 * Only works when in REWARD state.
 */
export function snoozeReward() {
  console.log("[ControlledMode] snoozeReward called", { state: currentState });
  
  if (currentState !== State.REWARD) {
    console.log("[ControlledMode] Not in REWARD state, cannot snooze");
    return false;
  }
  
  // Add 1 minute (60000ms) to the reward timer
  const SNOOZE_DURATION = 60 * 1000; // 1 minute
  timer.extendTimer("reward", SNOOZE_DURATION);
  
  // Log the snooze
  sessionManager.logEventAsync("controlled:reward_snoozed", {
    procrastinationSite: sessionData.procrastinationUrl,
    learningSite: sessionData.learningUrl,
    eventData: "1 minute extension",
  });
  
  console.log("[ControlledMode] Reward timer extended by 1 minute");
  return true;
}

// ============================================
// Internal Functions
// ============================================

/**
 * Redirect to learning site and start learning session.
 */
async function redirectToLearning(tabId, procrastinationUrl, learningUrl) {
  console.log("[ControlledMode] Redirecting to learning");
  
  // REDIRECT FIRST
  try {
    await browser.tabs.update(tabId, { url: learningUrl });
  } catch (e) {
    console.log("[ControlledMode] Redirect failed:", e);
    return;
  }
  
  // Update state
  timer.stopAllTimers();
  currentState = State.LEARNING;
  sessionData.procrastinationUrl = procrastinationUrl;
  sessionData.learningUrl = learningUrl;
  sessionData.tabId = tabId;
  sessionData.learningStartedAt = Date.now();
  
  // Get durations
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;
  
  // Log events (fire and forget)
  sessionManager.logEventAsync("controlled:forced_redirect", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });
  sessionManager.logEventAsync("controlled:learning_session_start", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
    eventData: `${learningMs / 60000} minutes`,
  });
  
  // Start learning timer
  // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
  timer.startTimer("learning", learningMs, onLearningComplete);
  
  console.log("[ControlledMode] Now in LEARNING state");
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
  sessionManager.logEventAsync("controlled:learning_timer_complete", {
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
  sessionManager.logControlledSession({
    sessionType: "learning",
    startedAt: learningStartedAt,
    durationMs: actualLearningDurationMs,
    goalMs: learningGoalMs,
    completed: true, // User completed their learning goal
    learningSite: learningUrl,
    procrastinationSite: procrastinationUrl,
  });
  
  // Transition to REWARD
  currentState = State.REWARD;
  sessionData.tabId = tabId;
  sessionData.rewardStartedAt = Date.now();
  
  // Get reward duration
  const { rewardMs } = await timer.getControlledDurations();
  sessionData.rewardGoalMs = rewardMs;
  
  // Log events
  sessionManager.logEventAsync("controlled:reward_claimed", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });
  sessionManager.logEventAsync("controlled:reward_session_start", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
    eventData: `${rewardMs / 60000} minutes`,
  });
  
  // Redirect to procrastination site
  if (tabId && procrastinationUrl) {
    try {
      await browser.tabs.update(tabId, { url: procrastinationUrl });
    } catch (e) {
      console.log("[ControlledMode] Failed to redirect to procrastination:", e);
    }
  }
  
  // Start reward timer
  timer.startTimer("reward", rewardMs, onRewardComplete);
  
  // Trigger reward overlay display after page loads
  setTimeout(async () => {
    try {
      await browser.tabs.sendMessage(tabId, { action: "display: rewardOverlay" });
    } catch (_) {}
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
  sessionManager.logControlledSession({
    sessionType: "procrastination",
    startedAt: rewardStartedAt,
    durationMs: actualRewardDurationMs,
    goalMs: rewardGoalMs,
    completed: true, // User used all their reward time
    learningSite: learningUrl,
    procrastinationSite: procrastinationUrl,
  });
  
  // Log expiry event
  sessionManager.logEventAsync("controlled:reward_timer_expiry", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });
  
  // Transition back to LEARNING
  currentState = State.LEARNING;
  sessionData.learningStartedAt = Date.now();
  
  // Get learning duration
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;
  
  // Log new learning session
  sessionManager.logEventAsync("controlled:learning_session_start", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
    eventData: `${learningMs / 60000} minutes (auto-restart)`,
  });
  
  // Redirect to learning
  if (tabId && learningUrl) {
    try {
      await browser.tabs.update(tabId, { url: learningUrl });
    } catch (e) {
      console.log("[ControlledMode] Failed to redirect to learning:", e);
    }
  }
  
  // Start learning timer
  // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
  timer.startTimer("learning", learningMs, onLearningComplete);
  
  console.log("[ControlledMode] Back to LEARNING state");
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
  State,
};
