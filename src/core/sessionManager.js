/**
 * Session Manager - Unified session tracking and logging
 */

import storage from "../util/storage";
import { logEvent as rawLogEvent, logSessionEvent } from "../util/logger";

/**
 * Get current participant ID.
 * @returns {Promise<string|null>}
 */
async function getParticipantId() {
  try {
    return await storage.uid.get() || null;
  } catch (e) {
    return null;
  }
}

/**
 * Log an event with participant ID automatically included.
 * @param {string} eventType - Event type
 * @param {Object} data - Additional event data
 * @returns {Promise<void>}
 */
export async function logEvent(eventType, data = {}) {
  const participantId = await getParticipantId();
  return rawLogEvent({
    participantId,
    eventType,
    ...data,
  }).catch(e => {
    console.warn("[SessionManager] Failed to log event:", e);
  });
}

/**
 * Log an event without awaiting (fire and forget).
 * @param {string} eventType - Event type
 * @param {Object} data - Additional event data
 */
export function logEventAsync(eventType, data = {}) {
  getParticipantId().then(participantId => {
    rawLogEvent({
      participantId,
      eventType,
      ...data,
    }).catch(() => {});
  });
}

/**
 * Start a session for the given tab.
 * @param {number} tabId - Tab ID
 * @param {string} sessionType - "learning" or "procrastination"
 * @param {string} siteUrl - URL of site being visited
 * @param {string|null} triggerUrl - Procrastination URL that triggered learning
 * @returns {Promise<void>}
 */
export async function startSession(tabId, sessionType, siteUrl, triggerUrl = null) {
  if (tabId === undefined || tabId === null || !siteUrl) return;
  const participantId = await getParticipantId();
  if (!participantId) return;
  
  // Remove any existing session for this tab
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

/**
 * Finalize and log the session for the given tab.
 * @param {number} tabId - Tab ID
 * @param {string} sessionType - "learning" or "procrastination"
 * @param {string} reason - Reason for ending
 * @returns {Promise<void>}
 */
export async function finalizeSession(tabId, sessionType, reason = "switch") {
  if (tabId === undefined || tabId === null) return;
  
  const session = await storage.activeSessions.get(tabId);
  if (!session || session.sessionType !== sessionType) return;
  
  const durationMs = Date.now() - (session.startedAt || Date.now());
  
  // Log session end
  await logSessionEvent({
    participantId: session.participantId,
    sessionType: session.sessionType,
    startedAt: new Date(session.startedAt).toISOString(),
    durationMs,
    learningUrl: session.learningUrl,
    procrastinationUrl: session.procrastinationUrl,
  }).catch(() => {});
  
  // Remove session
  await storage.activeSessions.remove(tabId);
}

/**
 * Finalize all active sessions.
 * @param {string} reason - Reason for ending
 * @returns {Promise<void>}
 */
export async function finalizeAllSessions(reason = "cleanup") {
  try {
    const sessions = await storage.activeSessions.get();
    if (!sessions || typeof sessions !== "object") return;
    
    for (const tabId of Object.keys(sessions)) {
      const session = sessions[tabId];
      if (session && session.sessionType) {
        await finalizeSession(parseInt(tabId), session.sessionType, reason);
      }
    }
  } catch (e) {
    console.warn("[SessionManager] Failed to finalize all sessions:", e);
  }
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
export async function logControlledSession(options = {}) {
  const participantId = await getParticipantId();
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
    console.warn("[SessionManager] Failed to log controlled session:", e);
  });
}

export default {
  logEvent,
  logEventAsync,
  startSession,
  finalizeSession,
  finalizeAllSessions,
  getParticipantId,
  logControlledSession,
};
