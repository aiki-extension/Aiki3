import browser from "webextension-polyfill";
import { parseUrl } from "./utilities";
const storage = browser.storage.local;
const DEFAULT_SESSION_TIME_MINUTES = 5;
const DEFAULT_SESSION_TIME_SECONDS = 0;
const DEFAULT_REWARD_TIME_MINUTES = 2;
const DEFAULT_REWARD_TIME_SECONDS = 0;


/**
 * Factory for creating keyed storage accessors (maps with set/get/remove/clear).
 * @param {string} storageKey - The key to use in browser.storage
  */
function createKeyedStore(storageKey) {
  return {
    async set(key, value) {
      if (key === null || key === undefined) return;
      const data = await storage.get(storageKey);
      const current = data[storageKey] && typeof data[storageKey] === "object"
        ? { ...data[storageKey] } : {};
      current[String(key)] = value;
      return storage.set({ [storageKey]: current });
    },
    async get(key) {
      if (key === null || key === undefined) return null;
      const data = await storage.get(storageKey);
      if (data[storageKey] && typeof data[storageKey] === "object") {
        return data[storageKey][String(key)] || null;
      }
      return null;
    },
    async remove(key) {
      if (key === null || key === undefined) return;
      const strKey = String(key);
      const data = await storage.get(storageKey);
      if (data[storageKey] && typeof data[storageKey] === "object" && strKey in data[storageKey]) {
        const next = { ...data[storageKey] };
        delete next[strKey];
        if (Object.keys(next).length > 0) {
          return storage.set({ [storageKey]: next });
        } else {
          return storage.remove(storageKey);
        }
      }
    },
    clear() {
      return storage.remove(storageKey);
    }
  };
}

// Pre-created keyed stores
const blockedOriginsStore = createKeyedStore("blockedOrigins");
const promptLocksStore = createKeyedStore("promptLocks");
const activeSessionsStore = createKeyedStore("activeSessions");

/**
 * @function
 * @description Clears all stored data in browser storage. */
function clearStorage() {
  storage.clear();
}

/**
 * @function
 * @description Inverts the state of the "toggled" variable in storage
 * that determines whether or not a user should be redirected.
 * redirectionToggled is a settings parameter changed by the user. */

function toggleRedirection() {
  storage.get("toggled").then((data) => {
    storage.set({ toggled: !data.toggled });
  });
}

/**
 * @async @function
 * @returns {object} userData that includes a list of time wasting websites as defined by the user, as well as the user ID.
 * @description Returns the user ID and a list of time wasting websites wrapped in an object. */
/**
 * @async @function
 * @returns {Boolean} Determines whether user should be redirected.
 * @description Returns a boolean value indicating whether user should be redirected.
 * redirectionToggled is a settings parameter changed by the user. */
async function getRedirectionToggled() {
  const result = await storage.get("toggled");
  return result.toggled;
}

/**
 * @function
 * @param {object[]} list
 * @param {string} list[].name
 * @param {string} list[].id
 * @description Sets the list of time wasting websites in storage. */
function setList(list) {
  storage.set({ list: list });
}

/**
 * @async @function
 * @returns {object[]} list
 * @description returns the list of time wasting websites from storage.*/
async function getList() {
  const result = await storage.get("list");
  return Array.isArray(result.list) ? result.list : [];
}

/**
 * @function
 * @param {string} uid
 * @description sets the user ID in storage. */
function setUid(uid) {
  storage.set({ uid: uid });
}

/**
 * @async @function
 * @returns {string} User ID
 * @description returns the user ID from storage. */
async function getUid() {
  const result = await storage.get("uid");
  return result.uid;
}

/**
 * @function
 * @param {object} origin
 * @param {string} origin.url
 * @param {number} origin.tabId
 * @description sets the origin tabID and url in storage for later reference.
 * The origin object is tied to the website from which the user was intercepted by Aiki3 */
function setOrigin(origin) {
  storage.set({ origin: origin });
}

