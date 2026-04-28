import browser from 'webextension-polyfill';
import storage from '../util/storage';
import SessionService from '../services/SessionService';
import { getLearningUrl, isLearningSite } from '../services/siteDetector';
import { getActiveLearningTabs } from './shared/learningTabs';
import { startRewardSession } from './shared/rewardSession';

/**
 * Owns `gotoOrigin` — the flow that returns the user to their time-wasting
 * tab after a learning session (via skip, continue, or end-injection). It:
 *  1. Finalizes the learning session in SessionService.
 *  2. Clears content blockers and the time-wasting-loaded listener.
 *  3. Navigates the origin tab (or the currently active tab if origin is
 *     gone) back to the blocked URL and sets a prompt cooldown.
 *  4. Restores any other blocked tabs when the event is a "skip".
 *  5. Starts a reward session (or re-enables redirect) depending on whether
 *     any learning tabs remain.
 *
 * @param {object} deps
 * @param {object} deps.promptControl
 * @param {() => void} deps.removeOriginUpdatedListener
 * @param {() => Promise<void>} deps.getCheckActiveTab - Lazy getter so the
 *   orchestrator can bind checkActiveTab after all modules are constructed.
 */
export function createRestoreFlow({
  promptControl,
  removeOriginUpdatedListener,
  getCheckActiveTab,
}) {
  async function gotoOrigin(event, sourceContext = {}) {
    const normalizedEvent = event === 'injected' ? 'continue' : event;

    const statsHandler = storage.stats[normalizedEvent];
    if (typeof statsHandler === 'function') {
      await statsHandler();
    }

    const context =
      sourceContext && typeof sourceContext === 'object'
        ? sourceContext
        : { type: sourceContext };
    const { tabId: providedTabId, restoreAll } = context;

    const origin = await storage.origin.get();
    const blockedTabs = await storage.blockedTabs.get();
    const blockedTabIds = Array.isArray(blockedTabs) ? blockedTabs : [];
    const shouldRestoreAllTabs =
      typeof restoreAll === 'boolean' ? restoreAll : normalizedEvent === 'skip';
    const restoredTabIds = new Set();

    let targetTabId = providedTabId;
    if (targetTabId === undefined && origin && origin.tabId !== undefined) {
      targetTabId = origin.tabId;
    }
    if (targetTabId === undefined) {
      try {
        const [activeTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        targetTabId = activeTab?.id;
      } catch {}
    }

    // Read blockedOrigin before removeAllContentBlockers() clears storage.blockedOrigins
    const targetBlockedOrigin =
      targetTabId !== undefined
        ? await storage.blockedOrigins.get(targetTabId)
        : null;

    const sessionTabId = targetTabId !== undefined ? targetTabId : origin?.tabId;
    if (sessionTabId !== undefined) {
      await SessionService.finalizeSession(
        sessionTabId,
        'learning',
        normalizedEvent,
      );
    }

    removeOriginUpdatedListener();
    promptControl.removeTimeWastingLoadedListener();
    await promptControl.removeAllContentBlockers();

    // Persist the current learning-tab URL so the user returns to the same
    // page they were on, not just the root of the learning site.
    if (origin && origin.tabId !== undefined) {
      try {
        const learningTab = await browser.tabs.get(origin.tabId);
        const configuredLearning = await getLearningUrl();
        if (configuredLearning && isLearningSite(learningTab.url, configuredLearning)) {
          storage.learningUri.set(learningTab.url);
        }
      } catch (error) {
        console.log(error);
      }
    }

    storage.origin.remove();

    let destinationUrl = null;

    if (origin && origin.tabId !== undefined && origin.tabId === targetTabId) {
      try {
        await browser.tabs.update(origin.tabId, { url: origin.url });
        destinationUrl = origin.url;
        await promptControl.setPromptCooldown(origin.tabId, origin.url);
        restoredTabIds.add(origin.tabId);
      } catch (error) {
        console.log(error);
      }
    } else if (targetTabId !== undefined) {
      const blockedOrigin = targetBlockedOrigin;
      if (blockedOrigin) {
        await promptControl.removeContentBlocker(targetTabId);
        try {
          await browser.tabs.update(targetTabId, { url: blockedOrigin });
          destinationUrl = blockedOrigin;
          await promptControl.setPromptCooldown(targetTabId, blockedOrigin);
          restoredTabIds.add(targetTabId);
        } catch (error) {
          console.log(error);
        }
      }
    }

    if (!destinationUrl && origin && origin.tabId !== undefined) {
      try {
        await browser.tabs.update(origin.tabId, { url: origin.url });
        destinationUrl = origin.url;
        await promptControl.setPromptCooldown(origin.tabId, origin.url);
        restoredTabIds.add(origin.tabId);
      } catch (error) {
        console.log(error);
      }
    }

    if (shouldRestoreAllTabs && blockedTabIds.length > 0) {
      await Promise.allSettled(
        blockedTabIds
          .filter((tabId) => !restoredTabIds.has(tabId))
          .map(async (tabId) => {
            const url = await storage.blockedOrigins.get(tabId);
            await promptControl.removeContentBlocker(tabId);
            if (url) {
              try {
                await browser.tabs.update(tabId, { url });
                await promptControl.setPromptCooldown(tabId, url);
              } catch {}
            }
            restoredTabIds.add(tabId);
          }),
      );
    }

    const remainingLearningTabs = await getActiveLearningTabs(restoredTabIds);
    const hasRemainingLearningTabs = remainingLearningTabs.length > 0;

    // Start a time wasting session for the destination tab
    if (destinationUrl && targetTabId !== undefined) {
      await SessionService.startSession(
        targetTabId,
        'timeWasting',
        destinationUrl,
      );
    }

    const redirectionToggled = await storage.redirection.get();
    if (redirectionToggled && !hasRemainingLearningTabs) {
      await startRewardSession(getCheckActiveTab());
    } else if (hasRemainingLearningTabs) {
      await storage.shouldRedirect.set(true);
    }
  }

  return { gotoOrigin };
}
