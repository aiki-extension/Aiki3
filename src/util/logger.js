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
        procrastination_reward_minutes: 5,
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
    timestamp: toParseDate(event.timestamp || Date.now()),
  };

  if (typeof event.decision === "string" && event.decision.trim()) {
    payload.decision = event.decision.trim();
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
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
    return [];
  };

  return {
    participant_id: participantPointer,
    timestamp: toParseDate(payload.timestamp || Date.now()),
    learning_time_minutes:
      typeof payload.learning_time_minutes === "number" ? payload.learning_time_minutes : undefined,
    operating_hours_start:
      typeof payload.operating_hours_start === "number"
        ? payload.operating_hours_start
        : undefined,
    operating_hours_end:
      typeof payload.operating_hours_end === "number" ? payload.operating_hours_end : undefined,
    procrastination_reward_minutes:
      typeof payload.procrastination_reward_minutes === "number"
        ? payload.procrastination_reward_minutes
        : undefined,
    procrastination_sites: toArray(payload.procrastination_sites),
    learning_sites: toArray(payload.learning_sites),
    is_active: typeof payload.is_active === "boolean" ? payload.is_active : undefined,
  };
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

// Compatibility wrapper to keep callers but route to the Event class only.
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

    const sessionPointer =
      sessionResponse?.objectId && sessionResponse?.objectId.length > 0
        ? { __type: "Pointer", className: "Sessions", objectId: sessionResponse.objectId }
        : null;

    await logEvent({
      participantId,
      eventType: details.sessionType || "session",
      timestamp: details.timestamp,
      decision: details.decision,
      sessionPointer,
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
  return logEvent({
    participantId: audit.participantId,
    eventType,
    timestamp: audit.timestamp,
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

    const existingId = await storage.userPreferencesId.get();
    const method = existingId ? "PUT" : "POST";
    const path = existingId ? `/classes/UserPreferences/${existingId}` : "/classes/UserPreferences";

    const response = await parseRequest(path, {
      method,
      body: JSON.stringify(payload),
    });

    if (response?.objectId) {
      await storage.userPreferencesId.set(response.objectId);
    }
    
    return response;
  } catch (error) {
    console.warn("[Aiki] Unable to save user preferences to Back4App", error);
    return null;
  }
}
