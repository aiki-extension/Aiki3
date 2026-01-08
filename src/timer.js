import storage from "./util/storage";
import browser from "webextension-polyfill";
import badge from "./badge";
import { parseTime, parseUrl } from "./util/utilities";

let learningTimeRemaining = 0;
let learningTimeIntervalRef;
let dailyGoal = 0;
let dailyProgress = 0;

function computeProgressPercent() {
  if (dailyGoal <= 0) return 0;
  return Math.min(1, dailyProgress / dailyGoal);
}

function getRemainingLabel() {
  const minutes = Math.max(0, Math.ceil(learningTimeRemaining / 60000));
  return `${minutes}m`;
}

function updateBadge() {
  try {
    badge.setProgress(getRemainingLabel(), computeProgressPercent());
  } catch (_) {}
}

async function decrementLearningTime() {
  // Only tick when user is actively on the learning tab/window
  if (await checkActive()) {
    if (learningTimeRemaining > 0) {
      learningTimeRemaining -= 1000;
      if (learningTimeRemaining < 0) {
        learningTimeRemaining = 0;
      }
      dailyProgress = Math.min(dailyGoal, dailyProgress + 1000);
      await storage.dailyProgress.set(dailyProgress);
      updateBadge();
      if (learningTimeRemaining === 0) {
        await handleGoalCompletion();
      }
    } else {
      await handleGoalCompletion();
    }
  }
}

async function handleGoalCompletion() {
  learningTimeRemaining = 0;
  dailyProgress = dailyGoal;
  await storage.dailyProgress.set(dailyProgress);
  try {
    await storage.shouldRedirect.set(false);
  } catch (_) {}
  badge.setProgress("0m", 1);
  clearInterval(learningTimeIntervalRef);
  learningTimeIntervalRef = undefined;
  bonusTime = 0;
}

async function startLearningSession() {
  if (bonusTimeIntervalRef) stopBonusTime();
  if (learningTimeIntervalRef) clearInterval(learningTimeIntervalRef);
  clearRewardTimer();
  rewardTimeRemaining = 0;
  rewardUnlockAt = 0;
  storage.rewardUnlock.set(0).catch(() => {});
  badge.setBusy();
  const goal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
  const progress = await storage.dailyProgress.get();
  dailyGoal = goal;
  dailyProgress = Math.min(progress, goal);
  learningTimeRemaining = Math.max(goal - dailyProgress, 0);
  updateBadge();
  if (learningTimeRemaining > 0) {
    learningTimeIntervalRef = setInterval(decrementLearningTime, 1000);
  } else {
    await handleGoalCompletion();
  }
}

async function syncDailyState() {
  const goal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
  const progress = await storage.dailyProgress.get();
  dailyGoal = goal;
  dailyProgress = Math.min(progress, goal);
  if (!learningTimeIntervalRef) {
    learningTimeRemaining = Math.max(goal - dailyProgress, 0);
  }
  rewardUnlockAt = await storage.rewardUnlock.get();
  if (rewardUnlockAt) {
    rewardTimeRemaining = Math.max(0, rewardUnlockAt - Date.now());
    if (rewardTimeRemaining === 0) {
      rewardUnlockAt = 0;
      storage.rewardUnlock.set(0).catch(() => {});
      storage.shouldRedirect.set(true);
    }
  } else {
    rewardTimeRemaining = 0;
  }
  updateBadge();
}

function stopLearningSession() {
  clearInterval(learningTimeIntervalRef);
  learningTimeIntervalRef = undefined;
  if (dailyGoal > 0) {
    const consumed = Math.max(0, dailyGoal - learningTimeRemaining);
    storage.dailyProgress.set(consumed).catch(() => {});
  }
  learningTimeRemaining = 0;
  badge.remove();
}

let rewardTimeRemaining = 0;
let rewardTimeIntervalRef;
let rewardUnlockAt = 0;

function clearRewardTimer() {
  if (rewardTimeIntervalRef) {
    clearInterval(rewardTimeIntervalRef);
    rewardTimeIntervalRef = undefined;
  }
}

