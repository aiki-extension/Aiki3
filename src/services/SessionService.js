import browser from "webextension-polyfill";
import storage from "../util/storage";
import siteDetector from "./siteDetector";
import { logEvent as rawLogEvent, logSessionEvent } from "../util/logger";

let cachedGoalSeconds = null;
let lastGoalFetch = 0;
const LEARNING_PAUSE_REASONS = new Set(["tab_switch", "window_blur"]);
const PROCRASTINATION_PAUSE_REASONS = new Set(["tab_switch", "window_blur"]);
const EVENT_LOG_REASONS = new Set(["tab_closed", "continue"]);

function toNonNegativeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function toTimestamp(value, fallback = null) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeLearningSession(session = {}) {
  const startedAt = toTimestamp(session.startedAt, Date.now());
  const activeDurationMs = toNonNegativeNumber(session.activeDurationMs, 0);
  const activeSegmentStartedAt = toTimestamp(session.activeSegmentStartedAt, null);
  return {
    ...session,
    startedAt,
    activeDurationMs,
    activeSegmentStartedAt,
  };
}

function normalizeProcrastinationSession(session = {}) {
  const startedAt = toTimestamp(session.startedAt, Date.now());
  const activeDurationMs = toNonNegativeNumber(session.activeDurationMs, 0);
  const activeSegmentStartedAt = toTimestamp(session.activeSegmentStartedAt, null);
  return {
    ...session,
    startedAt,
    activeDurationMs,
    activeSegmentStartedAt,
    procrastinationUrl:
      typeof session.procrastinationUrl === "string" && session.procrastinationUrl
        ? session.procrastinationUrl
        : null,
    learningUrl:
      typeof session.learningUrl === "string" && session.learningUrl ? session.learningUrl : null,
  };
}

function getComparableHost(value) {
  if (!value || typeof value !== "string") return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_) {
    return "";
  }
}

function closeTrackedSegment(session, normalizer, now = Date.now()) {
  const normalized = normalizer(session);
  const activeSince = toTimestamp(normalized.activeSegmentStartedAt, null);
  if (activeSince === null) {
    return { session: normalized, changed: false };
  }

  const deltaMs = Math.max(0, now - activeSince);
  return {
    session: {
      ...normalized,
      activeDurationMs: normalized.activeDurationMs + deltaMs,
      activeSegmentStartedAt: null,
    },
    changed: true,
  };
}

function closeLearningSegment(session, now = Date.now()) {
  return closeTrackedSegment(session, normalizeLearningSession, now);
}

function closeProcrastinationSegment(session, now = Date.now()) {
  return closeTrackedSegment(session, normalizeProcrastinationSession, now);
}

async function getAllActiveSessions() {
  try {
    const data = await browser.storage.local.get("activeSessions");
    return data && data.activeSessions && typeof data.activeSessions === "object"
      ? data.activeSessions
      : {};
  } catch (_) {
    return {};
  }
}

async function resolveLearningVisibility(tabId, session) {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab || !tab.active || typeof tab.url !== "string") {
      return { visible: false, tabUrl: tab?.url || null };
    }

    const windowInfo = await browser.windows.get(tab.windowId);
    if (!windowInfo || !windowInfo.focused) {
      return { visible: false, tabUrl: tab.url };
    }

    const learningUrl =
      typeof session.learningUrl === "string" && session.learningUrl
        ? session.learningUrl
        : await storage.learningUri.get();
    if (!learningUrl) {
      return { visible: false, tabUrl: tab.url };
    }

    const visible = siteDetector.isLearningSite(tab.url, learningUrl);
    return { visible, tabUrl: tab.url };
  } catch (_) {
    return { visible: false, tabUrl: null };
  }
}

async function resolveProcrastinationVisibility(tabId, session) {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab || !tab.active || typeof tab.url !== "string") {
      return { visible: false, tabUrl: tab?.url || null };
    }

    const windowInfo = await browser.windows.get(tab.windowId);
    if (!windowInfo || !windowInfo.focused) {
      return { visible: false, tabUrl: tab.url };
    }

    const trackedHost = getComparableHost(session?.procrastinationUrl);
    const tabHost = getComparableHost(tab.url);
    const visible = Boolean(trackedHost && tabHost && trackedHost === tabHost);
    return { visible, tabUrl: tab.url };
  } catch (_) {
    return { visible: false, tabUrl: null };
  }
}

async function logReasonEvent(session, sessionType, reason) {
  if (!EVENT_LOG_REASONS.has(reason)) return;
  await rawLogEvent({
    participantId: session.participantId,
    eventType: reason,
    procrastinationSite: session.procrastinationUrl,
    learningSite: session.learningUrl,
    eventData: sessionType,
  });
}

