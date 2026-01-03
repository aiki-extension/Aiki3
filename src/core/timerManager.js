/**
 * Timer Manager - Unified timer management for all variants
 */

import storage from "../util/storage";
import badge from "../badge";

// Timer state
const timers = {
  learning: {
    ref: null,
    remaining: 0,
    goal: 0,
    startedAt: null,
    onComplete: null,
    elapsed: 0,
    completed: false,
    paused: false,
    pausedElapsed: 0,  // Elapsed time when paused
  },
  reward: {
    ref: null,
    remaining: 0,
    goal: 0,
    startedAt: null,
    onComplete: null,
    elapsed: 0,
    completed: false,
    paused: false,
    pausedElapsed: 0,
  },
  daily: {
    ref: null,
    goal: 0,
    progress: 0,
  },
};

/**
 * Start a timer.
 * @param {string} type - Timer type: "learning" or "reward"
 * @param {number} durationMs - Duration in milliseconds
 * @param {Function} onComplete - Callback when timer completes
 */
export function startTimer(type, durationMs, onComplete = null) {
  if (!timers[type]) return;
  
  // Stop existing timer
  stopTimer(type);
  
  const timer = timers[type];
  timer.goal = durationMs;
  timer.remaining = durationMs;
  timer.startedAt = Date.now();
  timer.onComplete = onComplete;
  timer.elapsed = 0;
  timer.completed = false;
  
  // Update badge
  if (type === "learning") {
    badge.setBusy();
  } else if (type === "reward") {
    badge.setProgress("🎉", 1);
  }
  
  // Start interval
  timer.ref = setInterval(() => {
    const elapsedTime = Date.now() - timer.startedAt;
    timer.elapsed = elapsedTime;
    timer.remaining = Math.max(0, timer.goal - elapsedTime);
    
    // Check for completion (only fire callback once)
    if (timer.remaining <= 0 && !timer.completed) {
      timer.completed = true;
      
      // Call completion handler
      const handler = timer.onComplete;
      timer.onComplete = null;
      if (typeof handler === "function") {
        handler();
      }
    }
    // Note: Timer continues running to track elapsed time beyond goal
  }, 1000);
  
  console.log(`[TimerManager] Started ${type} timer for ${durationMs / 1000}s`);
}

/**
 * Stop a timer.
 * @param {string} type - Timer type
 */
export function stopTimer(type) {
  const timer = timers[type];
  if (!timer) return;
  
  if (timer.ref) {
    clearInterval(timer.ref);
    timer.ref = null;
  }
  
  timer.remaining = 0;
  timer.goal = 0;
  timer.startedAt = null;
  timer.onComplete = null;
  timer.elapsed = 0;
  timer.completed = false;
  timer.paused = false;
  timer.pausedElapsed = 0;
}

/**
 * Pause a timer (stops counting but preserves state).
 * @param {string} type - Timer type
 */
export function pauseTimer(type) {
  const timer = timers[type];
  if (!timer || !timer.ref || timer.paused) return;
  
  // Calculate current elapsed before pausing
  if (timer.startedAt) {
    timer.pausedElapsed = Date.now() - timer.startedAt;
    timer.elapsed = timer.pausedElapsed;
    timer.remaining = Math.max(0, timer.goal - timer.pausedElapsed);
  }
  
  // Stop the interval but keep state
  clearInterval(timer.ref);
  timer.ref = null;
  timer.paused = true;
  
  console.log(`[TimerManager] Paused ${type} timer at ${timer.pausedElapsed / 1000}s elapsed`);
}

/**
 * Resume a paused timer.
 * @param {string} type - Timer type
 */
