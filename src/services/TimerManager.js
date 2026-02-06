import storage from "../util/storage";
import browser from "webextension-polyfill";
import badge from "../badge";
import { parseTime, parseUrl } from "../util/utilities";

class TimerManager {
  constructor() {
    // Daily goal and session timers
    this.learningTimeRemaining = 0;
    this.learningTimeIntervalRef = undefined;
    this.dailyGoal = 0;
    this.dailyProgress = 0;
    this.sessionElapsed = 0;

    // Reward timers (experimental variant)
    this.rewardTimeRemaining = 0;
    this.rewardTimeIntervalRef = undefined;
    this.rewardUnlockAt = 0;

    // Bonus timer (experimental variant)
    this.bonusTime = 0;
    this.bonusTimeIntervalRef = undefined;

    // Controlled variant timers
    this.controlledLearningRemaining = 0;
    this.controlledLearningIntervalRef = undefined;
    this.controlledLearningGoal = 0;
    this.controlledLearningElapsed = 0;
    this.controlledLearningCompleted = false;
    this.controlledLearningOnComplete = null;

    this.controlledRewardRemaining = 0;
    this.controlledRewardIntervalRef = undefined;
    this.controlledRewardGoal = 0;
    this.controlledRewardElapsed = 0;
    this.controlledRewardOnComplete = null;
  }

  computeProgressPercent() {
    if (this.dailyGoal <= 0) return 0;
    return Math.min(1, this.dailyProgress / this.dailyGoal);
  }

  getRemainingLabel() {
    const minutes = Math.max(0, Math.ceil(this.learningTimeRemaining / 60000));
    return `${minutes}m`;
  }