/**
 * @async @function
 * @returns {object} origin
 * @description returns the origin tabID and url in storage.
 *  The origin object is tied to the website from which the user was intercepted by Aiki3 */
async function getOrigin() {
  const result = await storage.get("origin");
  return result.origin;
}

/**
 * @function
 * @description removes the origin variable from storage.
 *  The origin object is tied to the website from which the user was intercepted by Aiki3 */
function removeOrigin() {
  storage.remove("origin");
}

function setLearningUri(uri) {
  if (uri && typeof uri === "string" && uri.trim() !== "") {
    storage.set({ learningUri: uri.trim() });
  } else {
    // Default to empty when not provided
    storage.remove("learningUri");
  }
}

async function getLearningUri() {
  let result = await storage.get("learningUri");
  if (result && typeof result.learningUri === "string") {
    return result.learningUri;
  }
  // Default to empty: user hasn’t set a learning site yet
  return "";
}

/**
 * @async @function
 * @returns {number} learningTime
 * @description returns a userdefined amount of miliseconds
 * before they can continue to their origin time wasting website. */
async function getLearningTime() {
  const result = await storage.get("learningTime");
  const lt = result.learningTime;
  if (lt && typeof lt.min === "number" && typeof lt.sec === "number") {
    return lt;
  }
  return { min: 30, sec: 0 };
}

/**
 * @function
 * @param {number} time
 * @description sets the amount of time before a user is allowed to
 * continue to the origin time wasting website. */
function setLearningTime(time) {
  storage.set({ learningTime: time });
}

/**
 * @async @function
 * @returns {number} rewardTime
 * @description returns the userdefined amount of miliseconds the user is allowed to spend on
 * time wasting websites before interception is turned back on. */
async function getRewardTime() {
  const result = await storage.get("rewardTime");
  const rt = result.rewardTime;
  if (rt && typeof rt.min === "number" && typeof rt.sec === "number") {
    return rt;
  }
  return { min: 0, sec: 0 };
}

/**
 * @function
 * @param {number} time
 * @description sets in storage the userdefined amount of miliseconds the user is allowed
 * to spend on time wasting websites before interception is turned back on. */
function setRewardTime(time) {
  storage.set({ rewardTime: time });
}

/**
 * @async @function
 * @returns {object} userTimes
 * @description returns an object containing the time-related
 * values set by the user: rewardTime and learningTime. */
async function getUserTimes() {
  const [rewardTime, learningTime] = await Promise.all([
    getRewardTime(),
    getLearningTime(),
  ]);
  return { rewardTime, learningTime };
}

function getTodayKey() {
  return new Date().toDateString();
}

async function getDailyProgress() {
  const { dailyProgress, dailyProgressDate } = await storage.get([
    "dailyProgress",
    "dailyProgressDate",
  ]);
  const today = getTodayKey();
  if (dailyProgressDate !== today) {
    await storage.set({ dailyProgress: 0, dailyProgressDate: today });
    await setShouldRedirect(true);
    await storage.remove("rewardUnlockAt");
    return 0;
  }
  return typeof dailyProgress === "number" ? dailyProgress : 0;
}

async function setDailyProgress(value) {
  const today = getTodayKey();
  await storage.set({ dailyProgress: value, dailyProgressDate: today });
}

async function incrementDailyProgress(delta) {
  const current = await getDailyProgress();
  const next = current + delta;
  await setDailyProgress(next);
  return next;
}

async function setRewardUnlock(timestamp) {
  if (typeof timestamp === "number" && timestamp > 0) {
    await storage.set({ rewardUnlockAt: timestamp });
  } else {
    await storage.remove("rewardUnlockAt");
  }
}

async function getRewardUnlock() {
  const { rewardUnlockAt } = await storage.get("rewardUnlockAt");
  return typeof rewardUnlockAt === "number" ? rewardUnlockAt : 0;
}

/**
 * @description Initializes the time settings in storage upon app installation. */
function userTimeInit() {
  setLearningTime({ min: 30, sec: 0 });
  setRewardTime({ min: 0, sec: 0 });
}