async function decrementRewardTime(callback) {
  if (!rewardUnlockAt) {
    rewardTimeRemaining = 0;
    clearRewardTimer();
    await storage.rewardUnlock.set(0);
    await storage.shouldRedirect.set(true);
    if (typeof callback === "function") callback();
    return;
  }

  rewardTimeRemaining = Math.max(0, rewardUnlockAt - Date.now());
  if (rewardTimeRemaining === 0) {
    clearRewardTimer();
    rewardUnlockAt = 0;
    await storage.rewardUnlock.set(0);
    await storage.shouldRedirect.set(true);
    if (typeof callback === "function") callback();
  }
}

async function startProcrastinationSession(callback, rewardTime) {
  stopLearningSession();
  stopBonusTime();
  clearRewardTimer();

  rewardTimeRemaining = rewardTime;

  if (rewardTimeRemaining <= 0) {
    rewardUnlockAt = 0;
    await storage.rewardUnlock.set(0);
    await storage.shouldRedirect.set(true);
    return;
  }

  rewardUnlockAt = Date.now() + rewardTimeRemaining;
  await storage.rewardUnlock.set(rewardUnlockAt);
  await storage.shouldRedirect.set(false);

  rewardTimeIntervalRef = setInterval(() => {
    decrementRewardTime(callback).catch(() => {});
  }, 1000);
}

async function stopProcrastinationSession(callback) {
  clearRewardTimer();
  rewardTimeRemaining = 0;
  rewardUnlockAt = 0;
  await storage.rewardUnlock.set(0);
  await storage.shouldRedirect.set(true);
  if (typeof callback === "function") callback();
}

let bonusTime = 0;
let bonusTimeIntervalRef;

async function incrementBonusTime() {
  if (await checkActive()) {
    if (bonusTime >= 0) {
      bonusTime += 1000;
    } else {
      bonusTime = 0;
    }
  }
}

function startBonusTime() {
  if (bonusTimeIntervalRef) stopBonusTime();
  badge.setProgress("0m", 1);
  clearInterval(learningTimeIntervalRef);
  learningTimeIntervalRef = undefined;
  bonusTimeIntervalRef = setInterval(incrementBonusTime, 1000);
}

function stopBonusTime() {
  clearInterval(bonusTimeIntervalRef);
  bonusTime = 0;
  bonusTimeIntervalRef = undefined;
}

function isLearningSessionActive() {
  return Boolean(learningTimeIntervalRef);
}

async function checkActive() {
  const window = await browser.windows.getCurrent();
  const views = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getViews)
    ? chrome.runtime.getViews({ type: "popup" })
    : [];
  if (window.focused || views.length > 0) {
    const currentTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (currentTabs.length > 0) {
      const current = currentTabs[0];
      const origin = await storage.origin.get();
      if (origin && origin.tabId !== undefined && current.id === origin.tabId) {
        return true;
      }

      try {
        const learningUri = await storage.learningUri.get();
        if (learningUri) {
          const learningName = parseUrl(learningUri).name;
          if (learningName && current.url && current.url.includes(learningName)) {
            return true;
          }
        }
      } catch (_) {}
    }
  }
  return false;
}

function killAiki() {
  clearInterval(rewardTimeIntervalRef);
  rewardTimeIntervalRef = undefined;
  stopBonusTime();
  storage.shouldRedirect.set(true);
  storage.rewardUnlock.set(0).catch(() => {});
  rewardTimeRemaining = 0;
  rewardUnlockAt = 0;
  bonusTime = 0;
  learningTimeRemaining = 0;
  dailyGoal = 0;
  dailyProgress = 0;
}

// ============================================
// Controlled Variant Session-Based Timers
// These are separate from daily goal timers
// ============================================

let controlledLearningRemaining = 0;
let controlledLearningIntervalRef;
let controlledLearningGoal = 0;
let controlledLearningElapsed = 0; // Total time spent (continues past goal)
let controlledLearningCompleted = false; // Whether goal was reached
let controlledRewardRemaining = 0;
let controlledRewardIntervalRef;
let controlledRewardGoal = 0;
let controlledRewardElapsed = 0; // Tracks actual time spent on procrastination site
let controlledLearningOnComplete = null;
let controlledRewardOnComplete = null;

