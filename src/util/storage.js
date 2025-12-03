import browser from "webextension-polyfill";
import { makeDate } from "./utilities";
import { learningSites, participantResource } from "./constants";
const storage = browser.storage.local;

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
 * @returns {object} userData that includes a list of procrastination websites as defined by the user, as well as the user ID.
 * @description Returns the user ID and a list of procrastination websites wrapped in an object. */
async function getUserData() {
  const result = await storage.get(["list", "uid"]);
  return result;
}

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
 * @description Sets the list of procrastination websites in storage. */
function setList(list) {
  storage.set({ list: list });
}

/**
 * @async @function
 * @returns {object[]} list
 * @description returns the list of procrastination websites from storage.*/
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

// function setLearningUri (uri){
//   storage.set({learningUri: uri});
// }

/**
 * @async @function
 * @returns {number} learningTime
 * @description returns a userdefined amount of miliseconds
 * before they can continue to their origin procrastination website. */
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
 * continue to the origin procrastination website. */
function setLearningTime(time) {
  storage.set({ learningTime: time });
}

/**
 * @async @function
 * @returns {number} rewardTime
 * @description returns the userdefined amount of miliseconds the user is allowed to spend on
 * procrastination websites before interception is turned back on. */
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
 * to spend on procrastination websites before interception is turned back on. */
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
 * procrastination time, and again when this expires. */
async function setShouldRedirect(state) {
  storage.set({ shouldRedirect: state });
}

/**
 * @async @function
 * @returns {Boolean} shouldRedirect
 * @description returns the state of whether user should be redirected.
 * shouldRedirect is defined by the application when the user has earned
 * procrastination time, and again when this expires. */
async function getShouldRedirect() {
  const result = await storage.get("shouldRedirect");
  return result.shouldRedirect;
}

async function storeSession(data) {
  const { statsDate } = await storage.get("statsDate");
  await checkDate(statsDate);
  const { sessionData } = await storage.get("sessionData");
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
    if (key === participantResource.name) {
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
    await storage.set({ completedCount: 0 });
    await storage.set({ skipCount: 0 });
    await storage.set({
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    });
    await storage.set({ statsDate: date });
  }
}

async function incrContinueCount() {
  const { completedCount, statsDate } = await storage.get([
    "completedCount",
    "statsDate",
  ]);
  await checkDate(statsDate);
  storage.set({ completedCount: completedCount + 1 });
}

async function incrSkipCount() {
  const { skipCount, statsDate } = await storage.get([
    "skipCount",
    "statsDate",
  ]);
  await checkDate(statsDate);
  storage.set({ skipCount: skipCount + 1 });
}

async function getAllStats() {
  const result = await storage.get([
    "sessionData",
    "skipCount",
    "completedCount",
    "yesterday",
    "history",
  ]);

  const defaultSession = { procrastinationDuration: 0, learningDuration: 0 };
  const today = result.sessionData && typeof result.sessionData === 'object'
    ? { ...defaultSession, ...result.sessionData }
    : { ...defaultSession };
  const yesterday = result.yesterday && typeof result.yesterday === 'object'
    ? {
        sessionData: { ...defaultSession, ...(result.yesterday.sessionData || {}) },
        skipCount: result.yesterday.skipCount || 0,
        completedCount: result.yesterday.completedCount || 0,
      }
    : { sessionData: { ...defaultSession }, skipCount: 0, completedCount: 0 };
  const history = result.history && typeof result.history === 'object'
    ? {
        sessionData: { ...defaultSession, ...(result.history.sessionData || {}) },
        skipCount: result.history.skipCount || 0,
        completedCount: result.history.completedCount || 0,
      }
    : { sessionData: { ...defaultSession }, skipCount: 0, completedCount: 0 };

  return {
    sessionData: today,
    skipCount: result.skipCount || 0,
    completedCount: result.completedCount || 0,
    yesterday,
    history,
  };
}

// async function testStatsFlow() {
//   await storage.set({ statsDate: new Date(2021, 5, 9).toDateString() });
//   console.log(await storage.get("statsDate"))
// await storeSession({ theguardian: 60, sololearn: 60 });
// await incrContinueCount();
// await storage.set({ statsDate: new Date(2021, 5, 10).dateString });
// await storeSession({ theguardian: 60, sololearn: 60 });
// await incrContinueCount();
// await storage.set({ statsDate: new Date(2021, 5, 11).dateString });
// await storeSession({ theguardian: 60, sololearn: 60 });
// await incrContinueCount();
// }

// testStatsFlow();

function initializeStats() {
  storage.set({
    sessionData: { procrastinationDuration: 0, learningDuration: 0 },
  });
  storage.set({ skipCount: 0 });
  storage.set({ completedCount: 0 });
  storage.set({
    history: {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      completedCount: 0,
      skipCount: 0,
    },
  });
  storage.set({
    yesterday: {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      skipCount: 0,
      completedCount: 0,
    },
  });
}

async function overWriteYesterday() {
  await addToHistory();
  const y = await storage.get([
    "sessionData",
    "skipCount",
    "completedCount",
  ]);
  const yesterday = {
    sessionData: y.sessionData || {
      procrastinationDuration: 0,
      learningDuration: 0,
    },
    skipCount: y.skipCount || 0,
    completedCount: y.completedCount || 0,
  };
  storage.set({ yesterday });
}

