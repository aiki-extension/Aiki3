import storage from "../util/storage";
import browser from "webextension-polyfill";
import { parseTime, parseUrl } from "../util/utilities";

class TimerManager {
  constructor() {
    // Daily goal timers
    this.learningTimeRemaining = 0;
    this.learningTimeIntervalRef = undefined;
    this.dailyGoal = 0;
    this.dailyProgress = 0;

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

    // Session duration timers
    this.sessionRemaining = 0;
    this.sessionIntervalRef = undefined;
    this.sessionGoal = 0;
    this.sessionElapsed = 0;
    this.sessionCompleted = false;
    this.sessionOnComplete = null;

    this.sessionRewardRemaining = 0;
    this.sessionRewardIntervalRef = undefined;
    this.sessionRewardGoal = 0;
    this.sessionRewardElapsed = 0;
    this.sessionRewardOnComplete = null;
  }

  computeProgressPercent() {
    if (this.dailyGoal <= 0) return 0;
    return Math.min(1, this.dailyProgress / this.dailyGoal);
  }

  getRemainingLabel() {
    const minutes = Math.max(0, Math.ceil(this.learningTimeRemaining / 60000));
    return `${minutes}m`;
  }

  async decrementLearningTime() {
    if (await this.checkActive()) {
      if (this.learningTimeRemaining > 0) {
        this.learningTimeRemaining -= 1000;
        if (this.learningTimeRemaining < 0) {
          this.learningTimeRemaining = 0;
        }
        this.dailyProgress = this.dailyProgress + 1000;
        await storage.dailyProgress.set(this.dailyProgress);
        if (this.learningTimeRemaining === 0) {
          await this.handleGoalCompletion();
        }
      } else {
        await this.handleGoalCompletion();
      }
    }
  }

  async handleGoalCompletion() {
    this.learningTimeRemaining = 0;
    // dailyProgress can exceed dailyGoal when user continues learning past their goal
    await storage.dailyProgress.set(this.dailyProgress);
    try {
      await storage.shouldRedirect.set(false);
    } catch (_) { }
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;
    this.bonusTime = 0;
  }

  async startLearningSession() {
    if (this.bonusTimeIntervalRef) this.stopBonusTime();
    if (this.learningTimeIntervalRef) clearInterval(this.learningTimeIntervalRef);
    this.clearRewardTimer();
    this.rewardTimeRemaining = 0;
    this.rewardUnlockAt = 0;
    storage.rewardUnlock.set(0).catch(() => { });
    const goal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress; // Allow progress to exceed goal
    this.learningTimeRemaining = Math.max(goal - this.dailyProgress, 0);
    if (this.learningTimeRemaining > 0) {
      this.learningTimeIntervalRef = setInterval(() => {
        this.decrementLearningTime().catch(() => { });
      }, 1000);
    } else {
      await this.handleGoalCompletion();
    }
  }