async function decrementControlledLearning() {
  if (await checkActive()) {
    // Always increment elapsed time
    controlledLearningElapsed += 1000;
    
    if (controlledLearningRemaining > 0) {
      controlledLearningRemaining -= 1000;
      if (controlledLearningRemaining <= 0) {
        controlledLearningRemaining = 0;
        controlledLearningCompleted = true;
        // Fire onComplete callback once when goal is reached
        if (typeof controlledLearningOnComplete === "function") {
          controlledLearningOnComplete();
          controlledLearningOnComplete = null; // Prevent multiple calls
        }
        // NOTE: Timer continues running to track time past goal
      }
    }
    // If remaining is 0, timer keeps running to track extra time
  }
}

/**
 * Start a controlled variant learning session timer.
 * @param {number} learningMs - Learning time in milliseconds
 * @param {Function} onComplete - Callback when timer completes
 */
function startControlledLearningSession(learningMs, onComplete) {
  stopControlledLearningSession();
  stopControlledRewardSession();
  
  controlledLearningGoal = learningMs;
  controlledLearningRemaining = learningMs;
  controlledLearningElapsed = 0;
  controlledLearningCompleted = false;
  controlledLearningOnComplete = onComplete;
  
  badge.setBusy();
  
  if (controlledLearningRemaining > 0) {
    controlledLearningIntervalRef = setInterval(decrementControlledLearning, 1000);
  } else if (typeof onComplete === "function") {
    onComplete();
  }
}

function stopControlledLearningSession() {
  if (controlledLearningIntervalRef) {
    clearInterval(controlledLearningIntervalRef);
    controlledLearningIntervalRef = undefined;
  }
  controlledLearningRemaining = 0;
  controlledLearningGoal = 0;
  controlledLearningElapsed = 0;
  controlledLearningCompleted = false;
  controlledLearningOnComplete = null;
}

function isControlledLearningActive() {
  return Boolean(controlledLearningIntervalRef);
}

async function decrementControlledReward() {
  // Reward timer ticks regardless of focus (user is on procrastination site)
  // Always increment elapsed time to track actual time spent
  controlledRewardElapsed += 1000;
  
  if (controlledRewardRemaining > 0) {
    controlledRewardRemaining -= 1000;
    if (controlledRewardRemaining <= 0) {
      controlledRewardRemaining = 0;
      clearInterval(controlledRewardIntervalRef);
      controlledRewardIntervalRef = undefined;
      if (typeof controlledRewardOnComplete === "function") {
        controlledRewardOnComplete();
      }
    }
  }
}

/**
 * Start a controlled variant reward session timer.
 * @param {number} rewardMs - Reward time in milliseconds
 * @param {Function} onComplete - Callback when timer completes
 */
function startControlledRewardSession(rewardMs, onComplete) {
  stopControlledLearningSession();
  stopControlledRewardSession();
  
  controlledRewardGoal = rewardMs;
  controlledRewardRemaining = rewardMs;
  controlledRewardElapsed = 0; // Reset elapsed time
  controlledRewardOnComplete = onComplete;
  
  badge.setProgress("🎉", 1);
  
  if (controlledRewardRemaining > 0) {
    controlledRewardIntervalRef = setInterval(decrementControlledReward, 1000);
  } else if (typeof onComplete === "function") {
    onComplete();
  }
}

function stopControlledRewardSession() {
  if (controlledRewardIntervalRef) {
    clearInterval(controlledRewardIntervalRef);
    controlledRewardIntervalRef = undefined;
  }
  // Note: Don't reset elapsed here - it's needed for logging before stop is called
  controlledRewardRemaining = 0;
  controlledRewardGoal = 0;
  controlledRewardOnComplete = null;
}

function isControlledRewardActive() {
  return Boolean(controlledRewardIntervalRef);
}

