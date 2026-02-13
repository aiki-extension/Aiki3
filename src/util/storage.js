import browser from "webextension-polyfill";
import { parseUrl } from "./utilities";
const storage = browser.storage.local;

/**
 * Factory for creating keyed storage accessors (maps with set/get/remove/clear).
 * @param {string} storageKey - The key to use in browser.storage
  */
function createKeyedStore(storageKey) {
  let mutationQueue = Promise.resolve();
  const enqueueMutation = (operation) => {
    const next = mutationQueue.then(operation);
    // Keep the queue alive even when an operation fails.
    mutationQueue = next.catch(() => { });
    return next;
  };
  const waitForPendingMutations = async () => {
    try {
      await mutationQueue;
    } catch (_) { }
  };

  return {
    async set(key, value) {
      if (key === null || key === undefined) return;
      return enqueueMutation(async () => {
        const data = await storage.get(storageKey);
        const current = data[storageKey] && typeof data[storageKey] === "object"
          ? { ...data[storageKey] } : {};
        current[String(key)] = value;
        return storage.set({ [storageKey]: current });
      });
    },
    async get(key) {
      if (key === null || key === undefined) return null;
      await waitForPendingMutations();
      const data = await storage.get(storageKey);
      if (data[storageKey] && typeof data[storageKey] === "object") {
        return data[storageKey][String(key)] || null;
      }
      return null;
    },
    async remove(key) {
      if (key === null || key === undefined) return;
      return enqueueMutation(async () => {
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
      });
    },
    clear() {
      return enqueueMutation(() => storage.remove(storageKey));
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
  return storage.clear();
}

/**
 * @function
 * @description Inverts the state of the "toggled" variable in storage
 * that determines whether or not a user should be redirected.
 * redirectionToggled is a settings parameter changed by the user. */

function toggleRedirection() {
  return storage.get("toggled").then((data) => {
    return storage.set({ toggled: !data.toggled });
  });
}

function setRedirectionToggled(state) {
  return storage.set({ toggled: Boolean(state) });
}

/**
 * @async @function
 * @returns {object} userData that includes a list of procrastination websites as defined by the user, as well as the user ID.
 * @description Returns the user ID and a list of procrastination websites wrapped in an object. */
/**
 * @async @function
 * @returns {Boolean} Determines whether user should be redirected.
 * @description Returns a boolean value indicating whether user should be redirected.
 * redirectionToggled is a settings parameter changed by the user. */
async function getRedirectionToggled() {
  const result = await storage.get("toggled");
  if (typeof result.toggled === "boolean") return result.toggled;
  return true;
}

/**
 * @function
 * @param {object[]} list
 * @param {string} list[].name
 * @param {string} list[].id
 * @description Sets the list of procrastination websites in storage. */
function setList(list) {
  return storage.set({ list: list });
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
  return storage.set({ uid: uid });
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
  return storage.set({ origin: origin });
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
  return storage.remove("origin");
}

function setLearningUri(uri) {
  if (uri && typeof uri === "string" && uri.trim() !== "") {
    return storage.set({ learningUri: uri.trim() });
  } else {
    // Default to empty when not provided
    return storage.remove("learningUri");
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
  return storage.set({ learningTime: time });
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
  return storage.set({ rewardTime: time });
}

/**
 * @async @function
 * @returns {object} dailyGoal {min, sec}
 * @description returns the user's daily learning goal. */
async function getDailyGoal() {
  const result = await storage.get("dailyGoal");
  const dg = result.dailyGoal;
  if (dg && typeof dg.min === "number" && typeof dg.sec === "number") {
    return dg;
  }
  return { min: 30, sec: 0 }; // Default 30 minutes
}

/**
 * @function
 * @param {object} goal {min, sec}
 * @description sets the user's daily learning goal. */
function setDailyGoal(goal) {
  return storage.set({ dailyGoal: goal });
}

/**
 * @async @function
 * @returns {object} sessionDuration {min, sec}
 * @description returns the per-session learning duration. */
async function getSessionDuration() {
  const result = await storage.get("sessionDuration");
  const sd = result.sessionDuration;
  if (sd && typeof sd.min === "number" && typeof sd.sec === "number") {
    return sd;
  }
  return { min: 5, sec: 0 }; // Default 5 minutes
}

/**
 * @function
 * @param {object} duration {min, sec}
 * @description sets the per-session learning duration. */
function setSessionDuration(duration) {
  return storage.set({ sessionDuration: duration });
}

async function getUserTimes() {
  const [rewardTime, dailyGoal, sessionDuration] = await Promise.all([
    getRewardTime(),
    getDailyGoal(),
    getSessionDuration(),
  ]);
  return { rewardTime, dailyGoal, sessionDuration };
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
  return Promise.all([
    setDailyGoal({ min: 30, sec: 0 }),
    setSessionDuration({ min: 5, sec: 0 }),
    setRewardTime({ min: 2, sec: 0 }),
  ]);
}

/**
 * @async @function
 * @param {Boolean} state
 * @description sets in storage whether user should be redirected.
 * shouldRedirect is defined by the application when the user has earned
 * procrastination time, and again when this expires. */
function setShouldRedirect(state) {
  return storage.set({ shouldRedirect: state });
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
  const { learningUri } = await storage.get("learningUri");
  const learningName = learningUri ? parseUrl(learningUri).name : null;
  const toFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  let newData =
    sessionData && typeof sessionData === "object"
      ? { ...sessionData }
      : {
          procrastinationDuration: 0,
          learningDuration: 0,
        };
  newData.procrastinationDuration = toFiniteNumber(newData.procrastinationDuration);
  newData.learningDuration = toFiniteNumber(newData.learningDuration);

  for (const [key, value] of Object.entries(data || {})) {
    const increment = toFiniteNumber(value);
    if (learningName && key === learningName) {
      newData.learningDuration += increment;
    } else if (!["chromeInactive", "chromeActive"].includes(key)) {
      newData[key] = toFiniteNumber(newData[key]) + increment;
      newData.procrastinationDuration += increment;
    }
  }
  await storage.set({ sessionData: newData });
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
  return Promise.all([
    storage.set({
      sessionData: { procrastinationDuration: 0, learningDuration: 0 },
    }),
    storage.set({
      history: {
        sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      },
    }),
    storage.set({
      yesterday: {
        sessionData: { procrastinationDuration: 0, learningDuration: 0 },
      },
    }),
  ]);
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
  return storage.set({ yesterday });
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
  return storage.set({ history });
}

function setActiveTimeFrom(value) {
  return storage.set({ activeFrom: value });
}
async function getActiveTimeFrom() {
  const { activeFrom } = await storage.get("activeFrom");
  return activeFrom ?? { hrs: 8, min: 0 };
}
function setActiveTimeTo(value) {
  return storage.set({ activeTo: value });
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
  return Promise.all([
    setActiveTimeFrom({ hrs: 8, min: 0 }),
    setActiveTimeTo({ hrs: 21, min: 30 }),
  ]);
}

async function addBlockedTabs(tab) {
  const { blockedTabs } = await storage.get("blockedTabs");
  if (Array.isArray(blockedTabs)) {
    if (blockedTabs.includes(tab)) return;
    return storage.set({ blockedTabs: [...blockedTabs, tab] });
  }
  return storage.set({ blockedTabs: [tab] });
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
    return storage.set({ blockedTabs: next });
  }
}

function clearBlockedTabs() {
  return storage.remove("blockedTabs");
}





async function setParticipantRecord(record) {
  if (record && typeof record === "object") {
    return storage.set({ participantRecord: record });
  } else {
    return storage.remove("participantRecord");
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
    return storage.set({ userPreferencesId: id });
  } else {
    return storage.remove("userPreferencesId");
  }
}

async function getUserPreferencesId() {
  const result = await storage.get("userPreferencesId");
  return result && result.userPreferencesId ? result.userPreferencesId : null;
}



// Controlled variant session state
async function setControlledSession(session) {
  if (session && typeof session === "object") {
    return storage.set({ controlledSession: session });
  } else {
    return storage.remove("controlledSession");
  }
}

async function getControlledSession() {
  const result = await storage.get("controlledSession");
  return result && result.controlledSession ? result.controlledSession : null;
}

async function clearControlledSession() {
  return storage.remove("controlledSession");
}

// Controlled variant timer settings (session-based, separate from daily goal)
async function getControlledLearningMinutes() {
  const result = await storage.get("controlledLearningMinutes");
  return typeof result.controlledLearningMinutes === "number"
    ? result.controlledLearningMinutes
    : 5; // Default 5 minutes
}

async function setControlledLearningMinutes(minutes) {
  return storage.set({ controlledLearningMinutes: minutes });
}

async function getControlledRewardMinutes() {
  const result = await storage.get("controlledRewardMinutes");
  return typeof result.controlledRewardMinutes === "number"
    ? result.controlledRewardMinutes
    : 5; // Default 15 minutes
}

async function setControlledRewardMinutes(minutes) {
  return storage.set({ controlledRewardMinutes: minutes });
}

async function getControlledLearningSeconds() {
  const result = await storage.get("controlledLearningSeconds");
  return typeof result.controlledLearningSeconds === "number"
    ? result.controlledLearningSeconds
    : 0; // Default 0 seconds
}

async function setControlledLearningSeconds(seconds) {
  return storage.set({ controlledLearningSeconds: seconds });
}

async function getControlledRewardSeconds() {
  const result = await storage.get("controlledRewardSeconds");
  return typeof result.controlledRewardSeconds === "number"
    ? result.controlledRewardSeconds
    : 0; // Default 0 seconds
}

async function setControlledRewardSeconds(seconds) {
  return storage.set({ controlledRewardSeconds: seconds });
}

export default {
  timeSettings: {
    getAll: getUserTimes,
    init: userTimeInit,
    dailyGoal: { get: getDailyGoal, set: setDailyGoal },
    sessionDuration: { get: getSessionDuration, set: setSessionDuration },
    rewardTime: { get: getRewardTime, set: setRewardTime },
    // Legacy - keep for backwards compatibility
    learningTime: { get: getLearningTime, set: setLearningTime },
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
  list: { set: setList, get: getList },
  uid: { set: setUid, get: getUid },
  redirection: {
    toggle: toggleRedirection,
    set: setRedirectionToggled,
    get: getRedirectionToggled,
  },
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
  controlledSession: {
    get: getControlledSession,
    set: setControlledSession,
    clear: clearControlledSession,
  },
  controlledTimerSettings: {
    learningMinutes: { get: getControlledLearningMinutes, set: setControlledLearningMinutes },
    learningSeconds: { get: getControlledLearningSeconds, set: setControlledLearningSeconds },
    rewardMinutes: { get: getControlledRewardMinutes, set: setControlledRewardMinutes },
    rewardSeconds: { get: getControlledRewardSeconds, set: setControlledRewardSeconds },
  },
  forgetOrigin: () => storage.remove("origin"),
};
