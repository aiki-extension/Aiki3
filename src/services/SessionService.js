import storage from "../util/storage";
import { logEvent as rawLogEvent, logSessionEvent } from "../util/logger";

let cachedGoalSeconds = null;
let lastGoalFetch = 0;

/**
 * Log an event without awaiting (fire and forget).
 * Used by controlled variant for non-blocking event logging.
 * @param {string} eventType - Event type
 * @param {Object} data - Additional event data
 */
function logEventAsync(eventType, data = {}) {
  storage.uid.get().then(participantId => {
    rawLogEvent({ participantId, eventType, ...data }).catch(() => { });
  });
}

/**
 * Log a controlled variant session (learning or reward).
 * @param {Object} options
 * @param {string} options.sessionType - "learning" or "procrastination" (reward)
 * @param {number} options.startedAt - Session start timestamp
 * @param {number} options.durationMs - Actual duration in milliseconds
 * @param {number} options.goalMs - Goal duration in milliseconds
 * @param {boolean} options.completed - Whether the goal was reached
 * @param {string} options.learningSite - Learning site URL
 * @param {string} options.procrastinationSite - Procrastination site URL
 * @returns {Promise<void>}
 */
async function logControlledSession(options = {}) {
  const participantId = await storage.uid.get();
  if (!participantId) return;

  const durationSeconds = Math.round((options.durationMs || 0) / 1000);
  const goalSeconds = Math.round((options.goalMs || 0) / 1000);

  return logSessionEvent({
    participantId,
    sessionType: options.sessionType || "learning",
    sessionStart: options.startedAt,
    sessionEnd: Date.now(),
    durationSeconds,
    goalSeconds,
    completed: options.completed === true,
    siteVisited: options.sessionType === "learning" ? options.learningSite : options.procrastinationSite,
    triggeredBySite: options.sessionType === "learning" ? options.procrastinationSite : null,
  }).catch(e => {
    console.warn("[SessionService] Failed to log controlled session:", e);
  });
}

async function getGoalSeconds() {
  const now = Date.now();
  if (cachedGoalSeconds !== null && now - lastGoalFetch < 60 * 1000) {
    return cachedGoalSeconds;
  }
  try {
    // Session goal should reflect per-session duration (not daily goal).
    const timeSetting = await storage.timeSettings.sessionDuration.get();
    if (timeSetting && typeof timeSetting.min === "number" && typeof timeSetting.sec === "number") {
      cachedGoalSeconds = Math.max(0, Math.round(timeSetting.min * 60 + timeSetting.sec));
      lastGoalFetch = now;
      return cachedGoalSeconds;
    }
  } catch (_) { }
  cachedGoalSeconds = 0;
  lastGoalFetch = now;
  return cachedGoalSeconds;
}

async function startSession(tabId, sessionType, siteUrl, triggerUrl = null) {
  if (tabId === undefined || tabId === null || !siteUrl) return;
  const participantId = await storage.uid.get();
  if (!participantId) return;

  await storage.activeSessions.remove(tabId);

  const sessionData = {
    participantId,
    sessionType,
    startedAt: Date.now(),
  };

  if (sessionType === "learning") {
    sessionData.learningUrl = siteUrl;
    sessionData.procrastinationUrl = triggerUrl;
  } else {
    sessionData.procrastinationUrl = siteUrl;
  }

  await storage.activeSessions.set(tabId, sessionData);
}

async function finalizeSession(tabId, sessionType, reason = "switch") {
  if (tabId === undefined || tabId === null) return;

  const finalizeKey = `${tabId}:${sessionType}`;
  const inFlight = SessionFinalizer.get(finalizeKey);
  if (inFlight) return;
  SessionFinalizer.add(finalizeKey);

  try {
    const session = await storage.activeSessions.get(tabId);
    if (!session || session.sessionType !== sessionType) {
      return;
    }
    await storage.activeSessions.remove(tabId);

    const now = Date.now();
    const startedAt = session.startedAt || now;
    const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));

    const logEventReasons = ["tab_switch", "tab_closed", "continue"];
    if (logEventReasons.includes(reason)) {
      await rawLogEvent({
        participantId: session.participantId,
        eventType: reason,
        procrastinationSite: session.procrastinationUrl,
        learningSite: session.learningUrl,
        eventData: sessionType,
      });
    }

    const logData = {
      participantId: session.participantId,
      sessionType,
      procrastinationSite: session.procrastinationUrl,
      sessionStart: new Date(startedAt),
      sessionEnd: new Date(now),
      actualDurationSeconds: durationSeconds,
      durationSeconds,
      completed: false,
    };

    if (session.goalMs) {
      logData.goalSeconds = Math.round(session.goalMs / 1000);
    } else if (sessionType === "learning") {
      logData.goalSeconds = await getGoalSeconds();
    }

    if (sessionType === "learning") {
      logData.learningSite = session.learningUrl;
    }

    await logSessionEvent(logData);
  } finally {
    SessionFinalizer.delete(finalizeKey);
  }
}

const SessionFinalizer = (() => {
  const keys = new Set();
  return {
    add: (key) => keys.add(key),
    delete: (key) => keys.delete(key),
    get: (key) => keys.has(key),
  };
})();

async function transferActiveSession(oldTabId, newTabId) {
  if (
    oldTabId === undefined ||
    oldTabId === null ||
    newTabId === undefined ||
    newTabId === null
  )
    return;
  const session = await storage.activeSessions.get(oldTabId);
  if (!session) return;
  await storage.activeSessions.remove(oldTabId);
  await storage.activeSessions.set(newTabId, { ...session });
}

export default {
  startSession,
  finalizeSession,
  transferActiveSession,
  getGoalSeconds,
  logEventAsync,
  logControlledSession,
};
