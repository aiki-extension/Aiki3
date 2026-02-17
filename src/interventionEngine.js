/**
 * Intervention Engine - Unified State Machine for Both Variants
 * 
 * This module handles ALL intervention behavior for both Controlled and Experimental variants.
 * Uses a state machine: IDLE -> INTERCEPTED -> LEARNING -> REWARD -> IDLE
 * 
 * AIKI_VARIANT controls:
 * - INTERCEPTED: Controlled auto-accepts (immediate), Experimental shows prompt
 * - REWARD expiry: Controlled auto-redirects, Experimental shows prompt
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
  INTERCEPTED: "intercepted", // Transitional: waiting for user input (experimental) or auto-accept (controlled)
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

// Storage key for state persistence
const ENGINE_STATE_KEY = "aiki_engine_state";

// ============================================
// Public API
// ============================================

/**
 * Initialize intervention engine on extension startup.
 * Restores state from storage for persistence across service worker restarts.
 */
export async function init() {
  try {
    await timer.sync({ restoreState: true });
  } catch (_) { }

  // Try to restore state from storage
  const restored = await restoreState();

  if (!restored) {
    // No stored state - start fresh
    currentState = State.IDLE;
    timer.stopAllTimers();
    sessionData = {
      procrastinationUrl: null,
      learningUrl: null,
      tabId: null,
    };
    await persistState();
  }

  console.log("[InterventionEngine] Initialized", { state: currentState, restored });
}

/**
 * Persist current state to storage.
 * Called after state transitions to survive service worker restarts.
 */
async function persistState() {
  try {
    const state = {
      currentState,
      sessionData: { ...sessionData },
      savedAt: Date.now(),
    };
    await browser.storage.local.set({ [ENGINE_STATE_KEY]: state });
  } catch (_) { }
}

/**
 * Restore state from storage.
 * @returns {Promise<boolean>} true if state was restored, false otherwise
 */
async function restoreState() {
  try {
    const result = await browser.storage.local.get(ENGINE_STATE_KEY);
    const saved = result?.[ENGINE_STATE_KEY];
    if (!saved || !saved.currentState) return false;

    // Don't restore if saved more than 1 hour ago (stale state)
    const elapsed = Date.now() - (saved.savedAt || 0);
    if (elapsed > 60 * 60 * 1000) {
      console.log("[InterventionEngine] State too old, not restoring", { elapsed });
      await browser.storage.local.remove(ENGINE_STATE_KEY);
      return false;
    }

    currentState = saved.currentState;
    sessionData = saved.sessionData || {};

    if (
      currentState === State.LEARNING &&
      sessionData.procrastinationUrl &&
      sessionData.tabId !== undefined
    ) {
      await storage.origin.set({
        url: sessionData.procrastinationUrl,
        tabId: sessionData.tabId,
      });
    }

    // If we were in an active state, restart the timer using persisted remaining
    // time (no wall-clock subtraction).
    if (currentState === State.LEARNING && sessionData.learningGoalMs) {
      const persistedLearning = timer.getTimerState("learning").remaining || 0;
      const remaining = Math.max(
        0,
        persistedLearning > 0 ? persistedLearning : sessionData.learningGoalMs
      );
      if (remaining > 0) {
        timer.startTimer("learning", remaining, onLearningComplete);
      }
    } else if (currentState === State.REWARD) {
      const remaining = Math.max(0, timer.getTimerState("reward").remaining || 0);
      if (remaining > 0) {
        timer.startTimer("reward", remaining, onRewardComplete, {
          tabId: sessionData.tabId,
        });
      } else {
        await onRewardComplete();
      }
    }

    console.log("[InterventionEngine] State restored", { currentState, sessionData });
    return true;
  } catch (e) {
    console.log("[InterventionEngine] Failed to restore state:", e);
    return false;
  }
}

