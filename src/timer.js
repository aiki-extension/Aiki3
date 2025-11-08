import storage from "./util/storage";
import browser from "webextension-polyfill";
import badge from "./badge";
import { parseTimerDown, parseTime, parseUrl } from "./util/utilities";

let learningTimeRemaining = 0;
let learningTimeIntervalRef;
let dailyGoal = 0;
let dailyProgress = 0;

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
      try {
        badge.setText(parseTimerDown(learningTimeRemaining));
      } catch (_) {}
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
  badge.setDone();
  badge.setText("Goal");
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
  try {
    badge.setText(parseTimerDown(learningTimeRemaining));
  } catch (_) {}
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
  badge.setDone();
  badge.setText("Done");
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

function getTime() {
  return {
    bonusTime: bonusTime,
    learningTimeRemaining: learningTimeRemaining,
    rewardTimeRemaining: rewardTimeRemaining,
    dailyGoal,
    dailyProgress,
    rewardUnlockAt,
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
};
