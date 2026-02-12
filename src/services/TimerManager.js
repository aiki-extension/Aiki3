/**
 * TimerManager - Unified Timer System
 * 
 * Manages all timers for both Experimental and Controlled variants.
 * Uses storage-based persistence for state survival across service worker restarts.
 * 
 * Timer Types:
 * - learning: Active learning session countdown
 * - reward: Procrastination/reward time countdown
 */

import storage from "../util/storage";
import browser from "webextension-polyfill";
import badge from "../badge";
import { parseTime } from "../util/utilities";
import { isControlled } from "../util/variantConfig";
import siteDetector from "./siteDetector";

// Storage keys for timer persistence
const TIMER_STORAGE_KEY = "aiki_timer_state";

class TimerManager {
  constructor() {
    // Daily goal tracking (shared across both variants)
    this.dailyGoal = 0;
    this.dailyProgress = 0;

    // Unified timer state
    this.timers = {
      learning: {
        remaining: 0,
        goal: 0,
        elapsed: 0,
        intervalRef: null,
        onComplete: null,
        completed: false,
        startedAt: null,
      },
      reward: {
        remaining: 0,
        goal: 0,
        elapsed: 0,
        intervalRef: null,
        onComplete: null,
        startedAt: null,
      },
    };

    // Legacy compatibility (experimental variant uses these)
    this.learningTimeRemaining = 0;
    this.learningTimeIntervalRef = undefined;
    this.sessionElapsed = 0;
    this.rewardTimeRemaining = 0;
    this.rewardTimeIntervalRef = undefined;
    this.rewardUnlockAt = 0;
    this.lastRewardExpirySignal = 0;
    this.bonusTime = 0;
    this.bonusTimeIntervalRef = undefined;
  }

  // ============================================
  // UNIFIED TIMER API
  // ============================================

  /**
   * Start a timer of the specified type.
   * @param {string} type - Timer type: 'learning' or 'reward'
   * @param {number} durationMs - Duration in milliseconds
   * @param {Function} onComplete - Callback when timer completes
   */
  startTimer(type, durationMs, onComplete) {
    if (type === "learning") {
      this._startLearningTimer(durationMs, onComplete);
    } else if (type === "reward") {
      this._startRewardTimer(durationMs, onComplete);
    }
  }

  /**
   * Stop a timer of the specified type.
   * @param {string} type - Timer type: 'learning' or 'reward'
   */
  stopTimer(type) {
    const timer = this.timers[type];
    if (!timer) return;

    if (timer.intervalRef) {
      clearInterval(timer.intervalRef);
      timer.intervalRef = null;
    }
    timer.remaining = 0;
    timer.goal = 0;
    timer.elapsed = 0;
    timer.completed = false;
    timer.onComplete = null;
    timer.startedAt = null;

    this._persistState();
  }

  /**
   * Stop all timers.
   */
  stopAllTimers() {
    this.stopTimer("learning");
    this.stopTimer("reward");
    this._persistState();
  }

  /**
   * Get the current state of a timer.
   * @param {string} type - Timer type: 'learning' or 'reward'
   * @returns {Object} Timer state
   */
  getTimerState(type) {
    const timer = this.timers[type];
    if (!timer) {
      return { remaining: 0, goal: 0, elapsed: 0, active: false, completed: false };
    }

    return {
      remaining: timer.remaining,
      goal: timer.goal,
      elapsed: timer.elapsed,
      active: Boolean(timer.intervalRef),
      completed: type === "learning" ? timer.completed : (timer.remaining <= 0 && timer.goal > 0),
    };
  }

