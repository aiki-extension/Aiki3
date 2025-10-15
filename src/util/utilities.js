/**
 * @function
 * @param {string} site
 * @returns {object}
 * @description returns an object containing the host and name of the given site.
 * Example: https://example.com/fragment returns {name: "example", host: "www.example.com"} */
export function parseUrl(site) {
  if (!site) {
    return { host: "", name: "" };
  }

  const trimmedSite = String(site).trim();

  if (!trimmedSite) {
    return { host: "", name: "" };
  }

  const ensureProtocol = (value) =>
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;

  const tryBuildUrl = (value) => {
    try {
      return new URL(ensureProtocol(value));
    } catch (error) {
      return null;
    }
  };

  const isLikelyLocalHost = (hostname) =>
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^[0-9.]+$/.test(hostname);

  let url = tryBuildUrl(trimmedSite);

  if (url && !isLikelyLocalHost(url.hostname) && !url.hostname.includes(".")) {
    const appended = tryBuildUrl(`${url.hostname}.com`);
    if (appended) {
      url = appended;
    }
  }

  if (!url) {
    if (!trimmedSite.includes(".")) {
      url = tryBuildUrl(`${trimmedSite}.com`);
    }

    if (!url) {
      const host = trimmedSite.includes("http")
        ? trimmedSite.split("/")[2]
        : trimmedSite.split("/")[0];
      const cleanHost = host || trimmedSite;
      const name = cleanHost.includes("www")
        ? cleanHost.split(".")[1]
        : cleanHost.split(".")[0];
      return { host: cleanHost, name };
    }
  }

  const host = url.host;
  const hostname = url.hostname;
  const nameSource = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const name = nameSource.split(".")[0];

  return { host, name };
}

/**
 * @function
 * @returns {object} date
 * @description returns a new object containing a string with the date at time of function call,
 * as well as numbers for hours, minutes, seconds and milliseconds, as well as a timestamp for use in
 * Firestore document creation. */
export function makeDate() {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const date = new Date();
  return {
    dateString: date.toLocaleDateString("en-US", options),
    milliseconds: date.getMilliseconds(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    timestamp: date.getTime(),
    hours: date.getHours(),
  };
}

/**
 * @function
 * @param {number} milliseconds
 * @returns {string} time
 * @description Parses a given value of milliseconds into a short human-readable string.
 * This function should be used only when counting up.
 * For values greater than or equal to 60 seconds, the string value will be floored
 * to the nearest minute. (eg: 1m). For values lesser than 60 seconds,
 * the string value will be in seconds.
 * For a long string version, use parseTimerUpLong. */
export function parseTimerUp(milliseconds) {
  let seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds >= 60) {
    let minutes = seconds / 60;
    minutes = Math.floor(minutes);
    return `${minutes}m`;
  }
}

/**
 * @function
 * @param {number} milliseconds
 * @returns {string} time
 * @description Parses a given value of milliseconds into a long human-readable string.
 * @ This function should be used only when counting up.
 * For values greater than or equal to 60 seconds, the string value will be rounded down
 * to the nearest minute. (eg: 1m). For values lesser than 60 seconds, the string value will be in seconds.
 * For a short string version, use parseTimerUp. */
export function parseTimerUpLong(milliseconds) {
  let seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds >= 60) {
    let minutes = seconds / 60;
    minutes = Math.floor(minutes);
    return `${minutes} minutes`;
  }
}

/**
 * @param {number} milliseconds
 * @returns {string} time
 * @description Parses a given value of milliseconds into a short human-readable string.
 * This function should be used only when counting up.
 * For values greater than 60 seconds, the string value will be rounded up
 * to the nearest minute. (eg: 1m). For values lesser than or equal to 60 seconds,
 * the string value will be in seconds.
 * For a long string version, use parseTimerDownLong. */
export function parseTimerDown(milliseconds) {
  let seconds = milliseconds / 1000;
  if (seconds <= 30) {
    return `${seconds}s`;
  } else if (seconds >= 31 && seconds <= 59) {
    return "1m";
  } else if (seconds >= 60) {
    let minutes = seconds / 60;
    minutes = Math.ceil(minutes);
    return `${minutes}m`;
  }
}

/**
 * @param {number} milliseconds
 * @returns {string} time
 * @description Parses a given value of milliseconds into a short human-readable string.
 * This function should be used only when counting up.
 * For values greater than 60 seconds, the string value will be rounded up
 * to the nearest minute. (eg: 1m). For values lesser than or equal to 60 seconds,
 * the string value will be in seconds.
 * For a short string version, use parseTimerDown. */
export function parseTimerDownLong(milliseconds) {
  let seconds = milliseconds / 1000;
  if (seconds === 0) {
    return "None";
  } else if (seconds <= 60) {
    return `${seconds} seconds`;
  } else if (seconds >= 60) {
    let minutes = seconds / 60;
    minutes = Math.ceil(minutes);
    return `${minutes} minutes`;
  }
}

export const parseTime = {
  toHumanReadableArray: (time) => {
    return [ Math.floor(time / 60 / 1000), (time / 1000) % 60 ];
  },

  toSystem: (time) => {
    return 1000 * (time.min * 60 + time.sec);
  },
};
