import storage from '../../util/storage';
import timer from '../../services/TimerManager';

/**
 * Start a time-wasting reward session. Reads reward duration from
 * timeSettings, floors to a 60s grace period when the configured value is
 * <= 0 (so skip/continue still unlocks the site briefly), disables further
 * redirects for the duration, and hands `checkActiveTab` to the timer so it
 * fires when the reward expires.
 * @param {() => Promise<void>} checkActiveTab - Re-checks the active tab when the reward expires.
 */
export async function startRewardSession(checkActiveTab) {
  const [rewardMinutes, rewardSeconds] = await Promise.all([
    storage.timeSettings.rewardMinutes.get(),
    storage.timeSettings.rewardSeconds.get(),
  ]);
  let rewardDuration = rewardMinutes * 60 * 1000 + rewardSeconds * 1000;
  if (rewardDuration <= 0) {
    rewardDuration = 60 * 1000;
  }
  await storage.shouldRedirect.set(false);
  await timer.startTimeWastingSession(checkActiveTab, rewardDuration);
}
