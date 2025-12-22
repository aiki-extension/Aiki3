import { BACK4APP_CONFIG } from "./back4appConfig";
import storage from "./storage";
import { parseUrl } from "./utilities";

const EXT_VERSION = "decision-based-redirection";

const PARSE_BASE_URL = BACK4APP_CONFIG?.serverURL || "https://parseapi.back4app.com";
const participantCache = new Map();

function isConfigured() {
  return Boolean(BACK4APP_CONFIG?.appId && BACK4APP_CONFIG?.restKey && PARSE_BASE_URL);
}

function toParseDate(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return { __type: "Date", iso: date.toISOString() };
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.iso) return value.iso;
  return null;
}

async function getParticipantId(explicit) {
  if (explicit && typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  try {
    const stored = await storage.uid.get();
    if (stored && typeof stored === "string" && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch (_) {}
  return null;
}

async function parseRequest(path, options = {}) {
  if (!isConfigured()) return null;
  const headers = {
    "X-Parse-Application-Id": BACK4APP_CONFIG.appId,
    "X-Parse-REST-API-Key": BACK4APP_CONFIG.restKey,
  };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${PARSE_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || response.statusText || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

function toParticipantPointer(record) {
  if (!record?.objectId) return null;
  return { __type: "Pointer", className: "Participants", objectId: record.objectId };
}

function normalizeParticipantRecord(record, participantId) {
  if (!record) return null;
  return {
    objectId: record.objectId,
    participant_id: record.participant_id || record.participantId || participantId,
    assigned_version: record.assigned_version || record.assignedVersion,
    install_date: toIso(record.install_date || record.installDate),
  };
}

async function createParticipant(participantId) {
  const now = toParseDate(Date.now());
  const payload = {
    participant_id: participantId,
    assigned_version: EXT_VERSION,
    install_date: now,
  };
  const response = await parseRequest("/classes/Participants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response?.objectId) return null;
  
  // Initialize default preferences
  const participantRecord = normalizeParticipantRecord({ ...payload, ...response }, participantId);
  try {
    const pointer = toParticipantPointer(participantRecord);
    if (pointer) {
      const prefsPayload = sanitizeUserPreferences({
        is_active: true,
        learning_time_minutes: 30,
        operating_hours_start: 480,   // 8:00 AM (8 * 60 = 480 minutes from midnight)
        operating_hours_end: 1290,    // 9:30 PM (21 * 60 + 30 = 1290 minutes from midnight)
      }, pointer);
      
      if (prefsPayload) {
        const prefsResponse = await parseRequest("/classes/UserPreferences", {
          method: "POST",
          body: JSON.stringify(prefsPayload),
        });
        if (prefsResponse?.objectId) {
          await storage.userPreferencesId.set(prefsResponse.objectId);
        }
      }
    }
  } catch (e) {
    console.warn("Failed to initialize default preferences", e);
  }

  return participantRecord;
}

async function cacheParticipant(record) {
  const key = record?.participant_id || record?.participantId;
  if (!key) return record;
  const normalized = normalizeParticipantRecord(
    { ...record, participant_id: key },
    key
  );
  if (!normalized) return record;
  participantCache.set(key, normalized);
  await storage.participantRecord.set(normalized);
  return record;
}

async function ensureParticipant(participantId) {
  if (!participantId) return null;
  
  // 1. Check Memory Cache
  if (participantCache.has(participantId)) {
    const cached = participantCache.get(participantId);
    if (cached?.objectId) return cached;
  }

  // 2. Check Local Storage
  const stored = await storage.participantRecord.get();
  const storedId = stored?.participant_id || stored?.participantId;
  
  // We must have both the matching ID and the Parse objectId
  if (storedId === participantId && stored?.objectId) {
    const normalized = normalizeParticipantRecord(stored, participantId);
    if (normalized?.objectId) {
      participantCache.set(participantId, normalized);
      return normalized;
    }
  }

  // 3. Fallback: Create New (Registration)
  // We do NOT query (findParticipant) because public find access is disabled.
  // If the ID exists but we lost the objectId, we just create a new record (or duplicate).
  const created = await createParticipant(participantId);
  if (created?.objectId) {
    return cacheParticipant(created);
  }
  
  return null;
}

export async function resetParticipantCache() {
  participantCache.clear();
  await storage.participantRecord.clear();
}

function toDomainOnly(urlValue) {
  if (!urlValue || typeof urlValue !== "string") return undefined;
  try {
    const parsed = parseUrl(urlValue);
    if (parsed?.host) return parsed.host;
    if (parsed?.name) return parsed.name;
  } catch (_) {}
  try {
    const u = new URL(urlValue);
    return u.host;
  } catch (_) {
    return urlValue;
  }
}

function sanitizeEventPayload(event, participantPointer) {
  if (!participantPointer) return null;

  const eventType =
    (typeof event.eventType === "string" && event.eventType.trim()) ||
    (typeof event.sessionType === "string" && event.sessionType.trim()) ||
    (typeof event.action === "string" && event.action.trim()) ||
    "event";

  const payload = {
    participant_id: participantPointer,
    event_type: eventType,
  };

  const data = typeof event.eventData === "string" && event.eventData.trim()
    ? event.eventData.trim()
    : typeof event.decision === "string" && event.decision.trim()
    ? event.decision.trim()
    : null;
  if (data) {
    payload.eventData = data;
  }
  if (event.sessionPointer) {
    payload.session_id = event.sessionPointer;
  }

  return payload;
}

function sanitizeSessionPayload(details, participantPointer) {
  if (!participantPointer) return null;
  const completedFlag =
    details.completed === true || details.completedMicrolearning === true
      ? true
      : details.completed === false || details.completedMicrolearning === false
      ? false
      : undefined;
  const payload = {
    participant_id: participantPointer,
    session_type: typeof details.sessionType === "string" ? details.sessionType : "session",
  };

  if (details.sessionStart) payload.session_start = toParseDate(new Date(details.sessionStart));
  if (details.sessionEnd) payload.session_end = toParseDate(new Date(details.sessionEnd));
  if (typeof details.durationSeconds === "number") {
    payload.duration_seconds = Math.max(0, Math.round(details.durationSeconds));
  }
  if (typeof details.goalSeconds === "number") {
    payload.goal_seconds = Math.max(0, Math.round(details.goalSeconds));
  }
  if (typeof completedFlag === "boolean") {
    payload.completed = completedFlag;
  } else {
    payload.completed = false;
  }
  if (details.siteVisited) {
    payload.site_visited = toDomainOnly(details.siteVisited);
  } else if (details.learningSite) {
    payload.site_visited = toDomainOnly(details.learningSite);
  }
  if (details.triggeredBySite) {
    payload.triggered_by_site = toDomainOnly(details.triggeredBySite);
  } else if (details.procrastinationSite) {
    payload.triggered_by_site = toDomainOnly(details.procrastinationSite);
  }

  return payload;
}

function sanitizeUserPreferences(payload, participantPointer) {
  if (!participantPointer) return null;

  const normalizeSite = (value) => {
    if (!value || typeof value !== "string") return null;
    return toDomainOnly(value);
  };

  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeSites = (value) =>
    toArray(value)
      .map((v) => normalizeSite(v) || v)
      .filter(Boolean);

  const normalizedPrefs = {
    participant_id: participantPointer,
    learning_time_minutes:
      typeof payload?.learning_time_minutes === "number"
        ? payload.learning_time_minutes
        : undefined,
    operating_hours_start:
      typeof payload?.operating_hours_start === "number"
        ? payload.operating_hours_start
        : undefined,
    operating_hours_end:
      typeof payload?.operating_hours_end === "number"
        ? payload.operating_hours_end
        : undefined,
    procrastination_reward_minutes:
      typeof payload?.procrastination_reward_minutes === "number"
        ? payload.procrastination_reward_minutes
        : undefined,
    is_active:
      typeof payload?.is_active === "boolean" ? payload.is_active : undefined,
  };

  if (payload && "procrastination_sites" in payload) {
    normalizedPrefs.procrastination_sites = normalizeSites(payload.procrastination_sites);
  }

  if (payload && "learning_sites" in payload) {
    normalizedPrefs.learning_sites = normalizeSites(payload.learning_sites);
  }

  return normalizedPrefs;
}

function pruneUndefined(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const next = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) next[k] = v;
  });
  return next;
}

export async function logEvent(event = {}) {
  if (!isConfigured()) return;
  try {
    const participantId = await getParticipantId(event.participantId);
    if (!participantId) return;
    const participant = await ensureParticipant(participantId);
    if (!participant) return;

    const pointer = toParticipantPointer(participant);
    const payload = sanitizeEventPayload(event, pointer);
    if (!payload?.event_type) return;

    await parseRequest("/classes/Events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("[Aiki] Unable to log event to Back4App", error);
  }
}

// Creates a Session record only - Events are for discrete actions
export async function logSessionEvent(details = {}) {
  if (!isConfigured()) return null;
  try {
    const participantId = await getParticipantId(details.participantId);
    if (!participantId) return null;
    const participant = await ensureParticipant(participantId);
    if (!participant) return null;
    const pointer = toParticipantPointer(participant);
    if (!pointer) return null;

    const durationSeconds =
      typeof details.actualDurationSeconds === "number"
        ? details.actualDurationSeconds
        : typeof details.durationSeconds === "number"
        ? details.durationSeconds
        : 0;

    const sessionPayload = sanitizeSessionPayload(
      {
        ...details,
        durationSeconds,
      },
      pointer
    );
    if (!sessionPayload) return null;

    const sessionResponse = await parseRequest("/classes/Sessions", {
      method: "POST",
      body: JSON.stringify(sessionPayload),
    });

    return sessionResponse;
  } catch (error) {
    console.warn("[Aiki] Unable to log session to Back4App", error);
    return null;
  }
}

// Compatibility wrapper to keep callers but route to the Event class only.
export async function logAuditEvent(audit = {}) {
  const suffix = audit.settingName ? `:${audit.settingName}` : "";
  const eventType = audit.action ? `audit:${audit.action}${suffix}` : `audit${suffix}`;
  const auditData = (() => {
    // Prefer caller-provided eventData when present.
    if (typeof audit.eventData === "string" && audit.eventData.trim()) {
      return audit.eventData.trim();
    }
    const payload = pruneUndefined({
      old: "oldValue" in audit ? audit.oldValue ?? null : undefined,
      new: "newValue" in audit ? audit.newValue ?? null : undefined,
      participantUpdates: audit.participantUpdates,
    });
    return Object.keys(payload).length ? JSON.stringify(payload) : null;
  })();
  return logEvent({
    participantId: audit.participantId,
    eventType,
    eventData: auditData,
  });
}

export async function saveUserPreferences(preferences = {}) {
  if (!isConfigured()) return null;
  try {
    const participantId = await getParticipantId(preferences.participantId);
    if (!participantId) return null;
    const participant = await ensureParticipant(participantId);
    if (!participant) return null;
    const pointer = toParticipantPointer(participant);
    const payload = sanitizeUserPreferences(preferences, pointer);
    if (!payload) return null;

    let existingId = await storage.userPreferencesId.get();
    let existing = null;

    if (!existingId) {
      // Try to find existing preferences by participant pointer
      try {
        const where = encodeURIComponent(JSON.stringify({ participant_id: pointer }));
        const found = await parseRequest(`/classes/UserPreferences?where=${where}&limit=1`);
        if (found?.results?.[0]) {
          existing = found.results[0];
          existingId = existing.objectId;
          await storage.userPreferencesId.set(existingId);
        }
      } catch (_) {}
    }

    if (existingId && !existing) {
      try {
        existing = await parseRequest(`/classes/UserPreferences/${existingId}`, { method: "GET" });
      } catch (_) {}
    }

    const hasChanged = (before, after) => JSON.stringify(before) !== JSON.stringify(after);
    const logPrefChange = async (key, before, after) => {
      if (!hasChanged(before, after)) return;
      await logEvent({
        participantId,
        eventType: `audit:user_prefs:${key}`,
        eventData: JSON.stringify({ key, old: before ?? null, new: after ?? null }),
      });
    };

    const mergedPayload = pruneUndefined({
      ...payload,
      procrastination_sites:
        "procrastination_sites" in payload
          ? payload.procrastination_sites
          : existing?.procrastination_sites,
      learning_sites:
        "learning_sites" in payload
          ? payload.learning_sites
          : existing?.learning_sites,
    });

    const method = existingId ? "PUT" : "POST";
    const path = existingId ? `/classes/UserPreferences/${existingId}` : "/classes/UserPreferences";

    const response = await parseRequest(path, {
      method,
      body: JSON.stringify(mergedPayload),
    });

    if (response?.objectId) {
      await storage.userPreferencesId.set(response.objectId);
    }

    // Log detailed preference updates (old vs new) to Events
    try {
      const before = existing || {};
      const after = { ...before, ...mergedPayload };
      await logPrefChange(
        "learning_time_minutes",
        before.learning_time_minutes ?? null,
        after.learning_time_minutes ?? null
      );
      await logPrefChange(
        "operating_hours_start",
        before.operating_hours_start ?? null,
        after.operating_hours_start ?? null
      );
      await logPrefChange(
        "operating_hours_end",
        before.operating_hours_end ?? null,
        after.operating_hours_end ?? null
      );
      await logPrefChange(
        "procrastination_reward_minutes",
        before.procrastination_reward_minutes ?? null,
        after.procrastination_reward_minutes ?? null
      );
      await logPrefChange(
        "procrastination_sites",
        before.procrastination_sites || [],
        after.procrastination_sites || []
      );
      await logPrefChange("learning_sites", before.learning_sites || [], after.learning_sites || []);
      await logPrefChange("is_active", before.is_active ?? null, after.is_active ?? null);
    } catch (e) {
      console.warn("[Aiki] Unable to log preference update", e);
    }
    
    return response;
  } catch (error) {
    console.warn("[Aiki] Unable to save user preferences to Back4App", error);
    return null;
  }
}

/**
 * Fetch session statistics from the database for a given time period.
 * @param {Object} options
 * @param {string} [options.participantId] - Optional participant ID (defaults to stored UID)
 * @param {Date} [options.startDate] - Start of date range (inclusive)
 * @param {Date} [options.endDate] - End of date range (inclusive, defaults to now)
 * @returns {Promise<{procrastinationSeconds: number, learningSeconds: number, learningSessionCount: number, procrastinationSessionCount: number, avgLearningSessionSeconds: number}>}
 */
export async function fetchSessionStats(options = {}) {
  if (!isConfigured()) {
    return { procrastinationSeconds: 0, learningSeconds: 0, learningSessionCount: 0, procrastinationSessionCount: 0, avgLearningSessionSeconds: 0 };
  }
  
  try {
    const participantId = await getParticipantId(options.participantId);
    if (!participantId) {
      return { procrastinationSeconds: 0, learningSeconds: 0, learningSessionCount: 0, procrastinationSessionCount: 0, avgLearningSessionSeconds: 0 };
    }
    
    const participant = await ensureParticipant(participantId);
    if (!participant) {
      return { procrastinationSeconds: 0, learningSeconds: 0, learningSessionCount: 0, procrastinationSessionCount: 0, avgLearningSessionSeconds: 0 };
    }
    
    const pointer = toParticipantPointer(participant);
    if (!pointer) {
      return { procrastinationSeconds: 0, learningSeconds: 0, learningSessionCount: 0, procrastinationSessionCount: 0, avgLearningSessionSeconds: 0 };
    }
    
    // Build query constraints
    const constraints = {
      participant_id: pointer,
    };
    
    if (options.startDate) {
      constraints.session_start = constraints.session_start || {};
      constraints.session_start.$gte = toParseDate(options.startDate);
    }
    if (options.endDate) {
      constraints.session_start = constraints.session_start || {};
      constraints.session_start.$lte = toParseDate(options.endDate);
    }
    
    const where = encodeURIComponent(JSON.stringify(constraints));
    const limit = 1000; // Fetch up to 1000 sessions
    
    const response = await parseRequest(`/classes/Sessions?where=${where}&limit=${limit}`);
    const sessions = response?.results || [];
    
    let procrastinationSeconds = 0;
    let learningSeconds = 0;
    let learningSessionCount = 0;
    let procrastinationSessionCount = 0;
    
    for (const session of sessions) {
      const duration = typeof session.duration_seconds === "number" ? session.duration_seconds : 0;
      if (session.session_type === "learning") {
        learningSeconds += duration;
        learningSessionCount++;
      } else if (session.session_type === "procrastination") {
        procrastinationSeconds += duration;
        procrastinationSessionCount++;
      }
    }
    
    const avgLearningSessionSeconds = learningSessionCount > 0
      ? Math.round(learningSeconds / learningSessionCount)
      : 0;
    
    const avgProcrastinationSessionSeconds = procrastinationSessionCount > 0
      ? Math.round(procrastinationSeconds / procrastinationSessionCount)
      : 0;
    
    return {
      procrastinationSeconds,
      learningSeconds,
      learningSessionCount,
      procrastinationSessionCount,
      avgLearningSessionSeconds,
      avgProcrastinationSessionSeconds,
    };
  } catch (error) {
    console.warn("[Aiki] Unable to fetch session stats from Back4App", error);
    return { procrastinationSeconds: 0, learningSeconds: 0, learningSessionCount: 0, procrastinationSessionCount: 0, avgLearningSessionSeconds: 0, avgProcrastinationSessionSeconds: 0 };
  }
}
