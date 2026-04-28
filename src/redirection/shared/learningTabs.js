import browser from 'webextension-polyfill';
import { getLearningUrl, isLearningSite } from '../../services/siteDetector';

/**
 * Find every tab currently on the configured learning site, optionally
 * excluding a set of tab ids. Used by gotoOrigin to decide whether any
 * learning tabs remain after restoring time-wasting tabs, and by
 * originTracking to find a replacement when the origin tab is closed.
 * @param {Set<number>} [excludedIds]
 * @returns {Promise<Array>}
 */
export async function getActiveLearningTabs(excludedIds = new Set()) {
  const learningUri = await getLearningUrl();
  if (!learningUri) return [];
  try {
    const tabs = await browser.tabs.query({});
    return tabs.filter(
      (tab) =>
        tab &&
        typeof tab.id === 'number' &&
        typeof tab.url === 'string' &&
        isLearningSite(tab.url, learningUri) &&
        !excludedIds.has(tab.id),
    );
  } catch {
    return [];
  }
}