function getControlledSessionState() {
  return {
    learningRemaining: controlledLearningRemaining,
    learningGoal: controlledLearningGoal,
    learningElapsed: controlledLearningElapsed,
    learningCompleted: controlledLearningCompleted,
    rewardRemaining: controlledRewardRemaining,
    rewardGoal: controlledRewardGoal,
    rewardElapsed: controlledRewardElapsed,
    isLearning: isControlledLearningActive(),
    isReward: isControlledRewardActive(),
  };
}

function killControlledTimers() {
  stopControlledLearningSession();
  stopControlledRewardSession();
}

// ============================================
// Wrapper Methods for ControlledMode Compatibility
// ============================================

/**
 * Get timer durations from settings (wrapper for controlledMode).
 */
async function getControlledDurations() {
  const learningMinutes = await storage.controlledTimerSettings?.learningMinutes?.get?.() || 5;
  const rewardMinutes = await storage.controlledTimerSettings?.rewardMinutes?.get?.() || 15;
  return {
    learningMs: learningMinutes * 60 * 1000,
    rewardMs: rewardMinutes * 60 * 1000,
  };
}

/**
 * Stop all controlled timers.
 */
function stopAllTimers() {
  killControlledTimers();
}

/**
 * Start a timer (using controlled timer functions which have checkActive built-in).
 * @param {string} type - "learning" or "reward"
 * @param {number} durationMs - Duration in milliseconds
 * @param {Function} onComplete - Callback when timer completes
 */
function startTimer(type, durationMs, onComplete) {
  if (type === "learning") {
    startControlledLearningSession(durationMs, onComplete);
  } else if (type === "reward") {
    startControlledRewardSession(durationMs, onComplete);
  }
}

/**
 * Get timer state for controlled mode.
 * @param {string} type - "learning" or "reward"
 */
function getTimerState(type) {
  if (type === "learning") {
    return {
      remaining: controlledLearningRemaining,
      goal: controlledLearningGoal,
      active: isControlledLearningActive(),
      elapsed: controlledLearningElapsed, // Total time spent (continues past goal)
      completed: controlledLearningCompleted, // True once goal is reached
    };
  } else if (type === "reward") {
    return {
      remaining: controlledRewardRemaining,
      goal: controlledRewardGoal,
      active: isControlledRewardActive(),
      elapsed: controlledRewardElapsed, // Use tracked elapsed time
      completed: controlledRewardRemaining <= 0 && controlledRewardGoal > 0,
    };
  }
  return { remaining: 0, goal: 0, active: false, elapsed: 0, completed: false };
}

/**
 * Extend a timer by adding more time.
 * @param {string} type - Timer type
 * @param {number} durationMs - Duration to add
 */
function extendTimer(type, durationMs) {
  if (type === "reward" && isControlledRewardActive()) {
    controlledRewardRemaining += durationMs;
    controlledRewardGoal += durationMs;
    console.log(`[Timer] Extended reward timer by ${durationMs / 1000}s`);
  }
}

function getTime() {
  return {
    bonusTime: bonusTime,
    learningTimeRemaining: learningTimeRemaining,
    rewardTimeRemaining: rewardTimeRemaining,
    dailyGoal,
    dailyProgress,
    rewardUnlockAt,
    // Controlled variant session state
    controlledLearningRemaining,
    controlledLearningGoal,
    controlledRewardRemaining,
    controlledRewardGoal,
  };
}

export default {
  startLearningSession,
  stopLearningSession,
  startProcrastinationSession,
  stopProcrastinationSession,
  stopBonusTime,
  isLearningSessionActive,
  getTime,
  killAiki,
  sync: syncDailyState,
  // Controlled variant timers
  startControlledLearningSession,
  stopControlledLearningSession,
  isControlledLearningActive,
  startControlledRewardSession,
  stopControlledRewardSession,
  isControlledRewardActive,
  getControlledSessionState,
  killControlledTimers,
  // Wrapper methods for controlledMode.js compatibility
  getControlledDurations,
  stopAllTimers,
  startTimer,
  getTimerState,
  extendTimer,
};

