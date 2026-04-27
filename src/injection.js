/**
 * Content-script entry point. Wires the runtime message router, bootstraps
 * the learning and reward overlays on page load, signals readiness to the
 * background, and exposes the reward-overlay renderer on `window` for ad-hoc
 * use from the background's `scripting.executeScript` calls.
 *
 * Implementation lives in `src/injection/`. Each overlay, bootstrap routine,
 * and shared utility is its own module — this file only orchestrates.
 */
import browser from 'webextension-polyfill';
import { registerMessageRouter } from './injection/messageRouter';
import { bootstrapLearningOverlayIfNeeded } from './injection/bootstrap/learningBootstrap';
import { bootstrapRewardOverlayIfNeeded } from './injection/bootstrap/rewardBootstrap';
import { renderTimeWastingRewardOverlay } from './injection/overlays/rewardOverlay';

registerMessageRouter();

const onDomReady = (fn) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
};

onDomReady(bootstrapLearningOverlayIfNeeded);
onDomReady(bootstrapRewardOverlayIfNeeded);

// Signal to the background that this content script is ready to receive
// messages. Deferred until DOMContentLoaded so document.body exists when the
// background responds with a prompt — every overlay appends to document.body.
// The background's preemptive-hide / immediate-prompt paths fire via
// scripting.executeScript and are unaffected by this delay.
onDomReady(() => {
  browser.runtime
    .sendMessage({ type: 'contentScript:ready' })
    .then((res) =>
      console.log('[Aiki injection] contentScript:ready ack:', res),
    )
    .catch((err) =>
      console.warn(
        '[Aiki injection] contentScript:ready send failed:',
        err?.message,
      ),
    );
});

// Expose for background-injected scripts that call directly into the page.
if (typeof window !== 'undefined') {
  window.renderTimeWastingRewardOverlay = renderTimeWastingRewardOverlay;
}
