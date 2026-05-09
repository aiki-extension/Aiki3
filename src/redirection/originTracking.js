import browser from 'webextension-polyfill';
import storage from '../util/storage';
import timer from '../services/TimerManager';
import SessionService from '../services/SessionService';
import { getLearningUrl, isLearningSite } from '../services/siteDetector';
import { getActiveLearningTabs } from './shared/learningTabs';

/**
 * Owns the two browser event listeners that track the origin tab (the
 * time-wasting tab that triggered a redirect to the learning site):
 *
 *  - tabs.onRemoved: when the origin tab is closed, either migrate the
 *    active session to a remaining learning tab or tear everything down.
 *  - tabs.onUpdated: when a URL change on the origin tab still lands on
 *    the learning site, keep storage.learningUri current.
 *
 * @param {object} deps
 * @param {object} deps.promptControl - For clearing content blockers on teardown.
 * @param {(tabId: number) => void} deps.triggerLearningOverlay - Schedules
 *   the learning overlay on the replacement tab after migration.
 */
export function createOriginTracking({
  promptControl,
  triggerLearningOverlay,
}) {
  // tabs.onUpdated fires with (tabId, changeInfo, tab).
  // The first arg is a numeric tabId, not a details object.
  async function originUpdatedListener(tabId) {
    const origin = await storage.origin.get();
    if (!origin || origin.tabId !== tabId) return;
    try {
      const tab = await browser.tabs.get(tabId);
      const currentLearning = await getLearningUrl();
      if (currentLearning && isLearningSite(tab.url, currentLearning)) {
        storage.learningUri.set(tab.url);
      }
    } catch {}
  }

  function addOriginUpdatedListener() {
    browser.tabs.onUpdated.addListener(originUpdatedListener);
  }

  function removeOriginUpdatedListener() {
    browser.tabs.onUpdated.removeListener(originUpdatedListener);
  }

  // tabs.onRemoved fires with the closed tabId.
  async function onOriginRemoved(closedTabId) {
    const origin = await storage.origin.get();
    if (!origin || closedTabId !== origin.tabId) return;

    // Look for a remaining tab on the learning site to migrate the session to.
    let migrated = false;
    const candidates = await getActiveLearningTabs(new Set([closedTabId]));
    const replacement = candidates[0];
    if (replacement) {
      try {
        storage.origin.set({ url: replacement.url, tabId: replacement.id });
        addOriginUpdatedListener();
        setTimeout(() => triggerLearningOverlay(replacement.id), 150);
        await SessionService.transferActiveSession(closedTabId, replacement.id);
        migrated = true;
      } catch (error) {
        console.log(error);
      }
    }

    if (!migrated) {
      console.log('Learning tab closed');
      removeOriginUpdatedListener();
      promptControl.removeAllContentBlockers();
      // Strip tabId so a direct navigation to the learning site in a new tab
      // won't trigger the overlay, but keep origin set so the content blocker
      // still fires if the user visits a time-wasting site.
      storage.origin.set({ url: origin.url });
      await SessionService.finalizeSession(
        closedTabId,
        'learning',
        'tab_closed',
      );
      timer.stopLearningSession();
      timer.pauseSessionTimer();

      // Don't re-enable redirects if a session reward is currently active —
      // closing the origin tab while on reward time should not cancel the reward.
      if (!timer.isSessionRewardActive()) {
        storage.shouldRedirect.set(true);
      }
    }
  }

  function addOriginTabCloseListener() {
    browser.tabs.onRemoved.addListener(onOriginRemoved);
  }

  function removeOriginTabCloseListener() {
    browser.tabs.onRemoved.removeListener(onOriginRemoved);
  }

  return {
    addOriginUpdatedListener,
    removeOriginUpdatedListener,
    addOriginTabCloseListener,
    removeOriginTabCloseListener,
  };
}