  updateBadge() {
    try {
      badge.setProgress(this.getRemainingLabel(), this.computeProgressPercent());
    } catch (_) { }
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
      badge.setProgress("✓", 1);
      this.bonusTime = 0;
    } else {
      // Session complete but daily goal not met - start reward timer
      // Reward timer will be started by the calling code (redirection.js)
      badge.setProgress(this.getRemainingLabel(), this.computeProgressPercent());
    }
  }

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

  async syncDailyState() {
    const goal = parseTime.toSystem(await storage.timeSettings.dailyGoal.get());
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress;
    // Don't modify learningTimeRemaining if a session is active
    if (!this.learningTimeIntervalRef) {
      // No active session - clear remaining
      this.learningTimeRemaining = 0;
    }
    this.rewardUnlockAt = await storage.rewardUnlock.get();
    if (this.rewardUnlockAt) {
      this.rewardTimeRemaining = Math.max(0, this.rewardUnlockAt - Date.now());
      if (this.rewardTimeRemaining === 0) {
        this.rewardUnlockAt = 0;
        storage.rewardUnlock.set(0).catch(() => { });
        storage.shouldRedirect.set(true);
      }
    } else {
      this.rewardTimeRemaining = 0;
    }
    this.updateBadge();
  }

  async sync() {
    return this.syncDailyState();
  }

  stopLearningSession() {
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;
    if (this.dailyGoal > 0) {
      const consumed = Math.max(0, this.dailyGoal - this.learningTimeRemaining);
      storage.dailyProgress.set(consumed).catch(() => { });
    }
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
    if (!this.rewardUnlockAt) {
      this.rewardTimeRemaining = 0;
      this.clearRewardTimer();
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
      if (typeof callback === "function") callback();
      return;
    }

    this.rewardTimeRemaining = Math.max(0, this.rewardUnlockAt - Date.now());
    if (this.rewardTimeRemaining === 0) {
      this.clearRewardTimer();
      this.rewardUnlockAt = 0;
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
      if (typeof callback === "function") callback();
    }
  }

  async startProcrastinationSession(callback, rewardTime) {
    this.stopLearningSession();
    this.stopBonusTime();
    this.clearRewardTimer();

    this.rewardTimeRemaining = rewardTime;

    if (this.rewardTimeRemaining <= 0) {
      this.rewardUnlockAt = 0;
      await storage.rewardUnlock.set(0);
      await storage.shouldRedirect.set(true);
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
    badge.setProgress("0m", 1);
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
    return Boolean(this.learningTimeIntervalRef);
  }

  async checkActive() {
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
          const learningName = learningUri ? parseUrl(learningUri).name : "";

          // Only count as active if the current tab is both the origin tab AND still on the learning host
          if (origin && origin.tabId !== undefined && current.id === origin.tabId) {
            if (learningName && current.url && current.url.includes(learningName)) {
              return true;
            }
            return false;
          }

          // Otherwise allow active if current tab is on the learning site
          if (learningName && current.url && current.url.includes(learningName)) {
            return true;
          }
        } catch (_) { }
      }
    }
    return false;
  }

  killAiki() {
    clearInterval(this.rewardTimeIntervalRef);
    this.rewardTimeIntervalRef = undefined;
    this.stopBonusTime();
    storage.shouldRedirect.set(true);
    storage.rewardUnlock.set(0).catch(() => { });
    this.rewardTimeRemaining = 0;
    this.rewardUnlockAt = 0;
    this.bonusTime = 0;
    this.learningTimeRemaining = 0;
    this.dailyGoal = 0;
    this.dailyProgress = 0;
  }

  // Controlled timers
  async decrementControlledLearning() {
    if (await this.checkActive()) {
      this.controlledLearningElapsed += 1000;

      // Also increment daily progress for controlled variant
      this.dailyProgress += 1000;
      await storage.dailyProgress.set(this.dailyProgress);

      if (this.controlledLearningRemaining > 0) {
        this.controlledLearningRemaining -= 1000;
        if (this.controlledLearningRemaining <= 0) {
          this.controlledLearningRemaining = 0;
          this.controlledLearningCompleted = true;
          if (typeof this.controlledLearningOnComplete === "function") {
            this.controlledLearningOnComplete();
            this.controlledLearningOnComplete = null;
          }
        }
      }
    }
  }

  startControlledLearningSession(learningMs, onComplete) {
    this.stopControlledLearningSession();
    this.stopControlledRewardSession();

    this.controlledLearningGoal = learningMs;
    this.controlledLearningRemaining = learningMs;
    this.controlledLearningElapsed = 0;
    this.controlledLearningCompleted = false;
    this.controlledLearningOnComplete = onComplete;

    badge.setBusy();

    if (this.controlledLearningRemaining > 0) {
      this.controlledLearningIntervalRef = setInterval(() => {
        this.decrementControlledLearning().catch(() => { });
      }, 1000);
    } else if (typeof onComplete === "function") {
      onComplete();
    }
  }

  stopControlledLearningSession() {
    if (this.controlledLearningIntervalRef) {
      clearInterval(this.controlledLearningIntervalRef);
      this.controlledLearningIntervalRef = undefined;
    }
    this.controlledLearningRemaining = 0;
    this.controlledLearningGoal = 0;
    this.controlledLearningElapsed = 0;
    this.controlledLearningCompleted = false;
    this.controlledLearningOnComplete = null;
  }

  isControlledLearningActive() {
    return Boolean(this.controlledLearningIntervalRef);
  }

  async decrementControlledReward() {
    this.controlledRewardElapsed += 1000;

    if (this.controlledRewardRemaining > 0) {
      this.controlledRewardRemaining -= 1000;
      if (this.controlledRewardRemaining <= 0) {
        this.controlledRewardRemaining = 0;
        clearInterval(this.controlledRewardIntervalRef);
        this.controlledRewardIntervalRef = undefined;
        if (typeof this.controlledRewardOnComplete === "function") {
          this.controlledRewardOnComplete();
        }
      }
    }
  }

  startControlledRewardSession(rewardMs, onComplete) {
    this.stopControlledLearningSession();
    this.stopControlledRewardSession();

    this.controlledRewardGoal = rewardMs;
    this.controlledRewardRemaining = rewardMs;
    this.controlledRewardElapsed = 0;
    this.controlledRewardOnComplete = onComplete;

    badge.setProgress("🎉", 1);

    if (this.controlledRewardRemaining > 0) {
      this.controlledRewardIntervalRef = setInterval(() => {
        this.decrementControlledReward().catch(() => { });
      }, 1000);
    } else if (typeof onComplete === "function") {
      onComplete();
    }
  }

  stopControlledRewardSession() {
    if (this.controlledRewardIntervalRef) {
      clearInterval(this.controlledRewardIntervalRef);
      this.controlledRewardIntervalRef = undefined;
    }
    this.controlledRewardRemaining = 0;
    this.controlledRewardGoal = 0;
    this.controlledRewardOnComplete = null;
  }

  isControlledRewardActive() {
    return Boolean(this.controlledRewardIntervalRef);
  }

  getControlledSessionState() {
    return {
      learningRemaining: this.controlledLearningRemaining,
      learningGoal: this.controlledLearningGoal,
      learningElapsed: this.controlledLearningElapsed,
      learningCompleted: this.controlledLearningCompleted,
      rewardRemaining: this.controlledRewardRemaining,
      rewardGoal: this.controlledRewardGoal,
      rewardElapsed: this.controlledRewardElapsed,
      isLearning: this.isControlledLearningActive(),
      isReward: this.isControlledRewardActive(),
    };
  }

  killControlledTimers() {
    this.stopControlledLearningSession();
    this.stopControlledRewardSession();
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

  stopAllTimers() {
    this.killControlledTimers();
  }

  startTimer(type, durationMs, onComplete) {
    if (type === "learning") {
      this.startControlledLearningSession(durationMs, onComplete);
    } else if (type === "reward") {
      this.startControlledRewardSession(durationMs, onComplete);
    }
  }

  getTimerState(type) {
    if (type === "learning") {
      return {
        remaining: this.controlledLearningRemaining,
        goal: this.controlledLearningGoal,
        active: this.isControlledLearningActive(),
        elapsed: this.controlledLearningElapsed,
        completed: this.controlledLearningCompleted,
      };
    } else if (type === "reward") {
      return {
        remaining: this.controlledRewardRemaining,
        goal: this.controlledRewardGoal,
        active: this.isControlledRewardActive(),
        elapsed: this.controlledRewardElapsed,
        completed: this.controlledRewardRemaining <= 0 && this.controlledRewardGoal > 0,
      };
    }
    return { remaining: 0, goal: 0, active: false, elapsed: 0, completed: false };
  }

  extendTimer(type, durationMs) {
    if (type === "reward") {
      // Add time to the reward timer
      this.controlledRewardRemaining += durationMs;
      this.controlledRewardGoal += durationMs;
      console.log(`[Timer] Extended reward timer by ${durationMs / 1000}s`);

      // If the interval was stopped (timer completed), restart it
      if (!this.controlledRewardIntervalRef && this.controlledRewardRemaining > 0) {
        console.log(`[Timer] Restarting reward timer interval`);
        this.controlledRewardIntervalRef = setInterval(() => {
          this.decrementControlledReward().catch(() => { });
        }, 1000);
      }
      return true;
    }
    return false;
  }

  getTime() {
    return {
      bonusTime: this.bonusTime,
      learningTimeRemaining: this.learningTimeRemaining,
      rewardTimeRemaining: this.rewardTimeRemaining,
      dailyGoal: this.dailyGoal,
      dailyProgress: this.dailyProgress,
      rewardUnlockAt: this.rewardUnlockAt,
      controlledLearningRemaining: this.controlledLearningRemaining,
      controlledLearningGoal: this.controlledLearningGoal,
      controlledRewardRemaining: this.controlledRewardRemaining,
      controlledRewardGoal: this.controlledRewardGoal,
    };
  }
}

export default new TimerManager();