async function getRewardRemainingMs() {
  const timerRemaining = Number(timer.getTimerState("reward")?.remaining) || 0;
  let unlockRemaining = 0;
  try {
    const unlockAt = Number(await storage.rewardUnlock.get()) || 0;
    unlockRemaining = unlockAt > 0 ? Math.max(0, unlockAt - Date.now()) : 0;
  } catch (_) { }
  return Math.max(0, timerRemaining, unlockRemaining);
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

  // Daily goal reached means no more interceptions until next day reset.
  const dailyGoalStatus = await getDailyGoalStatus();
  if (dailyGoalStatus.met) {
    await storage.shouldRedirect.set(false);
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
      if (isLearning) {
        if (
          sessionData.tabId !== undefined &&
          sessionData.tabId !== null &&
          sessionData.tabId !== tabId
        ) {
          await SessionService.transferActiveSession(sessionData.tabId, tabId);
        }
        await SessionService.startSession(
          tabId,
          "learning",
          url,
          sessionData.procrastinationUrl,
          { goalMs: sessionData.learningGoalMs }
        );
        sessionData.tabId = tabId;
        persistState().catch(() => { });
        return true;
      }
      break;

    case State.REWARD:
      if (isProcrastination) {
        const remainingMs = await getRewardRemainingMs();
        if (remainingMs <= 0) {
          await onRewardComplete();
          return true;
        }

        const existingSession = await storage.activeSessions.get(tabId);
        if (!existingSession || existingSession.sessionType !== "procrastination") {
          await SessionService.startSession(tabId, "procrastination", url, sessionData.learningUrl, {
            goalMs: sessionData.rewardGoalMs,
            learningUrl: sessionData.learningUrl,
            resumeIfExists: true,
          });
        }
        sessionData.tabId = tabId;
        timer.setRewardTrackingTab(tabId);
        persistState().catch(() => { });
        browser.tabs.sendMessage(tabId, { action: "display: rewardOverlay" }).catch(() => { });
        return true; // Handled: allow procrastination during reward without fallback prompts
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
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = (Number(fromTime?.hrs) || 0) * 60 + (Number(fromTime?.min) || 0);
  const endMinutes = (Number(toTime?.hrs) || 0) * 60 + (Number(toTime?.min) || 0);

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

async function getDailyGoalStatus() {
  const dailyProgress = await storage.dailyProgress.get();
  const dailyGoalSettings = await storage.timeSettings.dailyGoal.get();
  const dailyGoalMs =
    ((Number(dailyGoalSettings?.min) || 0) * 60 + (Number(dailyGoalSettings?.sec) || 0)) *
    1000;
  return {
    dailyProgress,
    dailyGoalMs,
    met: dailyGoalMs > 0 && dailyProgress >= dailyGoalMs,
  };
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
  const learningUrl = sessionData.learningUrl || null;

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
    await persistState();
    return;
  }

  // Finalize learning session exactly once before transitioning.
  if (currentState === State.LEARNING) {
    const learningSessionTabId = tabId ?? sessionData.tabId;
    if (learningSessionTabId !== undefined && learningSessionTabId !== null) {
      await SessionService.finalizeSession(
        learningSessionTabId,
        "learning",
        "continue",
        { completed: false }
      );
    }
  }

  // Stop any existing timers
  timer.stopAllTimers();

  // Log bypass event
  SessionService.logEventAsync("continue_bypass", {
    procrastinationSite: procrastinationUrl,
    learningSite: sessionData.learningUrl,
  });

  const dailyGoalStatus = await getDailyGoalStatus();
  if (dailyGoalStatus.met) {
    currentState = State.IDLE;
    sessionData.tabId = tabId;
    sessionData.rewardStartedAt = null;
    sessionData.rewardGoalMs = null;
    await storage.shouldRedirect.set(false);
    await persistState();

    try {
      await browser.tabs.update(tabId, { url: procrastinationUrl });
      setTimeout(async () => {
        try {
          await browser.tabs.sendMessage(tabId, { action: "kill aiki" });
        } catch (_) { }
      }, 1500);
    } catch (e) {
      console.log("[ControlledMode] Failed to navigate after continue:", e);
    }
    return;
  }

  // Transition to REWARD state (not IDLE) - this gives user their procrastination time
  currentState = State.REWARD;
  sessionData.tabId = tabId;
  sessionData.rewardStartedAt = Date.now();

  // Get reward duration and start timer
  const { rewardMs } = await timer.getControlledDurations();
  sessionData.rewardGoalMs = rewardMs;
  await persistState();

  await SessionService.startSession(tabId, "procrastination", procrastinationUrl, learningUrl, {
    goalMs: rewardMs,
    learningUrl,
    resumeIfExists: true,
  });

  // Navigate to procrastination site
  try {
    await browser.tabs.update(tabId, { url: procrastinationUrl });
  } catch (e) {
    console.log("[ControlledMode] Failed to navigate after continue:", e);
  }

  // Start reward timer
  timer.startTimer("reward", rewardMs, onRewardComplete, { tabId });

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
    tabId: sessionData.tabId,
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
  persistState().catch(() => { });
  console.log("[ControlledMode] Cleanup complete");
}

/**
 * Snooze the reward timer by adding 1 minute.
 * Controlled variant: only valid while in REWARD state.
 * Experimental variant: extends the active reward window if one exists.
 */
export function snoozeReward() {
  console.log("[ControlledMode] snoozeReward called", { state: currentState });

  const inControlled = isControlled();

  if (inControlled && currentState !== State.REWARD) {
    console.log("[ControlledMode] Not in REWARD state, cannot snooze");
    return false;
  }

  // Add 1 minute (60000ms) to the reward timer
  const SNOOZE_DURATION = 60 * 1000; // 1 minute
  const success = timer.extendTimer("reward", SNOOZE_DURATION);
  if (!success) {
    console.log("[ControlledMode] No active reward timer found, cannot snooze");
    return false;
  }

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
    const previousTabId = sessionData.tabId;
    await browser.tabs.update(tabId, { url: learningUrl });
    if (
      previousTabId !== undefined &&
      previousTabId !== null &&
      previousTabId !== tabId
    ) {
      await SessionService.transferActiveSession(previousTabId, tabId);
    }
    await SessionService.startSession(
      tabId,
      "learning",
      learningUrl,
      sessionData.procrastinationUrl,
      { goalMs: sessionData.learningGoalMs }
    );
    sessionData.tabId = tabId;
    await persistState();
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
    await storage.origin.set({ url: procrastinationUrl, tabId });

    // Get durations
    const { learningMs } = await timer.getControlledDurations();
    sessionData.learningGoalMs = learningMs;

    await SessionService.startSession(tabId, "learning", learningUrl, procrastinationUrl, {
      goalMs: learningMs,
    });

    // Variant-specific event logging: experimental accept logging is handled
    // by redirection.onAccept to avoid duplicate event rows.
    if (isControlled()) {
      SessionService.logEventAsync("controlled_redirection", {
        procrastinationSite: procrastinationUrl,
        learningSite: learningUrl,
      });
    }

    // Start learning timer
    // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
    timer.startTimer("learning", learningMs, onLearningComplete);
    await persistState();

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
  await storage.origin.remove();

  // Get durations
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;

  await SessionService.startSession(tabId, "learning", learningUrl, null, {
    goalMs: learningMs,
  });

  // Log event - direct learning start
  SessionService.logEventAsync("direct_learning_start", {
    learningSite: learningUrl,
  });

  // Start learning timer
  timer.startTimer("learning", learningMs, onLearningComplete);
  await persistState();

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

  const { procrastinationUrl, learningUrl } = sessionData;

  const learningSessionTabId = tabId ?? sessionData.tabId;
  if (learningSessionTabId !== undefined && learningSessionTabId !== null) {
    await SessionService.finalizeSession(
      learningSessionTabId,
      "learning",
      "claim_reward",
      { completed: true }
    );
  }

  // CHECK IF DAILY GOAL IS MET
  const dailyGoalStatus = await getDailyGoalStatus();
  const { dailyProgress, dailyGoalMs, met } = dailyGoalStatus;

  console.log("[ControlledMode] Daily goal check:", { dailyProgress, dailyGoalMs, met });

  if (met) {
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
    await persistState();

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
  await persistState();

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

  await SessionService.startSession(tabId, "procrastination", procrastinationUrl, learningUrl, {
    goalMs: rewardMs,
    learningUrl,
    resumeIfExists: true,
  });

  // Start reward timer
  timer.startTimer("reward", rewardMs, onRewardComplete, { tabId });

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
    await persistState();
    return;
  }

  const { procrastinationUrl, learningUrl, tabId } = sessionData;

  // Log expiry event
  SessionService.logEventAsync("reward_timer_expiry", {
    procrastinationSite: procrastinationUrl,
    learningSite: learningUrl,
  });

  // VARIANT-SPECIFIC BEHAVIOR:
  // Controlled: auto-redirect to learning
  // Experimental: re-open consent prompt flow
  if (!isControlled()) {
    // EXPERIMENTAL: Reset to IDLE and trigger the normal interception prompt.
    currentState = State.IDLE;
    sessionData.rewardStartedAt = null;
    sessionData.rewardGoalMs = null;
    await storage.shouldRedirect.set(true);
    await persistState();

    try {
      await browser.runtime.sendMessage({ type: "reward:expired" });
    } catch (e) {
      console.log("[ControlledMode] Failed to trigger reward-expiry prompt:", e);
    }
    return; // Don't auto-redirect for experimental
  }

  const dailyGoalStatus = await getDailyGoalStatus();
  if (dailyGoalStatus.met) {
    currentState = State.IDLE;
    sessionData.rewardStartedAt = null;
    sessionData.rewardGoalMs = null;
    await storage.shouldRedirect.set(false);
    await persistState();
    console.log("[ControlledMode] Daily goal met during reward; skipping redirect to learning");
    return;
  }

  // Transition back to LEARNING
  currentState = State.LEARNING;
  sessionData.learningStartedAt = Date.now();
  sessionData.rewardStartedAt = null;
  sessionData.rewardGoalMs = null;

  // Get learning duration
  const { learningMs } = await timer.getControlledDurations();
  sessionData.learningGoalMs = learningMs;
  await persistState();

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
            sessionData.tabId = tabId;
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
            redirected = true;
            break;
          }
        }
      }

      if (redirected && sessionData.procrastinationUrl && sessionData.tabId !== undefined) {
        await storage.origin.set({
          url: sessionData.procrastinationUrl,
          tabId: sessionData.tabId,
        });
      }
    } catch (e) {
      console.log("[ControlledMode] Failed to find/redirect procrastination tab:", e);
      // Fallback to original tabId
      if (tabId && learningUrl) {
        try {
          await browser.tabs.update(tabId, { url: learningUrl });
          sessionData.tabId = tabId;
          if (sessionData.procrastinationUrl) {
            await storage.origin.set({
              url: sessionData.procrastinationUrl,
              tabId,
            });
          }
        } catch (_) { }
      }
    }
  }

  // Start learning timer
  // Note: checkActive() in timer.js automatically pauses when user is not on learning tab
  timer.startTimer("learning", learningMs, onLearningComplete);

  console.log("[ControlledMode] Back to LEARNING state");
}

