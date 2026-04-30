import browser from 'webextension-polyfill';
import { getLearningUrl, isLearningSite } from '../../services/siteDetector';

/**
 * Whether the stored origin's tab still exists AND is still on the
 * configured learning site. Used to detect stale origins (tab closed,
 * tab navigated away) before showing a content blocker or attempting
 * a tab migration.
 * @param {{ tabId?: number, url?: string } | null | undefined} origin
 * @returns {Promise<boolean>}
 */
export async function isOriginTabStillOnLearningSite(origin) {
  if (!origin || origin.tabId === undefined) return false;
  try {
    const originTab = await browser.tabs.get(origin.tabId);
    const learningUri = await getLearningUrl();
    if (!originTab || !learningUri) return false;
    return isLearningSite(originTab.url, learningUri);
  } catch {
    return false;
  }
}