  /**
   * Extend a timer by adding duration.
   * @param {string} type - Timer type: 'learning' or 'reward'
   * @param {number} durationMs - Duration to add in milliseconds
   * @returns {boolean} Success
   */
  extendTimer(type, durationMs) {
    const timer = this.timers[type];
    if (!timer || type !== "reward" || !Number.isFinite(durationMs) || durationMs <= 0) {
      return false;
    }

    const now = Date.now();
    const hasUnifiedReward =
      timer.remaining > 0 ||
      (timer.goal > 0 && Boolean(timer.intervalRef));

    // Experimental reward windows are driven by rewardUnlockAt/shouldRedirect.
    // Keep those in sync so prompt gating does not reopen while snoozed.
    const legacyRemaining = Math.max(
      0,
      typeof this.rewardUnlockAt === "number" ? this.rewardUnlockAt - now : 0,
      typeof this.rewardTimeRemaining === "number" ? this.rewardTimeRemaining : 0
    );
    const hasLegacyReward = legacyRemaining > 0;

    if (hasUnifiedReward) {
      timer.remaining += durationMs;
      timer.goal += durationMs;
      this.rewardTimeRemaining = timer.remaining;
      this.rewardUnlockAt = now + timer.remaining;
      storage.rewardUnlock.set(this.rewardUnlockAt).catch(() => { });
      console.log(`[Timer] Extended ${type} timer by ${durationMs / 1000}s (unified)`);

      // Restart interval if it was stopped
      if (!timer.intervalRef && timer.remaining > 0) {
        console.log(`[Timer] Restarting ${type} timer interval`);
        timer.intervalRef = setInterval(() => {
          this._decrementReward().catch(() => { });
        }, 1000);
      }

      this._persistState();
      return true;
    }

    if (hasLegacyReward) {
      const nextRemaining = legacyRemaining + durationMs;
      this.rewardTimeRemaining = nextRemaining;
      this.rewardUnlockAt = now + nextRemaining;
      this.lastRewardExpirySignal = 0;
      storage.rewardUnlock.set(this.rewardUnlockAt).catch(() => { });
      storage.shouldRedirect.set(false).catch(() => { });
      console.log(`[Timer] Extended ${type} timer by ${durationMs / 1000}s (legacy)`);
      this._persistState();
      return true;
    }

    return false;
  }

  // ============================================
  // INTERNAL TIMER IMPLEMENTATIONS
  // ============================================

  _startLearningTimer(durationMs, onComplete) {
    // Stop any existing timers
    this.stopTimer("learning");
    this.stopTimer("reward");

    const timer = this.timers.learning;
    timer.goal = durationMs;
    timer.remaining = durationMs;
    timer.elapsed = 0;
    timer.completed = false;
    timer.onComplete = onComplete;
    timer.startedAt = Date.now();

    this.updateBadge();

    if (durationMs > 0) {
      timer.intervalRef = setInterval(() => {
        this._decrementLearning().catch(() => { });
      }, 1000);
    } else if (typeof onComplete === "function") {
      timer.completed = true;
      onComplete();
    }

    this._persistState();
  }

  _startRewardTimer(durationMs, onComplete) {
    // Stop learning timer but keep its state for reference
    this.stopTimer("learning");
    this.stopTimer("reward");

    const timer = this.timers.reward;
    timer.goal = durationMs;
    timer.remaining = durationMs;
    timer.elapsed = 0;
    timer.onComplete = onComplete;
    timer.startedAt = Date.now();

    // Also update legacy rewardUnlockAt for experimental variant overlay
    this.rewardUnlockAt = Date.now() + durationMs;
    storage.rewardUnlock.set(this.rewardUnlockAt).catch(() => { });

    this.updateBadge();

    if (durationMs > 0) {
      timer.intervalRef = setInterval(() => {
        this._decrementReward().catch(() => { });
      }, 1000);
    } else if (typeof onComplete === "function") {
      onComplete();
    }

    this._persistState();
  }

  async _decrementLearning() {
    const timer = this.timers.learning;

    if (!(await this.checkActive())) return;

    timer.elapsed += 1000;

    // Keep counting active learning time even after session completion.
    this.dailyProgress += 1000;
    await storage.dailyProgress.set(this.dailyProgress);

    if (timer.remaining > 0) {
      timer.remaining -= 1000;
      if (timer.remaining <= 0) {
        timer.remaining = 0;
        timer.completed = true;
        if (typeof timer.onComplete === "function") {
          const onComplete = timer.onComplete;
          timer.onComplete = null;
          onComplete();
        }
      }
    }

    this.updateBadge();
    this._persistState();
  }

