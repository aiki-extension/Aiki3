import { parseUrl } from '../../util/utilities';

/**
 * Build the `{url:[{hostSuffix}]}` filter array for
 * `webNavigation.onBeforeNavigate` from the user's time-wasting list.
 * De-dupes by lowercased host.
 * @param {Array<{host?: string, name?: string}>} list
 * @returns {Array<{hostSuffix: string}>}
 */
export function buildTimeWastingUrlFilters(list = []) {
  const seen = new Set();
  return list
    .map((item) => {
      const parsed = parseUrl(item?.host || item?.name || '');
      const host = (parsed.host || item?.host || '').trim().toLowerCase();
      if (!host || seen.has(host)) return null;
      seen.add(host);
      return { hostSuffix: host };
    })
    .filter(Boolean);
}

/**
 * Whether `url`'s site name matches an entry in the user's time-wasting list.
 * Matches by `parseUrl(url).name` against `list[].name` — narrower than the
 * `hostSuffix` navigation filter, so this guards against false positives from
 * subdomains like `accounts.youtube.com` when the user only listed `youtube.com`.
 * @param {string} url
 * @param {Array<{name?: string}>} list
 * @returns {boolean}
 */
export function isTrackedTimeWastingUrl(url, list) {
  if (!url || !Array.isArray(list) || list.length === 0) return false;
  const tabSiteName = parseUrl(url).name;
  if (!tabSiteName) return false;
  return list.some((site) => site?.name === tabSiteName);
}
