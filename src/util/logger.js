import { BACK4APP_CONFIG } from "./back4appConfig";
import storage from "./storage";
import { parseUrl } from "./utilities";

const EXT_VERSION = (() => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version || "unknown";
    }
  } catch (_) {}
  return "unknown";
})();

const PARSE_BASE_URL = BACK4APP_CONFIG?.serverURL || "https://parseapi.back4app.com";
const participantCache = new Map();

function isConfigured() {
  return Boolean(BACK4APP_CONFIG?.appId && BACK4APP_CONFIG?.restKey && PARSE_BASE_URL);
}

function toParseDate(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return { __type: "Date", iso: date.toISOString() };
}

async function getParticipantId(explicit) {
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  try {
    const stored = await storage.uid.get();
    if (stored && typeof stored === "string" && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch (_) {}
  return null;
}

function domainFromUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  try {
    const parsed = parseUrl(value);
    if (parsed?.host) return parsed.host;
    if (parsed?.name) return parsed.name;
  } catch (_) {}
  try {
    const url = new URL(value);
    return url.host;
  } catch (error) {
    return value;
  }
}

function pruneUndefined(object) {
  return Object.entries(object).reduce((acc, [key, value]) => {
    if (value !== undefined) acc[key] = value;
    return acc;
  }, {});
}

function stringifyValue(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (_) {
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }
  return undefined;
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
  if (!record?.objectId) return undefined;
  return {
    __type: "Pointer",
    className: "Participants",
    objectId: record.objectId,
  };
}

function normalizeParticipantRecord(record, participantId) {
  if (!record || !record.objectId) return null;
  const installDate =
    (record.install_date && record.install_date.iso) || record.install_date || null;
  return {
    objectId: record.objectId,
    participant_id: participantId,
    install_date: installDate,
  };
}

async function findParticipant(participantId) {
  const where = encodeURIComponent(JSON.stringify({ participant_id: participantId }));
  const response = await parseRequest(`/classes/Participants?where=${where}&limit=1`);
  if (response && Array.isArray(response.results) && response.results.length > 0) {
    return response.results[0];
  }
  return null;
}

async function createParticipant(participantId) {
  const now = toParseDate(Date.now());
  const payload = {
    participant_id: participantId,
    assigned_version: EXT_VERSION,
    install_date: now,
    last_active_date: now,
    is_extension_active: true,
  };
  const response = await parseRequest("/classes/Participants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (response?.objectId) {
    return {
      objectId: response.objectId,
      participant_id: participantId,
      install_date: now.iso,
    };
  }
  return null;
}

async function cacheParticipant(record) {
  if (!record?.participant_id) return record;
  participantCache.set(record.participant_id, record);
  await storage.participantRecord.set(record);
  return record;
}

async function ensureParticipant(participantId) {
  if (!participantId) return null;
  if (participantCache.has(participantId)) {
    return participantCache.get(participantId);
  }

  const stored = await storage.participantRecord.get();
  if (stored?.participant_id === participantId && stored.objectId) {
    participantCache.set(participantId, stored);
    return stored;
  }

  const existing = await findParticipant(participantId);
  if (existing) {
    const normalized = normalizeParticipantRecord(existing, participantId);
    if (normalized) {
      return cacheParticipant(normalized);
    }
  }

  const created = await createParticipant(participantId);
  if (created) {
    return cacheParticipant(created);
  }
  return null;
}

async function updateParticipantRecord(record, updates = {}) {
  if (!record?.objectId || !updates || Object.keys(updates).length === 0) return;
  await parseRequest(`/classes/Participants/${record.objectId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

function getStudyDay(record) {
  const iso = record?.install_date?.iso || record?.install_date;
  if (!iso) return undefined;
  try {
    const installDate = new Date(iso);
    installDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - installDate) / (24 * 60 * 60 * 1000));
    return diff >= 0 ? diff + 1 : undefined;
  } catch (_) {
    return undefined;
  }
}

export async function resetParticipantCache() {
  participantCache.clear();
  await storage.participantRecord.clear();
}

function shouldLogAsAudit(eventType) {
  return eventType === "config";
}

function buildPromptResponse(event) {
  // If it's already a string, return it
  if (typeof event.promptResponse === "string") return event.promptResponse;
  
  // If it's an object, try to stringify it
  if (event.promptResponse && typeof event.promptResponse === "object") {
    try {
      return JSON.stringify(event.promptResponse);
    } catch (_) {}
  }
  
  return undefined;
}

function buildSessionPayload(event = {}) {
  return pruneUndefined({
    participantId: event.participantId,
    sessionType: event.sessionType || "event",
    learningSite: event.learningSite,
    procrastinationSite: event.procrastinationSite,
    triggerSource: event.triggerSource,
    promptResponse: buildPromptResponse(event),
    completedMicrolearning: event.completedMicrolearning,
    actualDurationSeconds: event.actualDurationSeconds,
    returnedToProcrastinationSite: event.returnedToProcrastinationSite,
  });
}

function buildAuditPayload(event = {}) {
  return pruneUndefined({
    participantId: event.participantId,
    action: event.action || "config_update",
    settingName: event.settingName,
    oldValue: event.oldValue,
    newValue: event.newValue,
  });
}

export async function logEvent(event = {}) {
  const eventType = event.eventType || "";
  try {
    if (shouldLogAsAudit(eventType)) {
      const auditPayload = buildAuditPayload(event);
      if (auditPayload) {
        await logAuditEvent(auditPayload);
      }
      return;
    }

    const sessionPayload = buildSessionPayload(event);
    if (sessionPayload) {
      await logSessionEvent(sessionPayload);
    }
  } catch (error) {
    console.warn("[Aiki] Unable to route event", error);
  }
}

export async function logSessionEvent(details = {}) {
  if (!isConfigured()) return;
  try {
    const participantId = details.participantId || (await getParticipantId());
    if (!participantId) return;
    const participant = await ensureParticipant(participantId);
    if (!participant) return;

    const payload = pruneUndefined({
      participant: toParticipantPointer(participant),
      session_type: details.sessionType || "intervention",
      domain: details.domain || domainFromUrl(details.learningSite),
      triggered_by_domain:
        details.triggeredByDomain || domainFromUrl(details.procrastinationSite),
      trigger_source: details.triggerSource || "extension",
      prompt_response: details.promptResponse,
      completed_microlearning: details.completedMicrolearning,
      actual_duration_seconds:
        typeof details.actualDurationSeconds === "number"
          ? Math.max(0, Math.round(details.actualDurationSeconds))
          : undefined,
      returned_to_procrastination_site: details.returnedToProcrastinationSite,
    });

    await parseRequest("/classes/Sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const participantUpdates = {
      last_active_date: toParseDate(Date.now()),
      total_interventions: { __op: "Increment", amount: 1 },
    };
    if (payload.prompt_response === "redirect") {
      participantUpdates.total_accepts = { __op: "Increment", amount: 1 };
    } else if (payload.prompt_response) {
      participantUpdates.total_declines = { __op: "Increment", amount: 1 };
    }
    if (payload.actual_duration_seconds && payload.actual_duration_seconds > 0) {
      participantUpdates.total_learning_time_min = {
        __op: "Increment",
        amount: payload.actual_duration_seconds / 60,
      };
    }
    await updateParticipantRecord(participant, participantUpdates);
  } catch (error) {
    console.warn("[Aiki] Unable to log session to Back4App", error);
  }
}

export async function logAuditEvent(audit = {}) {
  if (!isConfigured()) return;
  try {
    const participantId = audit.participantId || (await getParticipantId());
    if (!participantId) return;
    const participant = await ensureParticipant(participantId);
    if (!participant) return;

    const payload = pruneUndefined({
      participant: toParticipantPointer(participant),
      study_day: getStudyDay(participant),
      action: audit.action || "update",
      setting_name: audit.settingName,
      old_value: stringifyValue(audit.oldValue),
      new_value: stringifyValue(audit.newValue),
    });

    if (payload.participant && (payload.setting_name || payload.action)) {
      await parseRequest("/classes/AuditLog", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    const participantUpdates = {
      last_active_date: toParseDate(Date.now()),
    };
    if (audit.participantUpdates && typeof audit.participantUpdates === "object") {
      Object.assign(participantUpdates, audit.participantUpdates);
    }
    await updateParticipantRecord(participant, participantUpdates);
  } catch (error) {
    console.warn("[Aiki] Unable to log audit event to Back4App", error);
  }
}