  async _decrementReward() {
    const timer = this.timers.reward;
    timer.elapsed += 1000;

    if (timer.remaining > 0) {
      timer.remaining -= 1000;

      // Update legacy rewardTimeRemaining for overlay compatibility
      this.rewardTimeRemaining = timer.remaining;

      if (timer.remaining <= 0) {
        timer.remaining = 0;
        clearInterval(timer.intervalRef);
        timer.intervalRef = null;

        // Clear legacy storage
        this.rewardUnlockAt = 0;
        await storage.rewardUnlock.set(0);
        await storage.shouldRedirect.set(true);

        if (typeof timer.onComplete === "function") {
          timer.onComplete();
        }
      }

      this._persistState();
    }
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  async _persistState() {
    try {
      const state = {
        dailyGoal: this.dailyGoal,
        dailyProgress: this.dailyProgress,
        learning: {
          remaining: this.timers.learning.remaining,
          goal: this.timers.learning.goal,
          elapsed: this.timers.learning.elapsed,
          completed: this.timers.learning.completed,
          startedAt: this.timers.learning.startedAt,
        },
        reward: {
          remaining: this.timers.reward.remaining,
          goal: this.timers.reward.goal,
          elapsed: this.timers.reward.elapsed,
          startedAt: this.timers.reward.startedAt,
        },
        savedAt: Date.now(),
      };
      await browser.storage.local.set({ [TIMER_STORAGE_KEY]: state });
    } catch (_) { }
  }

  async _restoreState() {
    try {
      const result = await browser.storage.local.get(TIMER_STORAGE_KEY);
      const state = result?.[TIMER_STORAGE_KEY];
      if (!state) return;

      // Restore learning timer state without wall-clock adjustment.
      // Learning time is focus-based and should only move via _decrementLearning().
      if (state.learning) {
        this.timers.learning.goal = state.learning.goal || 0;
        this.timers.learning.elapsed = state.learning.elapsed || 0;
        this.timers.learning.completed = state.learning.completed || false;
        this.timers.learning.startedAt = state.learning.startedAt;
        if (!this.timers.learning.intervalRef) {
          this.timers.learning.remaining = Math.max(0, state.learning.remaining || 0);
        }
      }

      // Restore reward timer state
      if (state.reward) {
        this.timers.reward.goal = state.reward.goal || 0;
        this.timers.reward.elapsed = state.reward.elapsed || 0;
        this.timers.reward.startedAt = state.reward.startedAt;
        if (!this.timers.reward.intervalRef && state.reward.remaining > 0) {
          const timeSinceSave = Date.now() - state.savedAt;
          this.timers.reward.remaining = Math.max(0, state.reward.remaining - timeSinceSave);
        }
      }
    } catch (_) { }
  }

  // ============================================
  // DAILY GOAL & BADGE
  // ============================================

  computeProgressPercent() {
    if (this.dailyGoal <= 0) return 0;
    return Math.min(1, this.dailyProgress / this.dailyGoal);
  }

  getRemainingLabel() {
    if (this.dailyGoal <= 0) return "--";
    const remaining = Math.max(0, this.dailyGoal - this.dailyProgress);
    if (remaining <= 0) return "0m";

    const totalMinutes = Math.ceil(remaining / 60000);
    if (totalMinutes >= 60) {
      const hours = Math.ceil(totalMinutes / 60);
      return `${hours}h`;
    }

    return `${totalMinutes}m`;
  }

  updateBadge() {
    try {
      badge.setProgress(this.getRemainingLabel(), this.computeProgressPercent());
    } catch (_) { }
  }

  // ============================================
  // ACTIVITY CHECK
  // ============================================

  async checkActive() {
    const [isEnabled, fromTime, toTime] = await Promise.all([
      storage.redirection.get(),
      storage.operatingHours.from.get(),
      storage.operatingHours.to.get(),
    ]);
    if (!isEnabled) return false;

    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const currentMinutes = nowHours * 60 + nowMinutes;
    const startMinutes = (Number(fromTime?.hrs) || 0) * 60 + (Number(fromTime?.min) || 0);
    const endMinutes = (Number(toTime?.hrs) || 0) * 60 + (Number(toTime?.min) || 0);
    const inWindow =
      startMinutes === endMinutes
        ? true
        : startMinutes < endMinutes
          ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
          : currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    if (!inWindow) return false;

    const window = await browser.windows.getCurrent();
    const views = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getViews)
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

        try {
          const learningUri = await storage.learningUri.get();
          const isLearningTab =
            Boolean(learningUri) &&
            typeof current?.url === "string" &&
            siteDetector.isLearningSite(current.url, learningUri);

          // Only count as active if the current tab is both the origin tab AND still on the learning host
          if (origin && origin.tabId !== undefined && current.id === origin.tabId) {
            return isLearningTab;
          }

          // Otherwise allow active if current tab is on the learning site
          if (isLearningTab) {
            return true;
          }
        } catch (_) { }
      }
    }
    return false;
  }

  // ============================================
  // SYNC & GETTERS
  // ============================================

  async sync() {
    return this.syncDailyState();
  }

  async syncDailyState() {
    const goal = parseTime.toSystem(await storage.timeSettings.dailyGoal.get());
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress;

    // Sync legacy reward state
    this.rewardUnlockAt = await storage.rewardUnlock.get();
    if (this.rewardUnlockAt) {
      this.rewardTimeRemaining = Math.max(0, this.rewardUnlockAt - Date.now());
      if (this.rewardTimeRemaining === 0) {
        const expiredUnlockAt = this.rewardUnlockAt;
        this.rewardUnlockAt = 0;
        await storage.rewardUnlock.set(0);
        await storage.shouldRedirect.set(true);
        const isEnabled = await storage.redirection.get();

        // Service workers can restart during experimental reward windows.
        // Signal expiry on sync so the prompt flow still resumes.
        if (isEnabled && !isControlled() && expiredUnlockAt !== this.lastRewardExpirySignal) {
          this.lastRewardExpirySignal = expiredUnlockAt;
          try {
            await browser.runtime.sendMessage({ type: "reward:expired" });
          } catch (_) { }
        }
      }
    } else {
      this.rewardTimeRemaining = 0;
    }

    // Restore persisted timer state
    await this._restoreState();
    this.updateBadge();
  }

  async getControlledDurations() {
    // Read session duration from unified settings (used by both variants)
    const sessionDuration = await storage.timeSettings.sessionDuration.get();
    const learningMinutes = sessionDuration?.min || 5;
    const learningSeconds = sessionDuration?.sec || 0;

    // Reward time from controlledTimerSettings (unified for both variants)
    const rewardMinutes =
      (await storage.controlledTimerSettings?.rewardMinutes?.get?.()) || 2;
    const rewardSeconds =
      (await storage.controlledTimerSettings?.rewardSeconds?.get?.()) || 0;
    return {
      learningMs: (learningMinutes * 60 + learningSeconds) * 1000,
      rewardMs: (rewardMinutes * 60 + rewardSeconds) * 1000,
    };
  }

  /**
   * Get all timer data for UI consumption.
   * Provides both unified and legacy format for compatibility.
   */
  getTime() {
    return {
      // Unified timer state
      learningRemaining: this.timers.learning.remaining,
      learningGoal: this.timers.learning.goal,
      learningElapsed: this.timers.learning.elapsed,
      learningCompleted: this.timers.learning.completed,
      rewardRemaining: this.timers.reward.remaining,
      rewardGoal: this.timers.reward.goal,
      rewardElapsed: this.timers.reward.elapsed,

      // Daily progress
      dailyGoal: this.dailyGoal,
      dailyProgress: this.dailyProgress,

      // Legacy compatibility (experimental variant overlays)
      bonusTime: this.bonusTime,
      sessionElapsed: this.sessionElapsed,
      learningTimeRemaining: this.timers.learning.remaining || this.learningTimeRemaining,
      rewardTimeRemaining: this.timers.reward.remaining || this.rewardTimeRemaining,
      rewardUnlockAt: this.rewardUnlockAt,

      // Controlled variant compatibility (injection.js checks these)
      controlledLearningRemaining: this.timers.learning.remaining,
      controlledLearningGoal: this.timers.learning.goal,
      controlledLearningElapsed: this.timers.learning.elapsed,
      controlledLearningCompleted: this.timers.learning.completed,
      controlledRewardRemaining: this.timers.reward.remaining,
      controlledRewardGoal: this.timers.reward.goal,
      controlledRewardElapsed: this.timers.reward.elapsed,
    };
  }

  // ============================================
  // LEGACY API (for experimental variant compatibility)
  // These methods delegate to the unified system
  // ============================================

  async startLearningSession() {
    if (this.bonusTimeIntervalRef) this.stopBonusTime();
    if (this.learningTimeIntervalRef) clearInterval(this.learningTimeIntervalRef);
    this.clearRewardTimer();
    this.rewardTimeRemaining = 0;
    this.rewardUnlockAt = 0;
    storage.rewardUnlock.set(0).catch(() => { });
    badge.setBusy();

    // Load session duration (per-session time) and daily goal
    const sessionDuration = parseTime.toSystem(await storage.timeSettings.sessionDuration.get());
    const dailyGoal = parseTime.toSystem(await storage.timeSettings.dailyGoal.get());
    const progress = await storage.dailyProgress.get();

    this.dailyGoal = dailyGoal;
    this.dailyProgress = progress;
    this.sessionElapsed = 0;

    // Cap session duration to remaining daily goal (prevent session > remaining goal)
    const remainingGoal = Math.max(0, dailyGoal - progress);
    this.learningTimeRemaining = Math.min(sessionDuration, remainingGoal);

    this.updateBadge();
    if (this.learningTimeRemaining > 0) {
      this.learningTimeIntervalRef = setInterval(() => {
        this.decrementLearningTime().catch(() => { });
      }, 1000);
    } else {
      await this.handleSessionCompletion();
    }
  }

  async decrementLearningTime() {
    if (await this.checkActive()) {
      if (this.learningTimeRemaining > 0) {
        this.learningTimeRemaining -= 1000;
        if (this.learningTimeRemaining < 0) {
          this.learningTimeRemaining = 0;
        }
        // Track session elapsed time and daily progress
        this.sessionElapsed += 1000;
        this.dailyProgress += 1000;
        await storage.dailyProgress.set(this.dailyProgress);
        this.updateBadge();
        if (this.learningTimeRemaining === 0) {
          await this.handleSessionCompletion();
        }
      } else {
        await this.handleSessionCompletion();
      }
    }
  }

  async handleSessionCompletion() {
    this.learningTimeRemaining = 0;
    this.sessionElapsed = 0;
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;

    // Check if daily goal is met
    if (this.dailyProgress >= this.dailyGoal) {
      // Daily goal complete - no more redirects for the day
      await storage.dailyProgress.set(this.dailyProgress);
      await storage.shouldRedirect.set(false);
      this.updateBadge();
      this.bonusTime = 0;
    } else {
      // Session complete but daily goal not met - start reward timer
      this.updateBadge();
    }
  }

  stopLearningSession() {
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;
    // Preserve actual accumulated progress; do not derive progress from remaining session time.
    storage.dailyProgress.set(this.dailyProgress).catch(() => { });
    this.learningTimeRemaining = 0;
    badge.remove();
  }

  clearRewardTimer() {
    if (this.rewardTimeIntervalRef) {
      clearInterval(this.rewardTimeIntervalRef);
      this.rewardTimeIntervalRef = undefined;
    }
  }

  async decrementRewardTime(callback) {
    const isEnabled = await storage.redirection.get();
    if (!this.rewardUnlockAt) {
      this.rewardTimeRemaining = 0;
      this.clearRewardTimer();
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
      if (isEnabled && typeof callback === "function") callback();
      return;
    }

    this.rewardTimeRemaining = Math.max(0, this.rewardUnlockAt - Date.now());
    if (this.rewardTimeRemaining === 0) {
      this.clearRewardTimer();
      this.rewardUnlockAt = 0;
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
      if (isEnabled && typeof callback === "function") callback();
    }
  }

  async startProcrastinationSession(callback, rewardTime) {
    this.stopLearningSession();
    this.stopBonusTime();
    this.clearRewardTimer();

    this.rewardTimeRemaining = rewardTime;
    this.lastRewardExpirySignal = 0;

    if (this.rewardTimeRemaining <= 0) {
      this.rewardUnlockAt = 0;
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
      if (typeof callback === "function") callback();
      return;
    }

    this.rewardUnlockAt = Date.now() + this.rewardTimeRemaining;
    await storage.rewardUnlock.set(this.rewardUnlockAt);
    await storage.shouldRedirect.set(false);

    this.rewardTimeIntervalRef = setInterval(() => {
      this.decrementRewardTime(callback).catch(() => { });
    }, 1000);
  }

  async stopProcrastinationSession(callback) {
    this.clearRewardTimer();
    this.rewardTimeRemaining = 0;
    this.rewardUnlockAt = 0;
    await storage.rewardUnlock.set(0);
    await storage.shouldRedirect.set(true);
    if (typeof callback === "function") callback();
  }

  async incrementBonusTime() {
    if (await this.checkActive()) {
      if (this.bonusTime >= 0) {
        this.bonusTime += 1000;
      } else {
        this.bonusTime = 0;
      }
    }
  }

  startBonusTime() {
    if (this.bonusTimeIntervalRef) this.stopBonusTime();
    this.updateBadge();
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;
    this.bonusTimeIntervalRef = setInterval(() => {
      this.incrementBonusTime().catch(() => { });
    }, 1000);
  }

  stopBonusTime() {
    clearInterval(this.bonusTimeIntervalRef);
    this.bonusTime = 0;
    this.bonusTimeIntervalRef = undefined;
  }

  isLearningSessionActive() {
    return Boolean(this.learningTimeIntervalRef) || Boolean(this.timers.learning.intervalRef);
  }

  killAiki() {
    clearInterval(this.rewardTimeIntervalRef);
    this.rewardTimeIntervalRef = undefined;
    this.stopBonusTime();
    this.stopAllTimers();
    storage.shouldRedirect.set(true);
    storage.rewardUnlock.set(0).catch(() => { });
    this.rewardTimeRemaining = 0;
    this.rewardUnlockAt = 0;
    this.lastRewardExpirySignal = 0;
    this.bonusTime = 0;
    this.learningTimeRemaining = 0;
    this.dailyGoal = 0;
    this.dailyProgress = 0;
  }

  // ============================================
  // CONTROLLED VARIANT COMPATIBILITY ALIASES
  // These methods now delegate to the unified timer system
  // ============================================

  startControlledLearningSession(learningMs, onComplete) {
    this.startTimer("learning", learningMs, onComplete);
  }

  stopControlledLearningSession() {
    this.stopTimer("learning");
  }

  isControlledLearningActive() {
    return Boolean(this.timers.learning.intervalRef);
  }

  startControlledRewardSession(rewardMs, onComplete) {
    this.startTimer("reward", rewardMs, onComplete);
  }

  stopControlledRewardSession() {
    this.stopTimer("reward");
  }

  isControlledRewardActive() {
    return Boolean(this.timers.reward.intervalRef);
  }

  getControlledSessionState() {
    return {
      learningRemaining: this.timers.learning.remaining,
      learningGoal: this.timers.learning.goal,
      learningElapsed: this.timers.learning.elapsed,
      learningCompleted: this.timers.learning.completed,
      rewardRemaining: this.timers.reward.remaining,
      rewardGoal: this.timers.reward.goal,
      rewardElapsed: this.timers.reward.elapsed,
      isLearning: this.isControlledLearningActive(),
      isReward: this.isControlledRewardActive(),
    };
  }

  killControlledTimers() {
    this.stopAllTimers();
  }
}

export default new TimerManager();