async function syncLearningSessionActivity(tabId, sessionSnapshot = null, options = {}) {
  if (tabId === undefined || tabId === null) return null;

  const session = sessionSnapshot || (await storage.activeSessions.get(tabId));
  if (!session || session.sessionType !== "learning") return null;

  const normalized = normalizeLearningSession(session);
  const now = Date.now();
  let next = normalized;
  let changed = false;

  if (options.forcePause) {
    const paused = closeLearningSegment(next, now);
    next = paused.session;
    changed = paused.changed;
  } else {
    const { visible, tabUrl } = await resolveLearningVisibility(tabId, next);
    if (visible) {
      if (next.activeSegmentStartedAt === null) {
        next = { ...next, activeSegmentStartedAt: now };
        changed = true;
      }
      if (tabUrl && tabUrl !== next.learningUrl) {
        next = { ...next, learningUrl: tabUrl };
        changed = true;
      }
    } else {
      const paused = closeLearningSegment(next, now);
      next = paused.session;
      changed = changed || paused.changed;
    }
  }

  if (changed) {
    await storage.activeSessions.set(tabId, next);
  }

  return next;
}

async function syncProcrastinationSessionActivity(tabId, sessionSnapshot = null, options = {}) {
  if (tabId === undefined || tabId === null) return null;

  const session = sessionSnapshot || (await storage.activeSessions.get(tabId));
  if (!session || session.sessionType !== "procrastination") return null;

  const normalized = normalizeProcrastinationSession(session);
  const now = Date.now();
  let next = normalized;
  let changed = false;

  if (options.forcePause) {
    const paused = closeProcrastinationSegment(next, now);
    next = paused.session;
    changed = paused.changed;
  } else {
    const { visible, tabUrl } = await resolveProcrastinationVisibility(tabId, next);
    if (visible) {
      if (next.activeSegmentStartedAt === null) {
        next = { ...next, activeSegmentStartedAt: now };
        changed = true;
      }
      if (tabUrl && tabUrl !== next.procrastinationUrl) {
        next = { ...next, procrastinationUrl: tabUrl };
        changed = true;
      }
    } else {
      const paused = closeProcrastinationSegment(next, now);
      next = paused.session;
      changed = changed || paused.changed;
    }
  }

  if (changed) {
    await storage.activeSessions.set(tabId, next);
  }

  return next;
}

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

async function startSession(tabId, sessionType, siteUrl, triggerUrl = null, options = {}) {
  if (tabId === undefined || tabId === null || !siteUrl) return;
  const participantId = await storage.uid.get();
  if (!participantId) return;

  const existingSession = await storage.activeSessions.get(tabId);
  const now = Date.now();
  const goalMs = Number.isFinite(options.goalMs)
    ? Math.max(0, Math.round(options.goalMs))
    : null;
  const learningUrlOption =
    typeof options.learningUrl === "string" && options.learningUrl
      ? options.learningUrl
      : typeof triggerUrl === "string" && triggerUrl
        ? triggerUrl
        : null;
  const resumeIfExists = options.resumeIfExists !== false;

  if (sessionType === "learning") {
    if (existingSession && existingSession.sessionType === "learning") {
      const resumedSession = normalizeLearningSession({
        ...existingSession,
        participantId: existingSession.participantId || participantId,
        learningUrl: siteUrl || existingSession.learningUrl,
        procrastinationUrl:
          triggerUrl !== null && triggerUrl !== undefined
            ? triggerUrl
            : existingSession.procrastinationUrl || null,
        goalMs: goalMs !== null ? goalMs : existingSession.goalMs,
      });
      await storage.activeSessions.set(tabId, resumedSession);
      await syncLearningSessionActivity(tabId, resumedSession);
      return;
    }

    if (existingSession) {
      await finalizeSession(tabId, existingSession.sessionType, "navigation", {
        completed: false,
      });
    }

    const sessionData = normalizeLearningSession({
      participantId,
      sessionType,
      startedAt: now,
      learningUrl: siteUrl,
      procrastinationUrl: triggerUrl,
      goalMs,
      activeDurationMs: 0,
      activeSegmentStartedAt: null,
    });

    await storage.activeSessions.set(tabId, sessionData);
    await syncLearningSessionActivity(tabId, sessionData);
    return;
  }

  if (sessionType === "procrastination") {
    if (existingSession && existingSession.sessionType === "procrastination" && resumeIfExists) {
      const resumedSession = normalizeProcrastinationSession({
        ...existingSession,
        participantId: existingSession.participantId || participantId,
        procrastinationUrl: siteUrl || existingSession.procrastinationUrl,
        learningUrl: learningUrlOption || existingSession.learningUrl || null,
        goalMs: goalMs !== null ? goalMs : existingSession.goalMs,
      });
      await storage.activeSessions.set(tabId, resumedSession);
      await syncProcrastinationSessionActivity(tabId, resumedSession);
      return;
    }

    if (existingSession) {
      await finalizeSession(tabId, existingSession.sessionType, "navigation", {
        completed: false,
      });
    }

    const sessionData = normalizeProcrastinationSession({
      participantId,
      sessionType,
      startedAt: now,
      procrastinationUrl: siteUrl,
      learningUrl: learningUrlOption,
      goalMs,
      activeDurationMs: 0,
      activeSegmentStartedAt: null,
    });

    await storage.activeSessions.set(tabId, sessionData);
    await syncProcrastinationSessionActivity(tabId, sessionData);
    return;
  }

  const sessionData = {
    participantId,
    sessionType,
    startedAt: now,
    procrastinationUrl: siteUrl,
  };

  await storage.activeSessions.set(tabId, sessionData);
}

