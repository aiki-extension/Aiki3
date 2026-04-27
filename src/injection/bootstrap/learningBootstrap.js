import browser from 'webextension-polyfill';
import { getLearningUrl } from '../../services/siteDetector';
import { currentPageIsLearningSite } from '../shared/hostMatch';
import { renderLearningContent } from '../overlays/learningPanel';

let bootstrapAttemptPending = false;

/**
 * If the current page is the configured learning site, ask the background to
 * start a learning session and render the learning overlay. Idempotent: a
 * second concurrent call returns immediately.
 */
export async function bootstrapLearningOverlayIfNeeded() {
  if (bootstrapAttemptPending) return;
  bootstrapAttemptPending = true;
  try {
    const learningUri = await getLearningUrl();
    if (!learningUri || !currentPageIsLearningSite(learningUri)) {
      bootstrapAttemptPending = false;
      return;
    }
    try {
      await browser.runtime.sendMessage({ type: 'learning:autoStart' });
    } catch {}
    await renderLearningContent();
  } catch {
    // swallow: best-effort bootstrap.
  } finally {
    bootstrapAttemptPending = false;
  }
}
