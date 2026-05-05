import browser from 'webextension-polyfill';
import storage from '../util/storage';
import timer from '../services/TimerManager';
import { parseTime } from '../util/utilities';
import SessionService from '../services/SessionService';
import { getLearningUrl } from '../services/siteDetector';
import { checkActiveTime } from './shared/operatingHours';
import { startRewardSession } from './shared/rewardSession';
import { isOriginTabStillOnLearningSite } from './shared/originValidation';
import { isTrackedTimeWastingUrl } from './shared/siteFilter';

/**
 * Owns the outbound redirect pipeline:
 *  - `redirect(details, immediate)` — decision: should we intercept this
 *    navigation, show a prompt, or start a reward?
 *  - `redirectTo(tabId, learningUri, procUrl)` — execute the redirect: swap
 *    the tab to the learning site and set up session tracking.
 *  - `dispatchPrompt(tabId, learningUri, procUrl)` — route to the correct UI
 *    (renderContentBlocker when a session is active, promptRedirect otherwise).
 *  - `promptRedirect(tabId, url, originUrl)` — send the redirect prompt to
 *    the content script with all flow-specific callbacks wired in.
 *
 * @param {object} deps
 * @param {object} deps.navigationGuards
 * @param {object} deps.promptControl
 * @param {{ handleNavigation: Function }} deps.strategy
 * @param {() => Promise<void>} deps.addLearningSiteLoadedListener
 * @param {() => void} deps.addOriginUpdatedListener
 * @param {() => void} deps.removeOriginUpdatedListener
 * @param {(tabId: number) => void} deps.triggerLearningOverlay
 * @param {() => Function} deps.getCheckActiveTab - Lazy getter for checkActiveTab.
 */
export function createRedirectFlow({
  navigationGuards,
  promptControl,
  strategy,
  addLearningSiteLoadedListener,
  addOriginUpdatedListener,
  removeOriginUpdatedListener,
  triggerLearningOverlay,
  getCheckActiveTab,
}) {
  async function redirectTo(tabId, learningUri, procUrl) {
    addLearningSiteLoadedListener();
    navigationGuards.install();
    await SessionService.startSession(tabId, 'learning', learningUri, procUrl);
    storage.origin.set({ url: procUrl });
    addOriginUpdatedListener();
    await storage.globalPromptLock.remove();

    try {
      navigationGuards.scheduleRevealOnLoad(tabId);
      await browser.tabs.update(tabId, { url: learningUri });
      setTimeout(() => triggerLearningOverlay(tabId), 1500);
    } catch (error) {
      console.log(error);
    }
  }

  // Checks origin at call time and routes to the correct UI.
  // Using this instead of deciding at queue time avoids async races where origin
  // changes between when the intent is queued and when it fires.
  async function dispatchPrompt(tabId, learningUri, procUrl) {
    const origin = await storage.origin.get();
    const flags = await storage.featureFlags.get();
    const promptEnabled = !flags.redirectPrompt;
    console.log('promptEnabled is: ' + promptEnabled);
    if (!promptEnabled) {
      // Skip prompt and instant redirect instead
      redirectTo(tabId, learningUri, procUrl);
      return;
    }

    if (origin) {
      promptControl.renderContentBlocker({ tabId, frameId: 0, url: procUrl });
    } else {
      promptRedirect(tabId, learningUri, procUrl);
    }
  }

  async function promptRedirect(tabId, url, originUrl) {
    await promptControl.promptRedirect(tabId, url, originUrl, {
      onConnectionFailed: () => {
        // The tab navigated away before the content script could respond (e.g.
        // an auth redirect mid-load). Re-queue via dispatchPrompt so origin is
        // re-checked when the tab settles — avoids overwriting a newer
        // renderContentBlocker intent.
        promptControl.queuePendingIntent(tabId, () =>
          dispatchPrompt(tabId, url, originUrl),
        );
      },
      onContinue: async () => {
        // Set global prompt lock now that user has explicitly clicked Stay.
        // This prevents the prompt from appearing again for 10 minutes (across
        // all tabs).
        await storage.globalPromptLock.set({ timestamp: Date.now() });
        console.log('Lock engaged');

        // Start tracking procrastination session
        navigationGuards.install();
        await SessionService.startSession(tabId, 'timeWasting', originUrl);
      },
      onAccept: async () => {
        redirectTo(tabId, url, originUrl);
      },
    });
  }

  async function redirect(details, immediate = false) {
    if (await promptControl.isGlobalPromptLocked()) {
      return;
    }

    if (await checkActiveTime()) {
      if (details.frameId === 0 && !details.url.includes('auth')) {
        const toggled = await storage.redirection.get();
        if (!toggled) {
          return;
        }

        const timeWasteList = await storage.list.get();

        // The hostSuffix URL filter is broad (e.g. "youtube.com" also matches
        // "accounts.youtube.com"). Guard here so auth/redirect subdomains
        // never queue a pending intent or overwrite a legitimate one.
        if (!isTrackedTimeWastingUrl(details.url, timeWasteList)) {
          return;
        }

        const timeWasteHosts = (timeWasteList || [])
          .map((item) => item?.host || item?.name || '')
          .filter(Boolean);
        const learningUrl = await getLearningUrl();

        const handled = await strategy.handleNavigation(details, {
          applyPreemptiveHide: (tabId) =>
            navigationGuards.applyPreemptiveHide(tabId),
          removePreemptiveHide: (tabId) =>
            navigationGuards.removePreemptiveHide(tabId),
          timeWastingHosts: timeWasteHosts,
          learningUrl,
        });
        if (handled) return;

        let shouldRedirect = await storage.shouldRedirect.get();
        if (!shouldRedirect) {
          const unlockAt = await storage.rewardUnlock.get();
          if (unlockAt && unlockAt <= Date.now()) {
            await storage.rewardUnlock.set(0);
            await storage.shouldRedirect.set(true);
            shouldRedirect = true;
          }
        }

        const goal = parseTime.toSystem(
          await storage.timeSettings.learningTime.get(),
        );
        const progress = await storage.dailyProgress.get();
        const goalMet = goal > 0 && progress >= goal;

        if (
          toggled &&
          shouldRedirect &&
          !goalMet &&
          !timer.isSessionRewardActive()
        ) {
          console.log('ShouldRedirect', shouldRedirect);
          const origin = await storage.origin.get();
          console.log('Checking against this: ', origin);

          // Validate that the origin learning tab still exists before showing blocker
          if (origin && origin.tabId !== undefined) {
            const isOriginValid = await isOriginTabStillOnLearningSite(origin);

            // Clear stale origin if tab no longer exists or isn't on learning site
            if (!isOriginValid) {
              console.log('Origin tab no longer valid, clearing stale origin');
              await storage.origin.remove();
              removeOriginUpdatedListener();
              promptControl.removeAllContentBlockers();
              timer.stopLearningSession();
            }
          }

          const learningUri = await getLearningUrl();
          if (!learningUri) return;

          // dispatchPrompt re-reads origin at call time so the correct UI is
          // shown regardless of async races between queuing and firing.
          if (immediate) {
            dispatchPrompt(details.tabId, learningUri, details.url);
          } else {
            promptControl.queuePendingIntent(details.tabId, () =>
              dispatchPrompt(details.tabId, learningUri, details.url),
            );
          }
        } else if (toggled && shouldRedirect && goalMet) {
          // Goal met + reward unclaimed: auto-start reward without any prompt
          await startRewardSession(getCheckActiveTab());
          return;
        }
      }
    }
  }

  return { redirect, redirectTo, dispatchPrompt };
}
