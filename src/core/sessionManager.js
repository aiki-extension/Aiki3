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
  getParticipantId,
  logControlledSession,
};