async function finalizeSession(tabId, sessionType, reason = "switch", options = {}) {
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

    const now = Date.now();
    const shouldPauseOnly =
      (sessionType === "learning" && LEARNING_PAUSE_REASONS.has(reason)) ||
      (sessionType === "procrastination" && PROCRASTINATION_PAUSE_REASONS.has(reason));

    let finalizedSession = session;
    if (sessionType === "learning") {
      const forcePause = !shouldPauseOnly || reason === "window_blur";
      finalizedSession =
        (await syncLearningSessionActivity(tabId, session, { forcePause })) ||
        normalizeLearningSession(session);
    } else if (sessionType === "procrastination") {
      const forcePause = !shouldPauseOnly || reason === "window_blur";
      finalizedSession =
        (await syncProcrastinationSessionActivity(tabId, session, { forcePause })) ||
        normalizeProcrastinationSession(session);
    }

    await logReasonEvent(finalizedSession, sessionType, reason);

    if (shouldPauseOnly) {
      return;
    }

    const startedAt =
      toTimestamp(finalizedSession.startedAt, now) ||
      toTimestamp(session.startedAt, now) ||
      now;
    const durationMs =
      sessionType === "learning" || sessionType === "procrastination"
        ? toNonNegativeNumber(finalizedSession.activeDurationMs, 0)
        : Math.max(0, now - startedAt);
    const durationSeconds = Math.max(0, Math.round(durationMs / 1000));

    const logData = {
      participantId: finalizedSession.participantId,
      sessionType,
      procrastinationSite: finalizedSession.procrastinationUrl,
      sessionStart: new Date(startedAt),
      sessionEnd: new Date(now),
      actualDurationSeconds: durationSeconds,
      durationSeconds,
      completed: sessionType === "procrastination" ? false : options.completed === true,
    };

    if (finalizedSession.goalMs) {
      logData.goalSeconds = Math.round(finalizedSession.goalMs / 1000);
    } else if (sessionType === "learning") {
      logData.goalSeconds = await getGoalSeconds();
    }

    if (sessionType === "learning") {
      logData.learningSite = finalizedSession.learningUrl;
    }

    await logSessionEvent(logData);
    await storage.activeSessions.remove(tabId);
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

async function finalizeAllSessions(sessionType, reason = "switch", options = {}) {
  const sessions = await getAllActiveSessions();
  const entries = Object.entries(sessions);
  for (const [tabKey, session] of entries) {
    if (!session || session.sessionType !== sessionType) continue;
    const parsedTabId = Number(tabKey);
    const tabId = Number.isFinite(parsedTabId) ? parsedTabId : tabKey;
    await finalizeSession(tabId, sessionType, reason, options);
  }
}

async function reconcileLearningSessions() {
  const sessions = await getAllActiveSessions();
  const entries = Object.entries(sessions);
  for (const [tabKey, session] of entries) {
    if (!session || session.sessionType !== "learning") continue;
    const parsedTabId = Number(tabKey);
    const tabId = Number.isFinite(parsedTabId) ? parsedTabId : tabKey;
    await syncLearningSessionActivity(tabId, session);
  }
}

async function reconcileProcrastinationSessions() {
  const sessions = await getAllActiveSessions();
  const entries = Object.entries(sessions);
  for (const [tabKey, session] of entries) {
    if (!session || session.sessionType !== "procrastination") continue;
    const parsedTabId = Number(tabKey);
    const tabId = Number.isFinite(parsedTabId) ? parsedTabId : tabKey;
    await syncProcrastinationSessionActivity(tabId, session);
  }
}

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

  let movedSession = { ...session };
  if (session.sessionType === "learning") {
    movedSession = closeLearningSegment(session, Date.now()).session;
  } else if (session.sessionType === "procrastination") {
    movedSession = closeProcrastinationSegment(session, Date.now()).session;
  }

  await storage.activeSessions.remove(oldTabId);
  await storage.activeSessions.set(newTabId, movedSession);
  if (movedSession.sessionType === "learning") {
    await syncLearningSessionActivity(newTabId, movedSession);
  } else if (movedSession.sessionType === "procrastination") {
    await syncProcrastinationSessionActivity(newTabId, movedSession);
  }
}

export default {
  startSession,
  finalizeSession,
  finalizeAllSessions,
  transferActiveSession,
  syncLearningSessionActivity,
  syncProcrastinationSessionActivity,
  reconcileLearningSessions,
  reconcileProcrastinationSessions,
  getGoalSeconds,
  logEventAsync,
  logControlledSession,
};
