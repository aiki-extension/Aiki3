import storage from '../util/storage';
import browser from 'webextension-polyfill';
import { parseTime, parseUrl } from '../util/utilities';
import { getLearningUrl } from './siteDetector';

class TimerManager {
  constructor() {
    // Daily goal timers
    this.learningTimeRemaining = 0;
    this.learningTimeIntervalRef = undefined;
    this.dailyGoal = 0;
    this.dailyProgress = 0;

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
    } catch {}
    clearInterval(this.learningTimeIntervalRef);
    this.learningTimeIntervalRef = undefined;
  }

  async syncDailyState() {
    const goal = parseTime.toSystem(
      await storage.timeSettings.learningTime.get(),
    );
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress; // Allow progress to exceed goal
    if (!this.learningTimeIntervalRef) {
      this.learningTimeRemaining = Math.max(goal - this.dailyProgress, 0);
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
      storage.dailyProgress.set(consumed).catch(() => {});
    }
    this.learningTimeRemaining = 0;
  }

  isLearningSessionActive() {
    return Boolean(this.learningTimeIntervalRef);
  }

  async checkActive() {
    const window = await browser.windows.getCurrent();
    const views =
      typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getViews
        ? chrome.runtime.getViews({ type: 'popup' })
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
          const learningUri = await getLearningUrl();
          const learningName = learningUri ? parseUrl(learningUri).name : '';

          // Only count time when the active tab is the redirected learning tab
          // and it's still on the learning site.
          if (
            origin &&
            origin.tabId !== undefined &&
            current.id === origin.tabId &&
            learningName &&
            current.url &&
            current.url.includes(learningName)
          ) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  }

  killAiki() {
    this.stopSessionRewardTimer();
    this.stopSessionTimer();
    storage.shouldRedirect.set(true);
    this.learningTimeRemaining = 0;
    this.dailyGoal = 0;
    this.dailyProgress = 0;
  }

  // Get session durations and reward durations from storage
  async getSessionAndRewardDurations() {
    const sessionMin = await storage.timeSettings.sessionMinutes.get();
    const sessionSec = await storage.timeSettings.sessionSeconds.get();
    const rewardMin = await storage.timeSettings.rewardMinutes.get();
    const rewardSec = await storage.timeSettings.rewardSeconds.get();
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
        this.dailyProgress += 1000;
        await storage.dailyProgress.set(this.dailyProgress);

        if (this.sessionRemaining <= 0) {
          this.sessionRemaining = 0;

          if (!this.sessionCompleted) {
            this.sessionCompleted = true;

            if (typeof this.sessionOnComplete === 'function') {
              this.sessionOnComplete();
              this.sessionOnComplete = null;
            }
          }
        }
      }
    }
  }

  // Start a learning session timer
  async startSessionTimer(durationMs, onComplete) {
    // Pause the daily timer while a session timer runs.
    if (this.learningTimeIntervalRef) {
      clearInterval(this.learningTimeIntervalRef);
      this.learningTimeIntervalRef = undefined;
    }

    this.stopSessionTimer();
    this.stopSessionRewardTimer();

    // Sync daily goal progress from storage before starting
    const goal = parseTime.toSystem(
      await storage.timeSettings.learningTime.get(),
    );
    const progress = await storage.dailyProgress.get();
    this.dailyGoal = goal;
    this.dailyProgress = progress;

    this.sessionGoal = durationMs;
    this.sessionRemaining = durationMs;
    this.sessionElapsed = 0;
    this.sessionCompleted = false;
    this.sessionOnComplete = onComplete;

    if (this.sessionRemaining > 0) {
      this.sessionIntervalRef = setInterval(() => {
        this.decrementSession().catch(() => {});
      }, 1000);
    } else if (typeof onComplete === 'function') {
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
        if (typeof this.sessionRewardOnComplete === 'function') {
          this.sessionRewardOnComplete();
        }
      }
    }
  }

  // Start session reward timer
  startSessionRewardTimer(durationMs, onComplete) {
    // Pause the daily timer while a session timer runs.
    if (this.learningTimeIntervalRef) {
      clearInterval(this.learningTimeIntervalRef);
      this.learningTimeIntervalRef = undefined;
    }

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
    } else if (typeof onComplete === 'function') {
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

  getTime() {
    return {
      learningTimeRemaining: this.learningTimeRemaining,
      dailyGoal: this.dailyGoal,
      dailyProgress: this.dailyProgress,
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
