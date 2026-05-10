import browser from 'webextension-polyfill';
import { renderRedirectPrompt } from './overlays/redirectPrompt';
import { renderLearningContent } from './overlays/learningOverlay';
import { renderContentBlocker } from './overlays/contentBlocker';
import { renderTimeWastingRewardOverlay } from './overlays/rewardOverlay';
import { removeOverlay } from './shared/domHelpers';

/**
 * Action keys are the strings the background script sends; some include
 * historical whitespace (e.g. 'display: encouragement') and must not be
 * "fixed" without a coordinated background change.
 */
const handlers = {
  'display:redirectPrompt': (req) =>
    renderRedirectPrompt(req.url, req.originUrl),

  'display: encouragement': (req) =>
    renderLearningContent(req.shouldShowWelcome),

  'display: rewardOverlay': () => {
    renderTimeWastingRewardOverlay();
    return Promise.resolve({ action: 'reward overlay shown' });
  },

  'display:contentBlocker': (req) => renderContentBlocker(req.originUrl),

  'kill aiki': () => {
    removeOverlay();
    try {
      const rewardOverlay = document.getElementById('aiki-reward-overlay');
      if (rewardOverlay) rewardOverlay.remove();
    } catch {}
    return Promise.resolve({ action: 'end injection' });
  },

  'remove blocker': () => {
    removeOverlay();
  },
};

export function registerMessageRouter() {
  browser.runtime.onMessage.addListener((request) => {
    const handler = handlers[request?.action];
    if (handler) return handler(request);
  });
}
