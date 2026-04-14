import storage from '../util/storage';
let cachedGoalSeconds = null;
let lastGoalFetch = 0;

async function getGoalSeconds() {
  const now = Date.now();
  if (cachedGoalSeconds !== null && now - lastGoalFetch < 60 * 1000) {
    return cachedGoalSeconds;
  }
  try {
    const timeSetting = await storage.timeSettings.learningTime.get();
    if (
      timeSetting &&
      typeof timeSetting.min === 'number' &&
      typeof timeSetting.sec === 'number'
    ) {
      cachedGoalSeconds = Math.max(
        0,
        Math.round(timeSetting.min * 60 + timeSetting.sec),
      );
      lastGoalFetch = now;
      return cachedGoalSeconds;
    }
  } catch {}
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

  if (sessionType === 'learning') {
    sessionData.learningUrl = siteUrl;
    sessionData.procrastinationUrl = triggerUrl;
  } else {
    sessionData.procrastinationUrl = siteUrl;
  }

  await storage.activeSessions.set(tabId, sessionData);
}

async function finalizeSession(tabId, sessionType) {
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
    } else if (sessionType === 'learning') {
      logData.goalSeconds = await getGoalSeconds();
    }

    if (sessionType === 'learning') {
      logData.learningSite = session.learningUrl;
    }
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
  logEventAsync: () => {},
  logControlledSession: async () => {},
};