async function findLearningReplacementTab(closedTabId) {
  const learningUrl =
    (typeof sessionData.learningUrl === "string" && sessionData.learningUrl) ||
    (await storage.learningUri.get());
  if (!learningUrl) return null;

  let tabs = [];
  try {
    tabs = await browser.tabs.query({});
  } catch (_) {
    return null;
  }

  const learningTabs = tabs.filter(
    (tab) =>
      tab &&
      typeof tab.id === "number" &&
      tab.id !== closedTabId &&
      typeof tab.url === "string" &&
      siteDetector.isLearningSite(tab.url, learningUrl)
  );
  if (learningTabs.length === 0) return null;

  const activeLearningTab = learningTabs.find((tab) => tab.active);
  return activeLearningTab || learningTabs[0];
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

  // In reward mode, closing one tab should not end reward for other open
  // procrastination tabs. Transfer tracking and keep timer/state alive.
  if (currentState === State.REWARD) {
    try {
      const procList = await storage.list.get();
      const procHosts = (procList || []).map((item) => item?.host || item?.name || "").filter(Boolean);
      const tabs = await browser.tabs.query({});
      const replacement = tabs.find(
        (tab) =>
          tab &&
          typeof tab.id === "number" &&
          tab.id !== tabId &&
          typeof tab.url === "string" &&
          siteDetector.isProcrastinationSite(tab.url, procHosts)
      );

      if (replacement && replacement.id !== undefined) {
        await SessionService.transferActiveSession(tabId, replacement.id);
        sessionData.tabId = replacement.id;
        timer.setRewardTrackingTab(replacement.id);
        await persistState();
        console.log("[ControlledMode] Reward tab closed, transferred tracking", {
          from: tabId,
          to: replacement.id,
        });
        return;
      }

      // No replacement tab: keep reward running in background until user re-enters
      // a procrastination site or the reward expires.
      sessionData.tabId = null;
      timer.setRewardTrackingTab(null);
      await persistState();
      console.log("[ControlledMode] Reward tab closed with no replacement; preserving reward state");
      return;
    } catch (e) {
      console.log("[ControlledMode] Reward tab close transfer failed; preserving reward state:", e);
      sessionData.tabId = null;
      timer.setRewardTrackingTab(null);
      await persistState();
      return;
    }
  }

  // In learning mode, closing the tracked learning tab should transfer
  // ownership to another learning tab if one still exists.
  if (currentState === State.LEARNING) {
    try {
      const replacement = await findLearningReplacementTab(tabId);
      if (replacement && replacement.id !== undefined) {
        try {
          await SessionService.transferActiveSession(tabId, replacement.id);
        } catch (transferError) {
          console.log("[ControlledMode] Learning tab close transfer failed; preserving state:", transferError);
        }

        sessionData.tabId = replacement.id;

        try {
          const origin = await storage.origin.get();
          if (origin && origin.tabId === tabId) {
            await storage.origin.set({
              ...origin,
              tabId: replacement.id,
            });
          }
        } catch (_) { }

        await persistState();
        console.log("[ControlledMode] Learning tab closed, transferred tracking", {
          from: tabId,
          to: replacement.id,
        });
        return;
      }
    } catch (e) {
      console.log("[ControlledMode] Learning tab close replacement lookup failed:", e);
    }
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
  await persistState();

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
