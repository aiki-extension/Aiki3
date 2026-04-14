/**
 * @function
 * @param {string} site
 * @returns {object}
 * @description returns an object containing the host and name of the given site.
 * Example: https://example.com/fragment returns {name: "example", host: "www.example.com"} */
export function parseUrl(site) {
  if (!site) {
    return { host: '', name: '' };
  }

  const trimmedSite = String(site).trim();

  if (!trimmedSite) {
    return { host: '', name: '' };
  }

  const ensureProtocol = (value) =>
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;

  const tryBuildUrl = (value) => {
    try {
      return new URL(ensureProtocol(value));
    } catch {
      return null;
    }
  };

  const isLikelyLocalHost = (hostname) =>
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    /^[0-9.]+$/.test(hostname);

  let url = tryBuildUrl(trimmedSite);

  if (url && !isLikelyLocalHost(url.hostname) && !url.hostname.includes('.')) {
    const appended = tryBuildUrl(`${url.hostname}.com`);
    if (appended) {
      url = appended;
    }
  }

  if (!url) {
    if (!trimmedSite.includes('.')) {
      url = tryBuildUrl(`${trimmedSite}.com`);
    }

    if (!url) {
      const host = trimmedSite.includes('http')
        ? trimmedSite.split('/')[2]
        : trimmedSite.split('/')[0];
      const cleanHost = host || trimmedSite;
      const name = cleanHost.includes('www')
        ? cleanHost.split('.')[1]
        : cleanHost.split('.')[0];
      return { host: cleanHost, name };
    }
  }

  const host = url.host;
  const hostname = url.hostname;
  const nameSource = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  const name = nameSource.split('.')[0];

  return { host, name };
}

export function normalizeUrl(input) {
  if (!input?.trim()) return null;
  const { host } = parseUrl(input);
  if (!host) return null;
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(?:[/?#].*)?$/;
  const match = host.match(urlPattern);
  if (!match) return null;
  return host.startsWith('www.') ? host : `www.${host}`;
}

export function makeDate() {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const date = new Date();
  return {
    dateString: date.toLocaleDateString('en-US', options),
    milliseconds: date.getMilliseconds(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    timestamp: date.getTime(),
    hours: date.getHours(),
  };
}

/**
 * Format milliseconds into a human-readable duration.
 * @param {number} milliseconds
 * @param {{direction?: "up"|"down", longForm?: boolean}} options
 * direction: "up" for elapsed time (floors minutes), "down" for remaining (rounds up minutes)
 * longForm: false => short labels (e.g. "1m"), true => long labels (e.g. "1 minutes")
 */
export function formatDuration(milliseconds, options = {}) {
  const { direction = 'up', longForm = false } = options;
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));

  const toSecondsLabel = () =>
    longForm ? `${seconds} seconds` : `${seconds}s`;

  if (direction === 'down') {
    if (seconds === 0) return longForm ? 'None' : '0s';
    if (seconds <= 30) return toSecondsLabel();
    if (seconds <= 59) return longForm ? '1 minutes' : '1m';
    const minutes = Math.ceil(seconds / 60);
    return longForm ? `${minutes} minutes` : `${minutes}m`;
  }

  // direction === "up"
  if (seconds < 60) return toSecondsLabel();
  const minutes = Math.floor(seconds / 60);
  return longForm ? `${minutes} minutes` : `${minutes}m`;
}

export const parseTime = {
  toHumanReadableArray: (time) => {
    return [Math.floor(time / 60 / 1000), (time / 1000) % 60];
  },

  toSystem: (time) => {
    return 1000 * (time.min * 60 + time.sec);
  },
};
