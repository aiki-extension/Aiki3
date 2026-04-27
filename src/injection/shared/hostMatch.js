import {
  isLearningSite,
  isTimeWastingSite,
  getTimeWastingHosts,
  getLearningUrl,
} from '../../services/siteDetector';

/**
 * Build a synthetic URL for the current page so it can be passed to the
 * URL-based helpers in `siteDetector`. Uses location.origin so any quirky
 * pathname/search/hash is irrelevant for hostname matching.
 */
const currentPageUrl = () => {
  try {
    return location.origin || `https://${location.hostname}`;
  } catch {
    return '';
  }
};

/**
 * Is the page currently being viewed the configured learning site?
 * @param {string} [learningUri] - Optional: pre-fetched learning URL.
 * @returns {boolean}
 */
export function currentPageIsLearningSite(learningUri) {
  return isLearningSite(currentPageUrl(), learningUri);
}

/**
 * Is the page currently being viewed in the user's time-wasting list?
 * @param {string[]} hosts - Time-wasting host list.
 * @returns {boolean}
 */
export function currentPageIsTimeWastingSite(hosts) {
  return isTimeWastingSite(currentPageUrl(), hosts);
}

/**
 * Async convenience: load the time-wasting host list from storage and check
 * whether the current page matches.
 * @returns {Promise<boolean>}
 */
export async function checkCurrentPageIsTimeWastingSite() {
  const hosts = await getTimeWastingHosts();
  return currentPageIsTimeWastingSite(hosts);
}

/**
 * Async convenience: load the learning URL from storage and check whether the
 * current page matches.
 * @returns {Promise<boolean>}
 */
export async function checkCurrentPageIsLearningSite() {
  const learningUri = await getLearningUrl();
  if (!learningUri) return false;
  return currentPageIsLearningSite(learningUri);
}