/**
 * @async @function
 * @param {Boolean} state
 * @description sets in storage whether user should be redirected.
 * shouldRedirect is defined by the application when the user has earned
 * time wasting time, and again when this expires. */
async function setShouldRedirect(state) {
  storage.set({ shouldRedirect: state });
}

/**
 * @async @function
 * @returns {Boolean} shouldRedirect
 * @description returns the state of whether user should be redirected.
 * shouldRedirect is defined by the application when the user has earned
 * time wasting time, and again when this expires. */
async function getShouldRedirect() {
  const result = await storage.get("shouldRedirect");
  return result.shouldRedirect;
}

async function storeSession(data) {
  const { statsDate } = await storage.get("statsDate");
  await checkDate(statsDate);
  const { sessionData } = await storage.get("sessionData");
  const { learningUri } = await storage.get("learningUri");
  const learningName = learningUri ? parseUrl(learningUri).name : null;

  let newData = sessionData || {
    procrastinationDuration: 0,
    learningDuration: 0,
  };
  if (
    !newData.hasOwnProperty("procrastinationDuration") ||
    newData.procrastinationDuration === NaN
  ) {
    newData.procrastinationDuration = 0;
  }
  if (
    !newData.hasOwnProperty("learningDuration") ||
    newData.learningDuration === NaN
  ) {
    newData.learningDuration = 0;
  }

  for (const key in data) {
    if (learningName && key === learningName) {
      newData.learningDuration += data[key];
    } else if (!["chromeInactive", "chromeActive"].includes(key)) {
      newData[key] = newData.hasOwnProperty(key)
        ? newData[key] + data[key]
        : data[key];
      newData.procrastinationDuration += data[key];
    }
  }
  storage.set({ sessionData: newData });
}

async function checkDate(statsDate) {
  const date = new Date().toDateString();
  console.log("inc: ", statsDate, "date: ", date);
  if (statsDate !== date) {
    console.log("Rolling over date");
    await overWriteYesterday();
    await storage.set({
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    });
    await storage.set({ statsDate: date });
  }
}



async function getAllStats() {
  const result = await storage.get([
    "sessionData",
    "yesterday",
    "history",
  ]);

  const defaultSession = { procrastinationDuration: 0, learningDuration: 0 };
  const today = result.sessionData && typeof result.sessionData === 'object'
    ? { ...defaultSession, ...result.sessionData }
    : { ...defaultSession };
  const yesterday = result.yesterday && typeof result.yesterday === 'object'
    ? { sessionData: { ...defaultSession, ...(result.yesterday.sessionData || {}) } }
    : { sessionData: { ...defaultSession } };
  const history = result.history && typeof result.history === 'object'
    ? { sessionData: { ...defaultSession, ...(result.history.sessionData || {}) } }
    : { sessionData: { ...defaultSession } };

  return {
    sessionData: today,
    yesterday,
    history,
  };
}

function initializeStats() {
  storage.set({
    sessionData: { procrastinationDuration: 0, learningDuration: 0 },
  });
  storage.set({
    history: {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    },
  });
  storage.set({
    yesterday: {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    },
  });
}

async function overWriteYesterday() {
  await addToHistory();
  const y = await storage.get(["sessionData"]);
  const yesterday = {
    sessionData: y.sessionData || {
      procrastinationDuration: 0,
      learningDuration: 0,
    },
  };
  storage.set({ yesterday });
}

async function addToHistory() {
  let { yesterday, history } = await storage.get(["yesterday", "history"]);
  if (!history || typeof history !== "object") {
    history = {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    };
  }
  if (!yesterday || typeof yesterday !== "object") {
    yesterday = {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    };
  }
  if (!history.sessionData || typeof history.sessionData !== "object") {
    history.sessionData = { procrastinationDuration: 0, learningDuration: 0 };
  }
  if (!yesterday.sessionData || typeof yesterday.sessionData !== "object") {
    yesterday.sessionData = { procrastinationDuration: 0, learningDuration: 0 };
  }

  history.sessionData.procrastinationDuration +=
    yesterday.sessionData.procrastinationDuration || 0;
  history.sessionData.learningDuration +=
    yesterday.sessionData.learningDuration || 0;
  storage.set({ history });
}

