/**
 * Site Detector - Shared detection logic for time wasting and learning sites
 */

import storage from '../util/storage';
import { parseUrl } from '../util/utilities';

/**
 * Check if a URL is a time wasting site.
 * @param {string} url - URL to check
 * @param {string[]} hosts - List of time wasting host names
 * @returns {boolean}
 */
export function isProcrastinationSite(url, hosts) {
  if (!url || !hosts || hosts.length === 0) return false;
  try {
    const urlHost = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return hosts.some((host) => {
      const h = (host || '').replace(/^www\./, '').toLowerCase();
      return h && (urlHost === h || urlHost.endsWith('.' + h));
    });
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a learning site.
 * @param {string} url - URL to check
 * @param {string} learningUrl - Configured learning URL
 * @returns {boolean}
 */
export function isLearningSite(url, learningUrl) {
  if (!url || !learningUrl) return false;
  try {
    const urlHost = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    const learningHost = new URL(learningUrl).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    return urlHost === learningHost || urlHost.endsWith('.' + learningHost);
  } catch (e) {
    return false;
  }
}

/**
 * Get time wasting hosts from storage.
 * @returns {Promise<string[]>}
 */
export async function getProcrastinationHosts() {
  const procList = await storage.list.get();
  return (procList || [])
    .map((item) => item?.host || item?.name || '')
    .filter(Boolean);
}

/**
 * Get learning URL from storage.
 * @returns {Promise<string|null>}
 */
export async function getLearningUrl() {
  const url = await storage.learningUri.get();
  if (!url) return null;
  // Only prepend http:// if the URL doesn't already have a protocol
  return url.match(/^https?:\/\//) ? url : `http://${url}`;
}

/**
 * Check if URL is a time wasting site using stored list.
 * @param {string} url - URL to check
 * @returns {Promise<boolean>}
 */
export async function checkIfProcrastination(url) {
  const hosts = await getProcrastinationHosts();
  return isProcrastinationSite(url, hosts);
}

/**
 * Check if URL is a learning site using stored URL.
 * @param {string} url - URL to check
 * @returns {Promise<boolean>}
 */
export async function checkIfLearning(url) {
  const learningUrl = await getLearningUrl();
  return isLearningSite(url, learningUrl);
}

/**
 * Get site name from URL.
 * @param {string} url - URL
 * @returns {string}
 */
export function getSiteName(url) {
  return parseUrl(url).name || '';
}

export default {
  isProcrastinationSite,
  isLearningSite,
  getProcrastinationHosts,
  getLearningUrl,
  checkIfProcrastination,
  checkIfLearning,
  getSiteName,
};
