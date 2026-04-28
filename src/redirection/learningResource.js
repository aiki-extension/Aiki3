import browser from 'webextension-polyfill';
import timer from '../services/TimerManager';
import { getLearningUrl } from '../services/siteDetector';
import { parseUrl } from '../util/utilities';

/**
 * Owns the webNavigation `onCompleted` listener for the configured learning
 * host and the message handshake with the learning content script. The
 * content script replies with an action: `continue` (user wants to return
 * to the time-wasting tab — caller's `gotoOrigin` runs) or `end injection`
 * (the learning panel finished and just wants the listener removed). Owns
 * the `shouldShowWelcome` flag so the welcome message only appears on the
 * first message of a session.
 *
 * @param {object} deps
 * @param {object} deps.navigationGuards - Used to drop the immediate-prompt
 *   and preemptive-hide overlays once the content script has acknowledged.
 * @param {(event: string, context: object) => Promise<void>} deps.gotoOrigin -
 *   Called on the user's "continue" action.
 */
export function createLearningResource({ navigationGuards, gotoOrigin }) {
  let shouldShowWelcome = true;

  async function addLearningSiteLoadedListener() {
    const currentLearning = await getLearningUrl();
    if (!currentLearning) return;
    const learningName = parseUrl(currentLearning).name;
    if (!learningName) return;
    browser.webNavigation.onCompleted.addListener(messageLearningResource, {
      url: [{ hostContains: `.${learningName}.` }],
    });
  }

  // Fallback trigger in case webNavigation timing misses injection readiness.
  async function triggerLearningOverlay(tabId) {
    try {
      await messageLearningResource({ tabId });
    } catch {}
  }

  function removeLearningSiteLoadedListener() {
    console.log('Removing Leaning site loaded listener');
    browser.webNavigation.onCompleted.removeListener(messageLearningResource);
    shouldShowWelcome = true;
  }

  async function messageLearningResource(details) {
    try {
      const response = await browser.tabs
        .sendMessage(details.tabId, {
          action: 'display: encouragement',
          countdown: timer.getTime().learningTimeRemaining,
          shouldShowWelcome,
        })
        .catch(() => null);

      if (!response || typeof response !== 'object') {
        setTimeout(() => triggerLearningOverlay(details.tabId), 250);
        return;
      }

      // Pre-extraction this called a bare `hideImmediatePrompt(...)` that was
      // never defined locally — every learning-tab message threw a silently
      // swallowed ReferenceError, leaving the immediate-prompt overlay in
      // place and the action branches below unreachable. Wired through
      // navigationGuards now so the overlay actually clears.
      await navigationGuards.hideImmediatePrompt(details.tabId);
      await navigationGuards.removePreemptiveHide(details.tabId);
      shouldShowWelcome = false;
      const { action, source } = response;
      if (action === 'continue') {
        gotoOrigin('continue', {
          type: source,
          tabId: details.tabId,
          restoreAll: false,
        });
        removeLearningSiteLoadedListener();
      } else if (action === 'end injection') {
        removeLearningSiteLoadedListener();
      }
    } catch {}
  }

  return {
    addLearningSiteLoadedListener,
    removeLearningSiteLoadedListener,
    triggerLearningOverlay,
  };
}