function setActiveTimeFrom(value) {
  storage.set({ activeFrom: value });
}
async function getActiveTimeFrom() {
  const { activeFrom } = await storage.get("activeFrom");
  return activeFrom ?? { hrs: 8, min: 0 };
}
function setActiveTimeTo(value) {
  storage.set({ activeTo: value });
}
async function getActiveTimeTo() {
  const { activeTo } = await storage.get("activeTo");
  return activeTo ?? { hrs: 21, min: 30 };
}

async function getAllActiveTimes() {
  const [activeFrom, activeTo] = await Promise.all([
    getActiveTimeFrom(),
    getActiveTimeTo(),
  ]);
  return { activeFrom, activeTo };
}

function operatingHoursInit() {
  setActiveTimeFrom({ hrs: 8, min: 0 });
  setActiveTimeTo({ hrs: 21, min: 30 });
}

async function addBlockedTabs(tab) {
  const { blockedTabs } = await storage.get("blockedTabs");
  if (blockedTabs) {
    if (!blockedTabs.includes(tab)) {
      storage.set({ blockedTabs: [...blockedTabs, tab] });
    }
  } else {
    storage.set({ blockedTabs: [tab] });
  }
}

async function getBlockedTabs() {
  const { blockedTabs } = await storage.get("blockedTabs");
  if (blockedTabs) {
    return blockedTabs;
  } else return [];
}

async function removeBlockedTab(tab) {
  const { blockedTabs } = await storage.get("blockedTabs");
  if (Array.isArray(blockedTabs)) {
    const next = blockedTabs.filter((item) => item !== tab);
    storage.set({ blockedTabs: next });
  }
}

function clearBlockedTabs() {
  storage.remove("blockedTabs");
}





async function setParticipantRecord(record) {
  if (record && typeof record === "object") {
    storage.set({ participantRecord: record });
  } else {
    storage.remove("participantRecord");
  }
}

async function getParticipantRecord() {
  const result = await storage.get("participantRecord");
  return result && result.participantRecord ? result.participantRecord : null;
}

function clearParticipantRecord() {
  return storage.remove("participantRecord");
}

function normalizeSessionKey(tabId) {
  if (tabId === null || tabId === undefined) return null;
  return String(tabId);
}

async function setUserPreferencesId(id) {
  if (id && typeof id === "string") {
    storage.set({ userPreferencesId: id });
  } else {
    storage.remove("userPreferencesId");
  }
}

async function getUserPreferencesId() {
  const result = await storage.get("userPreferencesId");
  return result && result.userPreferencesId ? result.userPreferencesId : null;
}


// Global prompt lock (replaces per-tab promptLocks for 10-minute global cooldown)


async function getGlobalPromptLock() {
  // Retrieves the global lock from browser storage
  const result = await storage.get("globalPromptLock");

  // Checks if we get valid data back from the function
  return result && result.globalPromptLock ? result.globalPromptLock : null;
}

async function setGlobalPromptLock(value) {
  // Saves the global lock to browser storage

  // Validates the input - It must be an object with a timestamp number
  if (value && typeof value === "object" && typeof value.timestamp === "number") {
    await storage.set({ globalPromptLock: value });
  } else {
    // If there is invalid data passed in, then remove any existing lock
    await storage.remove("globalPromptLock");
  }
}

async function removeGlobalPromptLock() {
  // Removes the global lock from browser storage
  return storage.remove("globalPromptLock");
}

async function getSessionMinutes() {
  const result = await storage.get("sessionMinutes");
  if (typeof result.sessionMinutes === "number") {
    return result.sessionMinutes;
  } else {
    return DEFAULT_SESSION_TIME_MINUTES;
  }
}

async function setSessionMinutes(minutes) {
  await storage.set({ sessionMinutes: minutes });
}