export function resumeTimer(type) {
  const timer = timers[type];
  if (!timer || !timer.paused || timer.goal <= 0) return;
  
  // Adjust startedAt to account for paused time
  timer.startedAt = Date.now() - timer.pausedElapsed;
  timer.paused = false;
  
  // Restart the interval
  timer.ref = setInterval(() => {
    const elapsedTime = Date.now() - timer.startedAt;
    timer.elapsed = elapsedTime;
    timer.remaining = Math.max(0, timer.goal - elapsedTime);
    
    // Check for completion (only fire callback once)
    if (timer.remaining <= 0 && !timer.completed) {
      timer.completed = true;
      
      // Call completion handler
      const handler = timer.onComplete;
      timer.onComplete = null;
      if (typeof handler === "function") {
        handler();
      }
    }
  }, 1000);
  
  console.log(`[TimerManager] Resumed ${type} timer, continuing from ${timer.pausedElapsed / 1000}s`);
}

/**
 * Check if a timer is paused.
 * @param {string} type - Timer type
 * @returns {boolean}
 */
export function isTimerPaused(type) {
  return timers[type]?.paused || false;
}

/**
 * Extend an active timer by adding more time.
 * @param {string} type - Timer type
 * @param {number} durationMs - Duration to add in milliseconds
 */
export function extendTimer(type, durationMs) {
  const timer = timers[type];
  if (!timer || timer.goal <= 0) return;
  
  // Add to the goal
  timer.goal += durationMs;
  
  // Reset completed flag since we have more time now
  timer.completed = false;
  
  // Recalculate remaining
  if (timer.startedAt) {
    timer.remaining = Math.max(0, timer.goal - (Date.now() - timer.startedAt));
  } else {
    timer.remaining = durationMs;
  }
  
  console.log(`[TimerManager] Extended ${type} timer by ${durationMs / 1000}s, new goal: ${timer.goal / 1000}s`);
}

/**
 * Stop all timers.
 */
export function stopAllTimers() {
  stopTimer("learning");
  stopTimer("reward");
}

/**
 * Check if a timer is active.
 * @param {string} type - Timer type
 * @returns {boolean}
 */
export function isTimerActive(type) {
  return timers[type]?.ref !== null;
}

/**
 * Get timer state.
 * @param {string} type - Timer type
 * @returns {Object}
 */
export function getTimerState(type) {
  const timer = timers[type];
  if (!timer) return { remaining: 0, goal: 0, active: false, elapsed: 0, completed: false, paused: false };
  
  // Calculate current values if timer is running (not paused)
  let remaining = timer.remaining;
  let elapsed = timer.elapsed || 0;
  if (timer.startedAt && timer.ref && !timer.paused) {
    const elapsedTime = Date.now() - timer.startedAt;
    remaining = Math.max(0, timer.goal - elapsedTime);
    elapsed = elapsedTime;
  }
  
  return {
    remaining,
    goal: timer.goal,
    active: timer.ref !== null || timer.paused,  // Active if running OR paused
    elapsed,
    completed: timer.completed || false,
    paused: timer.paused || false,
  };
}

/**
 * Get all timer states for UI.
 * @returns {Object}
 */
export function getAllTimerStates() {
  return {
    learning: getTimerState("learning"),
    reward: getTimerState("reward"),
    controlledLearningRemaining: getTimerState("learning").remaining,
    controlledLearningGoal: getTimerState("learning").goal,
    controlledRewardRemaining: getTimerState("reward").remaining,
    controlledRewardGoal: getTimerState("reward").goal,
  };
}

/**
 * Get timer durations from settings.
 * @returns {Promise<{learningMs: number, rewardMs: number}>}
 */
export async function getControlledDurations() {
  try {
    const learningMinutes = await storage.controlledTimerSettings.learningMinutes.get();
    const rewardMinutes = await storage.controlledTimerSettings.rewardMinutes.get();
    return {
      learningMs: learningMinutes * 60 * 1000,
      rewardMs: rewardMinutes * 60 * 1000,
    };
  } catch (e) {
    return {
      learningMs: 5 * 60 * 1000,
      rewardMs: 2 * 60 * 1000,
    };
  }
}

export default {
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  isTimerPaused,
  extendTimer,
  stopAllTimers,
  isTimerActive,
  getTimerState,
  getAllTimerStates,
  getControlledDurations,
};