async function addToHistory() {
  let { yesterday, history } = await storage.get(["yesterday", "history"]);
  if (!history || typeof history !== "object") {
    history = {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      skipCount: 0,
      completedCount: 0,
    };
  }
  if (!yesterday || typeof yesterday !== "object") {
    yesterday = {
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      skipCount: 0,
      completedCount: 0,
    };
  }
  if (typeof history.skipCount !== "number") history.skipCount = 0;
  if (typeof history.completedCount !== "number") history.completedCount = 0;
  if (!history.sessionData || typeof history.sessionData !== "object") {
    history.sessionData = { procrastinationDuration: 0, learningDuration: 0 };
  }
  if (!yesterday.sessionData || typeof yesterday.sessionData !== "object") {
    yesterday.sessionData = { procrastinationDuration: 0, learningDuration: 0 };
  }

  history.skipCount += yesterday.skipCount || 0;
  history.completedCount += yesterday.completedCount || 0;
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

async function addBlockedOrigin(tabId, url) {
  if (!tabId || !url) return;
  const { blockedOrigins } = await storage.get("blockedOrigins");
  const next = blockedOrigins && typeof blockedOrigins === "object" ? { ...blockedOrigins } : {};
  next[tabId] = url;
  storage.set({ blockedOrigins: next });
}

async function getBlockedOrigin(tabId) {
  const { blockedOrigins } = await storage.get("blockedOrigins");
  if (blockedOrigins && typeof blockedOrigins === "object") {
    return blockedOrigins[tabId];
  }
  return null;
}

async function removeBlockedOrigin(tabId) {
  const { blockedOrigins } = await storage.get("blockedOrigins");
  if (blockedOrigins && typeof blockedOrigins === "object" && tabId in blockedOrigins) {
    const next = { ...blockedOrigins };
    delete next[tabId];
    if (Object.keys(next).length > 0) {
      storage.set({ blockedOrigins: next });
    } else {
      storage.remove("blockedOrigins");
    }
  }
}

function clearBlockedOrigins() {
  storage.remove("blockedOrigins");
}

async function setPromptLock(tabId, payload) {
  if (!tabId || !payload) return;
  const { promptLocks } = await storage.get("promptLocks");
  const next = promptLocks && typeof promptLocks === "object" ? { ...promptLocks } : {};
  next[tabId] = payload;
  storage.set({ promptLocks: next });
}

async function getPromptLock(tabId) {
  const { promptLocks } = await storage.get("promptLocks");
  if (promptLocks && typeof promptLocks === "object") {
    return promptLocks[tabId];
  }
  return null;
}

async function removePromptLock(tabId) {
  const { promptLocks } = await storage.get("promptLocks");
  if (promptLocks && typeof promptLocks === "object" && tabId in promptLocks) {
    const next = { ...promptLocks };
    delete next[tabId];
    if (Object.keys(next).length > 0) {
      storage.set({ promptLocks: next });
    } else {
      storage.remove("promptLocks");
    }
  }
}

function clearPromptLocks() {
  storage.remove("promptLocks");
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

async function setActiveSession(tabId, session) {
  const key = normalizeSessionKey(tabId);
  if (!key || !session) return;
  const { activeSessions } = await storage.get("activeSessions");
  const next =
    activeSessions && typeof activeSessions === "object" ? { ...activeSessions } : {};
  next[key] = session;
  storage.set({ activeSessions: next });
}

async function getActiveSession(tabId) {
  const key = normalizeSessionKey(tabId);
  if (!key) return null;
  const { activeSessions } = await storage.get("activeSessions");
  if (activeSessions && typeof activeSessions === "object") {
    return activeSessions[key] || null;
  }
  return null;
}

async function removeActiveSession(tabId) {
  const key = normalizeSessionKey(tabId);
  if (!key) return;
  const { activeSessions } = await storage.get("activeSessions");
  if (activeSessions && typeof activeSessions === "object" && key in activeSessions) {
    const next = { ...activeSessions };
    delete next[key];
    if (Object.keys(next).length > 0) {
      storage.set({ activeSessions: next });
    } else {
      storage.remove("activeSessions");
    }
  }
}

function clearActiveSessions() {
  return storage.remove("activeSessions");
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
  getUserData,
  origin: { get: getOrigin, set: setOrigin, remove: removeOrigin },
  learningUri: { get: getLearningUri, set: setLearningUri },
  list: { set: setList, get: getList },
  uid: { set: setUid, get: getUid },
  redirection: { toggle: toggleRedirection, get: getRedirectionToggled },
  stats: {
    storeSession: storeSession,
    skip: incrSkipCount,
    continue: incrContinueCount,
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
    add: addBlockedOrigin,
    get: getBlockedOrigin,
    remove: removeBlockedOrigin,
    clear: clearBlockedOrigins,
  },
  promptLocks: {
    set: setPromptLock,
    get: getPromptLock,
    remove: removePromptLock,
    clear: clearPromptLocks,
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
    set: setActiveSession,
    get: getActiveSession,
    remove: removeActiveSession,
    clear: clearActiveSessions,
  },
  forgetOrigin: () => storage.remove("origin"),
};