async function getSessionSeconds() {
  const result = await storage.get("sessionSeconds");
  if (typeof result.sessionSeconds === "number") {
    return result.sessionSeconds;
  } else {
    return DEFAULT_SESSION_TIME_SECONDS;
  }
}

async function setSessionSeconds(seconds) {
  await storage.set({ sessionSeconds: seconds });
}

async function getSessionRewardMinutes() {
  const result = await storage.get("sessionRewardMinutes");
  if (typeof result.sessionRewardMinutes === "number") {
    return result.sessionRewardMinutes;
  } else {
    return DEFAULT_REWARD_TIME_MINUTES;
  }
}

async function setSessionRewardMinutes(minutes) {
  await storage.set({ sessionRewardMinutes: minutes });
}

async function getSessionRewardSeconds() {
  const result = await storage.get("sessionRewardSeconds");
  if (typeof result.sessionRewardSeconds === "number") {
    return result.sessionRewardSeconds;
  } else {
    return DEFAULT_REWARD_TIME_SECONDS; 
  }
}

async function setSessionRewardSeconds(seconds) {
  await storage.set({ sessionRewardSeconds: seconds });
}


export default {
  timeSettings: {
    getAll: getUserTimes,
    init: userTimeInit,
    learningTime: { get: getLearningTime, set: setLearningTime },
    rewardTime: { get: getRewardTime, set: setRewardTime },
  },
  dailyProgress: {
    get: getDailyProgress,
    set: setDailyProgress,
    increment: incrementDailyProgress,
  },
  rewardUnlock: {
    get: getRewardUnlock,
    set: setRewardUnlock,
  },
  shouldRedirect: { get: getShouldRedirect, set: setShouldRedirect },
  clearStorage,
  origin: { get: getOrigin, set: setOrigin, remove: removeOrigin },
  learningUri: { get: getLearningUri, set: setLearningUri },
  list: { set: setList, get: getList }, // this is list of time-wasting sites defined by the user
  uid: { set: setUid, get: getUid },
  redirection: { toggle: toggleRedirection, get: getRedirectionToggled },
  stats: {
    storeSession: storeSession,
    getAll: getAllStats,
    init: initializeStats,
  },
  operatingHours: {
    from: { get: getActiveTimeFrom, set: setActiveTimeFrom },
    to: { get: getActiveTimeTo, set: setActiveTimeTo },
    getAll: getAllActiveTimes,
    init: operatingHoursInit,
  },
  blockedTabs: {
    get: getBlockedTabs,
    add: addBlockedTabs,
    remove: removeBlockedTab,
    clear: clearBlockedTabs,
  },
  blockedOrigins: {
    add: blockedOriginsStore.set,
    get: blockedOriginsStore.get,
    remove: blockedOriginsStore.remove,
    clear: blockedOriginsStore.clear,
  },
  promptLocks: {
    set: promptLocksStore.set, 
    get: promptLocksStore.get,
    remove: promptLocksStore.remove,
    clear: promptLocksStore.clear,
  },
  globalPromptLock: {  // Global prompts
    get: getGlobalPromptLock, // Gets global lock
    set: setGlobalPromptLock, // Sets global lock
    remove: removeGlobalPromptLock, // Removes the global lock
  },
  participantRecord: {
    get: getParticipantRecord,
    set: setParticipantRecord,
    clear: clearParticipantRecord,
  },
  userPreferencesId: {
    get: getUserPreferencesId,
    set: setUserPreferencesId,
  },
  activeSessions: {
    set: activeSessionsStore.set,
    get: activeSessionsStore.get,
    remove: activeSessionsStore.remove,
    clear: activeSessionsStore.clear,
  },
  sessionSettings: {  // All session and reward based storage settings
  sessionMinutes: { get: getSessionMinutes, set: setSessionMinutes },
  sessionSeconds: { get: getSessionSeconds, set: setSessionSeconds },
  rewardMinutes: { get: getSessionRewardMinutes, set: setSessionRewardMinutes },
  rewardSeconds: { get: getSessionRewardSeconds, set: setSessionRewardSeconds },
},
  forgetOrigin: () => storage.remove("origin"),
};