  async syncDailyState() {
    const goal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress; // Allow progress to exceed goal
    if (!this.learningTimeIntervalRef) {
      this.learningTimeRemaining = Math.max(goal - this.dailyProgress, 0);
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
    const learningMinutes =
      (await storage.controlledTimerSettings?.learningMinutes?.get?.()) || 5;
    const learningSeconds =
      (await storage.controlledTimerSettings?.learningSeconds?.get?.()) || 0;
    const rewardMinutes =
      (await storage.controlledTimerSettings?.rewardMinutes?.get?.()) || 15;
    const rewardSeconds =
      (await storage.controlledTimerSettings?.rewardSeconds?.get?.()) || 0;
    return {
      learningMs: (learningMinutes * 60 + learningSeconds) * 1000,
      rewardMs: (rewardMinutes * 60 + rewardSeconds) * 1000,
    };
  }

  // Get session durations and reward durations from storage
  async getSessionAndRewardDurations() {
  const sessionMin = await storage.sessionSettings.sessionMinutes.get();
  const sessionSec = await storage.sessionSettings.sessionSeconds.get();
  const rewardMin = await storage.sessionSettings.rewardMinutes.get();
  const rewardSec = await storage.sessionSettings.rewardSeconds.get();
  return {
    sessionMs: (sessionMin * 60 + sessionSec) * 1000,
    rewardMs: (rewardMin * 60 + rewardSec) * 1000,
  };
  }

  // Decrement session timer
  async decrementSession() {
    if (await this.checkActive()) {
      this.sessionElapsed += 1000;
      
      if (this.sessionRemaining > 0) {
        this.sessionRemaining -= 1000;
        this.dailyProgress += 1000; // Also update daily progress
        await storage.dailyProgress.set(this.dailyProgress);
        
        if (this.sessionRemaining <= 0) {
          this.sessionRemaining = 0;
          this.sessionCompleted = true;
          if (typeof this.sessionOnComplete === "function") {
            this.sessionOnComplete();
            this.sessionOnComplete = null;
          }
        }
      }
    }
  }

  // Start a learning session timer
  startSessionTimer(durationMs, onComplete) {
    this.stopSessionTimer();
    this.stopSessionRewardTimer();
    
    this.sessionGoal = durationMs;
    this.sessionRemaining = durationMs;
    this.sessionElapsed = 0;
    this.sessionCompleted = false;
    this.sessionOnComplete = onComplete;
    
    if (this.sessionRemaining > 0) {
      this.sessionIntervalRef = setInterval(() => {
        this.decrementSession().catch(() => {});
      }, 1000);
    } else if (typeof onComplete === "function") {
      onComplete();
    }
  }

  // Stop session timer
  stopSessionTimer() {
    if (this.sessionIntervalRef) {
      clearInterval(this.sessionIntervalRef);
      this.sessionIntervalRef = undefined;
    }
    this.sessionRemaining = 0;
    this.sessionGoal = 0;
    this.sessionElapsed = 0;
    this.sessionCompleted = false;
    this.sessionOnComplete = null;
  }

  // Check if session timer is running
  isSessionActive() {
    return Boolean(this.sessionIntervalRef);
  }

  // Decrement session reward timer
  async decrementSessionReward() {
    this.sessionRewardElapsed += 1000;
    
    if (this.sessionRewardRemaining > 0) {
      this.sessionRewardRemaining -= 1000;
      if (this.sessionRewardRemaining <= 0) {
        this.sessionRewardRemaining = 0;
        clearInterval(this.sessionRewardIntervalRef);
        this.sessionRewardIntervalRef = undefined;
        if (typeof this.sessionRewardOnComplete === "function") {
          this.sessionRewardOnComplete();
        }
      }
    }
  }

  // Start session reward timer
  startSessionRewardTimer(durationMs, onComplete) {
    this.stopSessionTimer();
    this.stopSessionRewardTimer();
    
    this.sessionRewardGoal = durationMs;
    this.sessionRewardRemaining = durationMs;
    this.sessionRewardElapsed = 0;
    this.sessionRewardOnComplete = onComplete;
    
    if (this.sessionRewardRemaining > 0) {
      this.sessionRewardIntervalRef = setInterval(() => {
        this.decrementSessionReward().catch(() => {});
      }, 1000);
    } else if (typeof onComplete === "function") {
      onComplete();
    }
  }


  // Stop session reward timer
  stopSessionRewardTimer() {
    if (this.sessionRewardIntervalRef) {
      clearInterval(this.sessionRewardIntervalRef);
      this.sessionRewardIntervalRef = undefined;
    }
    this.sessionRewardRemaining = 0;
    this.sessionRewardGoal = 0;
    this.sessionRewardElapsed = 0;
    this.sessionRewardOnComplete = null;
  }

  // Check if session reward timer is running
  isSessionRewardActive() {
    return Boolean(this.sessionRewardIntervalRef);
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
    if (type === "reward" && this.isControlledRewardActive()) {
      this.controlledRewardRemaining += durationMs;
      this.controlledRewardGoal += durationMs;
      console.log(`[Timer] Extended reward timer by ${durationMs / 1000}s`);
    }
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

      // Session Duration and Reward relevant code
      sessionRemaining: this.sessionRemaining,
      sessionGoal: this.sessionGoal,
      sessionElapsed: this.sessionElapsed,
      sessionCompleted: this.sessionCompleted,
      sessionRewardRemaining: this.sessionRewardRemaining,
      sessionRewardGoal: this.sessionRewardGoal,
    };
  }
}

export default new TimerManager();
