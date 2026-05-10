import browser from 'webextension-polyfill';
import { checkCurrentPageIsTimeWastingSite } from '../shared/hostMatch';
import { renderTimeWastingRewardOverlay } from '../overlays/rewardOverlay';

/**
 * Ask the background for current timer state. Returns null on any failure
 * (background not yet ready, port disconnected, etc.).
 */
async function fetchTimerState() {
  try {
    return await browser.runtime.sendMessage({ type: 'timer:get' });
  } catch {
    return null;
  }
}

/**
 * On page load: if reward mode is active and the current page is a
 * time-wasting site, render the reward overlay. A small delay gives the
 * background and DOM time to settle, then a `setTimeout` ensures the overlay
 * is appended after `document.body` exists.
 */
export async function bootstrapRewardOverlayIfNeeded() {
  try {
    const timerData = await fetchTimerState();
    if (
      !timerData ||
      (timerData.sessionRewardGoal <= 0) ||
      (timerData.sessionRewardRemaining <= 0)
    )
      return;

    if (!(await checkCurrentPageIsTimeWastingSite())) return;

    setTimeout(() => {
      if (!document.getElementById('aiki-reward-overlay')) {
        renderTimeWastingRewardOverlay();
      }
    }, 50);
  } catch {
    // swallow: background may not be ready yet.
  }
}
