import storage from "./util/storage";
import { logEvent, logSessionEvent } from "./util/logger";
import browser from "webextension-polyfill";
import timer from "./timer";
import { parseUrl, makeDate, parseTime } from "./util/utilities";
import { isControlled } from "./util/variantConfig";
import controlledMode from "./controlledMode";
import siteDetector from "./core/siteDetector";

const l = console.log;

let shouldShowWelcome = true;
const PROMPT_SUPPRESS_DURATION = 2 * 60 * 1000; // 2 minutes
const PRELOAD_HIDE_CSS = `
  html, body {
    visibility: hidden !important;
    opacity: 0 !important;
    background: #030712 !important;
  }
`;
const hiddenTabs = new Set();
const pendingRevealTabs = new Set();
const PREPROMPT_ID = "__aiki-preprompt";
// Per-tab session state is managed entirely via storage.activeSessions
// No global "active session" - each tab tracks its own session independently
let procrastinationGuardsRegistered = false;
let cachedGoalSeconds = null;
let lastGoalFetch = 0;
// Track last active tab per window for proper session handoff on tab switch
const lastActiveTabByWindow = new Map();
// Track sessions currently being finalized to prevent duplicate logging (race condition fix)
const finalizingSessionKeys = new Set();

function buildProcrastinationUrlFilters(list = []) {
  const seen = new Set();
  return list
    .map((item) => {
      const parsed = parseUrl(item?.host || item?.name || "");
      const host = (parsed.host || item?.host || "").trim().toLowerCase();
      if (!host || seen.has(host)) return null;
      seen.add(host);
      return { hostSuffix: host };
    })
    .filter(Boolean);
}

/**
 * Start a session for the given tab.
 * @param {number} tabId - The tab ID
 * @param {string} sessionType - "learning" or "procrastination"
 * @param {string} siteUrl - The URL of the site being visited
 * @param {string|null} triggerUrl - The procrastination URL that triggered learning (for learning sessions)
 */
async function startSession(tabId, sessionType, siteUrl, triggerUrl = null) {
  if (tabId === undefined || tabId === null || !siteUrl) return;
  const participantId = await storage.uid.get();
  if (!participantId) return;
  
  // Silently remove any existing session for this tab (don't log, just overwrite)
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
 * @param {number} tabId - The tab ID
 * @param {string} sessionType - "learning" or "procrastination"  
 * @param {string} reason - Reason for ending (tab_switch, tab_closed, etc.)
 */
async function finalizeSession(tabId, sessionType, reason = "switch") {
  if (tabId === undefined || tabId === null) return;
  
  // Create a unique key for this finalization attempt to prevent race conditions
  const finalizeKey = `${tabId}:${sessionType}`;
  if (finalizingSessionKeys.has(finalizeKey)) return;
  finalizingSessionKeys.add(finalizeKey);
  
  try {
    const session = await storage.activeSessions.get(tabId);
    if (!session || session.sessionType !== sessionType) {
      return;
    }
    await storage.activeSessions.remove(tabId);

    const now = Date.now();
    const startedAt = session.startedAt || now;
    const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));

    // Log discrete event for session end reasons
    const logEventReasons = ["tab_switch", "tab_closed", "continue"];
    if (logEventReasons.includes(reason)) {
      await logEvent({
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

    // Use stored goalMs if available (controlled variant), otherwise fetch daily goal
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
    finalizingSessionKeys.delete(finalizeKey);
  }
}

async function getGoalSeconds() {
  const now = Date.now();
  if (cachedGoalSeconds !== null && now - lastGoalFetch < 60 * 1000) {
    return cachedGoalSeconds;
  }
  try {
    const timeSetting = await storage.timeSettings.learningTime.get();
    if (timeSetting && typeof timeSetting.min === "number" && typeof timeSetting.sec === "number") {
      cachedGoalSeconds = Math.max(0, Math.round(timeSetting.min * 60 + timeSetting.sec));
      lastGoalFetch = now;
      return cachedGoalSeconds;
    }
  } catch (_) {}
  cachedGoalSeconds = 0;
  lastGoalFetch = now;
  return cachedGoalSeconds;
}

async function migrateActiveSession(oldTabId, newTabId) {
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

async function handleTabNavigation(tabId, nextUrl) {
  if (!tabId || !nextUrl) return;
  const session = await storage.activeSessions.get(tabId);
  if (!session) return;

  const extractName = (value) => {
    try {
      return parseUrl(value || "").name;
    } catch (_) {
      return "";
    }
  };

  const nextName = extractName(nextUrl);

  if (session.sessionType === "procrastination") {
    const currentName = extractName(session.procrastinationUrl);
    if (currentName && nextName && currentName === nextName) {
      await storage.activeSessions.set(tabId, { ...session, procrastinationUrl: nextUrl });
      return;
    }
    await finalizeSession(tabId, "procrastination", "navigation");
    return;
  }

  if (session.sessionType === "learning") {
    const currentName = extractName(session.learningUrl);
    if (currentName && nextName && currentName === nextName) {
      await storage.activeSessions.set(tabId, { ...session, learningUrl: nextUrl });
      return;
    }
    await finalizeSession(tabId, "learning", "navigation");
  }
}

/**
 * Start a session for the given tab if it's on a tracked site.
 * Always starts a NEW session (even if returning to same site/category).
 */
async function maybeStartSessionForTab(tabId) {
  if (tabId === undefined || tabId === null) return;
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab || !tab.url) return;
    
    // Check if on a procrastination site
    if (await siteDetector.checkIfProcrastination(tab.url)) {
      await startSession(tabId, "procrastination", tab.url);
      return;
    }
    
    // Check if on a learning site
    if (await siteDetector.checkIfLearning(tab.url)) {
      const origin = await storage.origin.get();
      await startSession(tabId, "learning", tab.url, origin?.url || null);
      return;
    }
  } catch (_) {
    // Tab may have been closed or is otherwise inaccessible
  }
}

/**
 * Finalize all active sessions (used when window loses focus)
 */
async function finalizeAllActiveSessions(reason = "window_blur") {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      if (tab?.id !== undefined) {
        await finalizeSession(tab.id, "procrastination", reason);
        await finalizeSession(tab.id, "learning", reason);
      }
    }
  } catch (_) {}
}

function registerProcrastinationGuards() {
  if (procrastinationGuardsRegistered) return;
  procrastinationGuardsRegistered = true;

  // Handle tab activation: end session on previous tab, start on new tab if tracked
  browser.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
    // Get the previous active tab for this window
    const previousTabId = lastActiveTabByWindow.get(windowId);
    
    // Update tracking for this window immediately
    lastActiveTabByWindow.set(windowId, tabId);
    
    // End session on previous tab if different from new tab
    if (previousTabId !== undefined && previousTabId !== tabId) {
      // Defer slightly to allow onRemoved to fire first if tab is being closed
      // This prevents logging "tab_switch" when the tab is actually being closed
      setTimeout(async () => {
        try {
          // Check if the previous tab still exists
          await browser.tabs.get(previousTabId);
          // Tab still exists - this was a genuine tab switch
          await finalizeSession(previousTabId, "procrastination", "tab_switch");
          await finalizeSession(previousTabId, "learning", "tab_switch");
        } catch {
          // Tab no longer exists - it was closed, onRemoved handles it with "tab_closed"
        }
      }, 50);
    }
    
    // Start new session on newly activated tab if it's on a tracked site
    await maybeStartSessionForTab(tabId);
    // Note: Timer pausing for controlled variant is handled automatically by checkActive() in timer.js
  });

  // Handle tab removal: end session on closed tab
  browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    console.log("[Redirection] Tab removed:", { tabId, isControlled: isControlled() });
    
    if (isControlled()) {
      // Controlled variant: try in-memory handleTabClose first, but ALSO 
      // call finalizeSession as fallback since activeSessions storage persists
      console.log("[Redirection] Calling controlledMode.handleTabClose for tab:", tabId);
      await controlledMode.handleTabClose(tabId);
      // ALSO call finalizeSession to catch sessions stored in activeSessions
      // (claimReward stores procrastination sessions there, and this handles SW restarts)
      await finalizeSession(tabId, "procrastination", "tab_closed");
      await finalizeSession(tabId, "learning", "tab_closed");
    } else {
      // Experimental variant: use standard finalizeSession
      await finalizeSession(tabId, "procrastination", "tab_closed");
      await finalizeSession(tabId, "learning", "tab_closed");
    }
    
    // Clean up window tracking if this was the tracked tab
    if (removeInfo?.windowId !== undefined) {
      const tracked = lastActiveTabByWindow.get(removeInfo.windowId);
      if (tracked === tabId) {
        lastActiveTabByWindow.delete(removeInfo.windowId);
      }
    }
  });

  // Handle URL changes within a tab
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url) {
      await handleTabNavigation(tabId, changeInfo.url);
    }
  });
  
  // Handle window focus changes: end sessions when Chrome loses focus
  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      // Browser lost focus entirely - end all active sessions
      await finalizeAllActiveSessions("window_blur");
    }
    // Note: Timer pausing for controlled variant is handled automatically by checkActive() in timer.js
  });
  
  // For controlled variant, also listen for direct learning site navigation
  addControlledLearningSiteListener();
}

async function logDeclinedIntervention(originUrl, learningUrl) {
  // Log as event only - "stay" decision shouldn't create a Session row
  await logEvent({
    participantId: await storage.uid.get(),
    eventType: "redirection_decision",
    procrastinationSite: originUrl,
    learningSite: learningUrl,
    eventData: "stay",
  });
}

async function applyPreemptiveHide(tabId) {
  if (!tabId || hiddenTabs.has(tabId)) return;
  try {
    await browser.scripting.insertCSS({
      target: { tabId },
      css: PRELOAD_HIDE_CSS,
      origin: "USER",
    });
    hiddenTabs.add(tabId);
  } catch (_) {}
}

async function removePreemptiveHide(tabId) {
  if (!tabId || !hiddenTabs.has(tabId)) return;
  try {
    await browser.scripting.removeCSS({
      target: { tabId },
      css: PRELOAD_HIDE_CSS,
      origin: "USER",
    });
  } catch (_) {}
  hiddenTabs.delete(tabId);
}

async function showImmediatePrompt(tabId) {
  if (!tabId) return;
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (overlayId) => {
        if (document.getElementById(overlayId)) return;
        const root = document.createElement("div");
        root.id = overlayId;
        root.setAttribute(
          "style",
          "position:fixed;inset:0;background:#030712;display:flex;align-items:center;justify-content:center;z-index:2147483645;font-family:'Inter','Segoe UI',sans-serif;color:#f8fafc;"
        );
        root.innerHTML = `
          <div style="text-align:center;display:flex;flex-direction:column;gap:12px;padding:20px;max-width:280px;">
            <div style="font-size:1rem;font-weight:600;">Preparing your focus prompt…</div>
            <div style="font-size:0.85rem;opacity:0.8;">Hang tight while we block this site.</div>
          </div>
        `;
        document.documentElement.appendChild(root);
      },
      args: [PREPROMPT_ID],
    });
  } catch (_) {}
}

async function hideImmediatePrompt(tabId) {
  if (!tabId) return;
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (overlayId) => {
        const overlay = document.getElementById(overlayId);
        if (overlay && overlay.remove) overlay.remove();
      },
      args: [PREPROMPT_ID],
    });
  } catch (_) {}
}

function scheduleRevealOnLoad(tabId) {
  if (!tabId) return;
  pendingRevealTabs.add(tabId);
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete" && pendingRevealTabs.has(tabId)) {
    pendingRevealTabs.delete(tabId);
    await hideImmediatePrompt(tabId);
    await removePreemptiveHide(tabId);
  }
});

browser.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (pendingRevealTabs.has(details.tabId)) {
    pendingRevealTabs.delete(details.tabId);
    await hideImmediatePrompt(details.tabId);
    await removePreemptiveHide(details.tabId);
  }
});

async function createFilter() {
  const procList = await storage.list.get();
  const url = buildProcrastinationUrlFilters(procList || []);
  if (!url.length) return null;
  return { url };
}

async function addNavigationListener() {
  const filter = await createFilter();
  if (!filter) return;
  browser.webNavigation.onBeforeNavigate.addListener(redirect, filter);
}

async function removeNavigationListener() {
  browser.webNavigation.onBeforeNavigate.removeListener(redirect);
}

async function restartNavigationListener() {
  await removeNavigationListener();
  await addNavigationListener();
}

function addTabChangeListener() {
  browser.tabs.onActivated.addListener(checkTabById);
}

function removeTabChangeListener() {
  browser.tabs.onActivated.removeListener(checkTabById);
}

async function windowChangeListener(windowId) {
  // Handle focus lost entirely
  if (windowId === browser.windows.WINDOW_ID_NONE || windowId < 0) {
    await finalizeAllActiveSessions("window_blur");
    return;
  }
  
  // Handle focus gained
  try {
    const tabs = await browser.tabs.query({
      active: true,
      windowId: windowId,
    });
    if (tabs.length > 0) {
      const tab = tabs[0];
      // Start session if on tracked site (returning to window)
      if (tab.id !== undefined) {
        await maybeStartSessionForTab(tab.id);
      }
      checkTab(tab);
    }
  } catch (error) {
    // console.log(error);
  }
}

function addWindowChangeListener() {
  browser.windows.onFocusChanged.addListener(windowChangeListener);
}

function removeWindowChangeListener() {
  browser.windows.onFocusChanged.removeListener(windowChangeListener);
}

async function restartWindowChangeListener() {
  removeWindowChangeListener();
  addWindowChangeListener();
}

async function restartTabChangeListener() {
  removeTabChangeListener();
  addTabChangeListener();
}

function addOriginUpdatedListener() {
  browser.tabs.onUpdated.addListener(originUpdatedListener);
}

function removeOriginUpdatedListener() {
  "Removing originUpdatedListener";
  browser.tabs.onUpdated.removeListener(originUpdatedListener);
}

async function originUpdatedListener(details) {
  const origin = await storage.origin.get();
  if (origin) {
    if (origin.tabId === details) {
      const tab = await browser.tabs.get(details);
      l(tab);
      const currentLearning = await storage.learningUri.get();
      const learningName = parseUrl(currentLearning).name;
      if (tab.url.includes(learningName)) {
        storage.learningUri.set(tab.url);
      }
    }
  }
}

/** #REDIRECT()#
 * @async @function
 * @description Checks if redirection should happen,
 * then starts a learning session countdown,
 * stores the origin tab and url in storage,
 * then updates the tab with a pre-defined learning resourse url
 * @param {object} details
 * @param {string} details.url
 * @param {number} details.tabId */
async function redirect(details) {
  if (await checkActiveTime()) {
    if (details.frameId === 0 && !details.url.includes("auth")) {
      const toggled = await storage.redirection.get();
      if (!toggled) return;
      
      // ============================================
      // CONTROLLED VARIANT: Delegate to controlledMode
      // ============================================
      if (isControlled()) {
        // Check if reward timer is active - allow procrastination
        if (controlledMode.isInReward()) {
          return;
        }
        
        // IMMEDIATELY hide the page to prevent user seeing procrastination content
        await applyPreemptiveHide(details.tabId);
        
        // Get procrastination hosts and learning URL
        const procList = await storage.list.get();
        const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);
        const learningUrl = await storage.learningUri.get();
        
        // Let controlledMode handle the navigation
        const handled = controlledMode.handleNavigation(
          details.tabId, 
          details.url, 
          procHosts, 
          learningUrl
        );
        
        // If handled, stop here
        if (handled) return;
        
        // Otherwise fall through (e.g., non-procrastination site) - remove hide
        await removePreemptiveHide(details.tabId);
        return;
      }
      
      // ============================================
      // EXPERIMENTAL VARIANT: Original logic
      // ============================================
      let shouldRedirect = await storage.shouldRedirect.get();
      if (!shouldRedirect) {
        const unlockAt = await storage.rewardUnlock.get();
        if (unlockAt && unlockAt <= Date.now()) {
          await storage.rewardUnlock.set(0);
          await storage.shouldRedirect.set(true);
          shouldRedirect = true;
        }
      }
      
      const goal = parseTime.toSystem(await storage.timeSettings.learningTime.get());
      const progress = await storage.dailyProgress.get();
      const goalMet = goal > 0 && progress >= goal;
      
      if (toggled && shouldRedirect && !goalMet) {
        l("ShouldRedirect", shouldRedirect);
        const origin = await storage.origin.get();
        l("Checking against this: ", origin);
        if (origin) {
          l(details);
          // Experimental variant: show blocker
          addProcsiteLoadedListener();
        } else {
          const learningUri = await storage.learningUri.get();
          if (!learningUri) return; // skip redirection if no learning URL configured
          const hostName = parseUrl(details.url).name;
          const promptLock = await storage.promptLocks.get(details.tabId);
          const now = Date.now();
          
          if (
            promptLock &&
            promptLock.host === hostName &&
            now - promptLock.timestamp < PROMPT_SUPPRESS_DURATION
          ) {
            l("Skipping prompt due to recent eventData for tab", details.tabId);
            return;
          }
          await storage.promptLocks.set(details.tabId, {
            host: hostName,
            timestamp: now,
          });
          
          // Experimental variant: show consent prompt
          talkToContent(details.tabId, learningUri, details.url);
        }
      }
    }
  }
}

async function checkActiveTime() {
  const fromTime = await storage.operatingHours.from.get();
  const toTime = await storage.operatingHours.to.get();
  const date = makeDate();
  if (date.hours < fromTime.hrs) {
    return false;
  } else if (date.hours === fromTime.hrs && date.minutes < fromTime.min) {
    return false;
  }
  if (date.hours > toTime.hrs) {
    return false;
  } else if (date.hours === toTime.hrs && date.minutes > toTime.min) {
    return false;
  }
  return true;
}

function addOriginTabCloseListener() {
  browser.tabs.onRemoved.addListener(onOriginRemoved);
}

async function onOriginRemoved(details) {
  const origin = await storage.origin.get();
  if (origin) {
    if (details === origin.tabId) {
      const learningUri = await storage.learningUri.get();
      let migrated = false;
      if (learningUri) {
        const learningName = parseUrl(learningUri).name;
        if (learningName) {
          try {
            const tabs = await browser.tabs.query({});
            const replacement = tabs.find(
              (tab) =>
                tab.id !== details &&
                typeof tab.url === "string" &&
                tab.url.includes(learningName)
            );
            if (replacement) {
              storage.origin.set({ url: replacement.url, tabId: replacement.id });
              addOriginUpdatedListener(replacement.id);
              setTimeout(() => triggerLearningOverlay(replacement.id), 150);
              await migrateActiveSession(details, replacement.id);
              migrated = true;
            }
          } catch (error) {
            l(error);
          }
        }
      }

      if (!migrated) {
        l("Origin killed");
        removeOriginUpdatedListener();
        removeAllContentBlockers();
        storage.origin.remove();
        await finalizeSession(details, "learning", "tab_closed");
        timer.stopBonusTime();
        timer.stopLearningSession();
        storage.shouldRedirect.set(true);
      }
    }
  }
}

async function addLearningSiteLoadedListener() {
  const currentLearning = await storage.learningUri.get();
  if (!currentLearning) return;
  const learningName = parseUrl(currentLearning).name;
  if (!learningName) return;
  browser.webNavigation.onCompleted.addListener(messageLearningResource, {
    url: [{ hostContains: `.${learningName}.` }],
  });
}

/**
 * Handle controlled variant learning site navigation.
 * Called when user directly navigates to learning site while in IDLE state.
 */
async function handleControlledLearningSiteNavigation(details) {
  if (details.frameId !== 0) return;
  
  const toggled = await storage.redirection.get();
  if (!toggled) return;
  
  if (!isControlled()) return;
  
  // Get procrastination hosts and learning URL
  const procList = await storage.list.get();
  const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);
  const learningUrl = await storage.learningUri.get();
  
  // Let controlledMode handle the navigation
  controlledMode.handleNavigation(
    details.tabId,
    details.url,
    procHosts,
    learningUrl
  );
}

/**
 * Add listener for learning site navigation (controlled variant only).
 * This enables direct learning session start when user navigates to learning site.
 */
async function addControlledLearningSiteListener() {
  if (!isControlled()) return;
  
  const currentLearning = await storage.learningUri.get();
  if (!currentLearning) return;
  const learningName = parseUrl(currentLearning).name;
  if (!learningName) return;
  
  browser.webNavigation.onCompleted.addListener(handleControlledLearningSiteNavigation, {
    url: [{ hostContains: learningName }],
  });
  console.log("[Redirection] Added controlled learning site listener for:", learningName);
}

// Fallback trigger in case webNavigation timing misses injection readiness
async function triggerLearningOverlay(tabId) {
  try {
    await messageLearningResource({ tabId });
  } catch (_) {}
}

function removeLearningSiteLoadedListener() {
  l("Removing Leaning site loaded listener");
  browser.webNavigation.onCompleted.removeListener(messageLearningResource);
  shouldShowWelcome = true;
}

async function getActiveLearningTabs(excludedIds = new Set()) {
  const learningUri = await storage.learningUri.get();
  if (!learningUri) return [];
  const learningName = parseUrl(learningUri).name;
  if (!learningName) return [];
  try {
    const tabs = await browser.tabs.query({});
    return tabs.filter(
      (tab) =>
        tab &&
        typeof tab.id === "number" &&
        typeof tab.url === "string" &&
        tab.url.includes(learningName) &&
        !excludedIds.has(tab.id)
    );
  } catch (_) {
    return [];
  }
}

async function setPromptCooldown(tabId, url) {
  if (!tabId || !url) return;
  try {
    const hostName = parseUrl(url).name;
    if (!hostName) return;
    await storage.promptLocks.set(tabId, {
      host: hostName,
      timestamp: Date.now(),
    });
  } catch (_) {}
}

async function messageLearningResource(details) {
  try {
    const response = await browser.tabs
      .sendMessage(details.tabId, {
        action: "display: encouragement",
        countdown: timer.getTime().learningTimeRemaining,
        shouldShowWelcome: shouldShowWelcome,
      })
      .catch(() => null);

    if (!response || typeof response !== "object") {
      setTimeout(() => triggerLearningOverlay(details.tabId), 250);
      return;
    }

    await hideImmediatePrompt(details.tabId);
    await removePreemptiveHide(details.tabId);
    shouldShowWelcome = false;
    const { action, source } = response;
    if (action === "continue") {
      gotoOrigin("continue", {
        type: source,
        tabId: details.tabId,
        restoreAll: false,
      });
      removeLearningSiteLoadedListener();
    } else if (action === "end injection") {
      removeLearningSiteLoadedListener();
    }
  } catch (error) {
    // console.log(error);
  }
}

/** #CHECKCURRENTTAB()#
@function
@async
@description Gets currently active tab and sends message to the content script if it
is a procrastination website. */
async function checkActiveTab() {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs.length > 0) {
      const tab = tabs[0];
      const tabSiteName = parseUrl(tab.url).name;
      const procList = await storage.list.get();
      const procListNames = procList.map((site) => site.name);
      if (procListNames.includes(tabSiteName)) {
        const learningUri = await storage.learningUri.get();
        if (!learningUri) return; // no learning site set; do nothing
        
        // CONTROLLED VARIANT: Use controlledMode to immediately redirect
        if (isControlled()) {
          // Check if reward timer is active - allow procrastination
          if (controlledMode.isInReward()) {
            return;
          }
          const procHosts = procList.map(item => item?.host || item?.name || "").filter(Boolean);
          const handled = controlledMode.handleNavigation(tab.id, tab.url, procHosts, learningUri);
          if (handled) return;
        }
        
        // EXPERIMENTAL VARIANT: Show redirect prompt
        addRedirectionLog(
          `Interception: initiating countdown`,
          tabSiteName,
          parseUrl(learningUri).name,
          {
            eventType: "redirection_prompt",
            action: "prompt_shown",
            procrastinationUrl: tab.url,
            learningUrl: learningUri,
          }
        );
        talkToContent(tab.id, learningUri, tab.url);
      }
    }
  } catch (error) {
    // console.log(error.message);
  }
}

async function checkTabById({ tabId }) {
  try {
    const tab = await browser.tabs.get(tabId);
    checkTab(tab);
  } catch (error) {
    // console.log(error.message);
  }
}
// TODO: Rewrite these two functions ^ & v to 1 single function that checks if tab has url (if not, get it)

/** #CHECKTAB()#
 * @async
 * @function
 * @description Checks a tab against a list of websites defined as procrastination websites.
 * If a tab's url is found in the list, it calls the redirect function using that tab's details.
 * @param {object} tab
 * @param {number} tab.frameId
 * @param {string} tab.url
 * @param {number} tab.id */
async function checkTab(tab) {
  const tabSiteName = parseUrl(tab.url).name;
  const procList = await storage.list.get();
  const procListNames = procList.map((site) => site.name);
  if (procListNames.includes(tabSiteName)) {
    const origin = await storage.origin.get();
    if (origin) {
      renderContentBlocker({ tabId: tab.id, frameId: 0, url: tab.url });
    } else {
      redirect({ frameId: 0, url: tab.url, tabId: tab.id });
    }
  }
}

/** #GOTOORIGIN()#
 * @async
 * @function
 * @description Changes location of the tab registered as the tab
 * that triggered a redirection from procrastination to learning site.
 * The uri was saved upon redirection, and here restored in full in the same tab.
 * Origin is an object of type: {integer: tabId, string: url} */
async function gotoOrigin(event, sourceContext = {}) {
  const normalizedEvent = event === "injected" ? "continue" : event;
  
  // Handle controlled variant continue bypass via controlledMode
  if (isControlled() && normalizedEvent === "continue") {
    const origin = await storage.origin.get();
    const targetTabId = sourceContext?.tabId || origin?.tabId;
    
    if (targetTabId) {
      await controlledMode.handleContinue(targetTabId);
    } else {
      // Fallback: just cleanup
      controlledMode.cleanup();
    }
    
    // Clear origin after continue
    await storage.origin.remove();
    
    l("[Controlled] Continue handled by controlledMode");
    return; // Don't execute experimental continue logic
  }
  
  const statsHandler = storage.stats[normalizedEvent];
  if (typeof statsHandler === "function") {
    await statsHandler();
  }

  const context =
    sourceContext && typeof sourceContext === "object"
      ? sourceContext
      : { type: sourceContext };
  const { type: sourceType, tabId: providedTabId, restoreAll } = context;

  const origin = await storage.origin.get();
  const blockedTabs = await storage.blockedTabs.get();
  const blockedTabIds = Array.isArray(blockedTabs) ? blockedTabs : [];
  const shouldRestoreAllTabs =
    typeof restoreAll === "boolean" ? restoreAll : normalizedEvent === "skip";
  const restoredTabIds = new Set();

  let targetTabId = providedTabId;
  if (targetTabId === undefined && origin && origin.tabId !== undefined) {
    targetTabId = origin.tabId;
  }
  if (targetTabId === undefined) {
    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      targetTabId = activeTab?.id;
    } catch (_) {}
  }

  console.log("[Aiki Debug] gotoOrigin called:", {
    event,
    normalizedEvent,
    targetTabId,
    originTabId: origin?.tabId,
    originUrl: origin?.url,
  });

  const sessionTabId = targetTabId !== undefined ? targetTabId : origin?.tabId;
  if (sessionTabId !== undefined) {
    // Skip for controlled variant - handleContinue already logs the learning session
    if (isControlled()) {
      console.log("[Aiki Debug] Controlled variant - skipping finalizeSession (handled by controlledMode)");
    } else {
      console.log("[Aiki Debug] Finalizing learning session for tab:", sessionTabId);
      await finalizeSession(sessionTabId, "learning", normalizedEvent);
    }
  } else {
    console.log("[Aiki Debug] No session to finalize - sessionTabId is undefined");
  }

  removeOriginUpdatedListener();

  if (origin && origin.tabId !== undefined) {
    try {
      const learningTab = await browser.tabs.get(origin.tabId);
      const configuredLearning = await storage.learningUri.get();
      if (configuredLearning) {
        const configuredName = parseUrl(configuredLearning).name;
        const currentName = parseUrl(learningTab.url).name;
        if (configuredName && currentName && configuredName === currentName) {
          storage.learningUri.set(learningTab.url);
        }
      }
    } catch (error) {
      l(error);
    }
  }

  storage.origin.remove();

  let destinationUrl = null;

  if (origin && origin.tabId !== undefined && origin.tabId === targetTabId) {
    try {
      await browser.tabs.update(origin.tabId, { url: origin.url });
      destinationUrl = origin.url;
      await setPromptCooldown(origin.tabId, origin.url);
      restoredTabIds.add(origin.tabId);
    } catch (error) {
      l(error);
    }
  } else if (targetTabId !== undefined) {
    const blockedOrigin = await storage.blockedOrigins.get(targetTabId);
    if (blockedOrigin) {
      await removeContentBlocker(targetTabId);
      try {
        await browser.tabs.update(targetTabId, { url: blockedOrigin });
        destinationUrl = blockedOrigin;
        await setPromptCooldown(targetTabId, blockedOrigin);
        restoredTabIds.add(targetTabId);
      } catch (error) {
        l(error);
      }
    }
  }

  if (!destinationUrl && origin && origin.tabId !== undefined) {
    try {
      await browser.tabs.update(origin.tabId, { url: origin.url });
      destinationUrl = origin.url;
      await setPromptCooldown(origin.tabId, origin.url);
      restoredTabIds.add(origin.tabId);
    } catch (error) {
      l(error);
    }
  }

  if (shouldRestoreAllTabs && blockedTabIds.length > 0) {
    await Promise.allSettled(
      blockedTabIds
        .filter((tabId) => !restoredTabIds.has(tabId))
        .map(async (tabId) => {
          const url = await storage.blockedOrigins.get(tabId);
          await removeContentBlocker(tabId);
          if (url) {
            try {
              await browser.tabs.update(tabId, { url });
              await setPromptCooldown(tabId, url);
            } catch (error) {}
          }
          restoredTabIds.add(tabId);
        })
    );
  }

  const remainingLearningTabs = await getActiveLearningTabs(restoredTabIds);
  const hasRemainingLearningTabs = remainingLearningTabs.length > 0;

  // Start a procrastination session for the destination tab
  console.log("[Aiki Debug] gotoOrigin procrastination session check:", { destinationUrl, targetTabId });
  if (destinationUrl && targetTabId !== undefined) {
    console.log("[Aiki Debug] Starting procrastination session:", { targetTabId, destinationUrl });
    await startSession(targetTabId, "procrastination", destinationUrl);
  } else {
    console.log("[Aiki Debug] NOT starting procrastination session - missing destinationUrl or targetTabId");
  }

  if (destinationUrl) {
    try {
      const currentLearning = await storage.learningUri.get();
      addRedirectionLog(
        `Go to origin: ${normalizedEvent}, source: ${sourceType || "unknown"}`,
        parseUrl(currentLearning).name,
        parseUrl(destinationUrl).name,
        {
          action: normalizedEvent,
          source: sourceType,
          procrastinationUrl: destinationUrl,
        }
      );
    } catch (error) {
      l(error);
    }
  }

  const redirectionToggled = await storage.redirection.get();
  if (redirectionToggled && !hasRemainingLearningTabs) {
    const rewardSetting = await storage.timeSettings.rewardTime.get();
    let rewardTime = parseTime.toSystem(rewardSetting);

    if (rewardTime <= 0) {
      // Provide a short grace period so the skip/continue action actually unlocks the site.
      rewardTime = 60 * 1000;
    }

    await storage.shouldRedirect.set(false);
    await timer.startProcrastinationSession(checkActiveTab, rewardTime);
  } else if (hasRemainingLearningTabs) {
    await storage.shouldRedirect.set(true);
  }
}

async function talkToContent(tabId, url, originUrl, attempt = 0) {
  try {
    await applyPreemptiveHide(tabId);
    await showImmediatePrompt(tabId);
    const result = await browser.tabs.sendMessage(tabId, {
      action: "display: redirectPrompt",
      url: url,
      originUrl: originUrl,
    });

    if (!result) {
      throw new Error("No response from content script");
    }

    if (result && result.action === "continue") {
      try {
        await storage.stats.skip();
      } catch (_) {}
      registerProcrastinationGuards();
      await startSession(tabId, "procrastination", originUrl);
      // Log single event for stay decision
      await logDeclinedIntervention(originUrl, url);
      await hideImmediatePrompt(tabId);
      await removePreemptiveHide(tabId);
    } else if (result && result.action === "redirect") {
      addLearningSiteLoadedListener();
      registerProcrastinationGuards();
      await startSession(tabId, "learning", url, originUrl);
      // Log single event for accept decision
      await logEvent({
        participantId: await storage.uid.get(),
        eventType: "redirection_decision",
        procrastinationSite: originUrl,
        learningSite: url,
        eventData: "accept",
      });
      await timer.startLearningSession();
      storage.origin.set({ url: originUrl, tabId: tabId });
      addOriginUpdatedListener(tabId);
      await storage.promptLocks.remove(tabId);
      try {
        scheduleRevealOnLoad(tabId);
        await browser.tabs.update(tabId, {
          url: url,
        });
        setTimeout(() => triggerLearningOverlay(tabId), 1500);
      } catch (error) {
        l(error);
      }
    }
  } catch (error) {
    if (attempt < 20) {
      setTimeout(() => {
        talkToContent(tabId, url, originUrl, attempt + 1);
      }, 100);
    } else {
      await hideImmediatePrompt(tabId);
      await removePreemptiveHide(tabId);
    }
  }
}

async function addRedirectionLog(event, from, to, details = {}) {
  const participantId = await storage.uid.get();
  if (!participantId) return;
  const timeSettings = await storage.timeSettings.getAll();
  const { eventType = "redirection", ...rest } = details || {};
  const metadata = {
    event,
    eventData: rest.eventData,
    continueTap: rest.continueTap,
    timeSettings,
  };

  logEvent({
    eventType: eventType,
    eventData: rest.eventData,
    procrastinationSite: rest.procrastinationUrl || from,
    learningSite: rest.learningUrl || to,
    promptResponse: JSON.stringify(metadata),
    participantId,
  });
}

async function renderContentBlocker(details) {
  if (details.frameId === 0) {
    removeProcsiteLoadedListener();
    storage.blockedTabs.add(details.tabId);
    if (details.url) {
      storage.blockedOrigins.add(details.tabId, details.url);
    }
    storage.promptLocks.remove(details.tabId);
    try {
      await applyPreemptiveHide(details.tabId);
      await showImmediatePrompt(details.tabId);
      l("Sending block request to content");
      await browser.tabs.sendMessage(details.tabId, {
        action: "inject blocker",
      });
      setTimeout(() => {
        hideImmediatePrompt(details.tabId).catch(() => {});
        removePreemptiveHide(details.tabId).catch(() => {});
      }, 150);
    } catch (error) {
      // l(error);
    }
  }
}

async function removeContentBlocker(tabId) {
  l("Removing blocker on tab ", tabId);
  try {
    await hideImmediatePrompt(tabId);
    await removePreemptiveHide(tabId);
    await storage.blockedOrigins.remove(tabId);
    await storage.blockedTabs.remove(tabId);
    await storage.promptLocks.remove(tabId);
    return browser.tabs.sendMessage(tabId, { action: "remove blocker" }).catch(() => {});
  } catch (error) {
    l(error);
  }
}

async function removeAllContentBlockers() {
  const blockedTabs = await storage.blockedTabs.get();
  l("Blocked tabs: ", blockedTabs);
  await Promise.allSettled(blockedTabs.map((tabId) => removeContentBlocker(tabId)));
  storage.blockedTabs.clear();
  storage.blockedOrigins.clear();
  storage.promptLocks.clear();
}

async function addProcsiteLoadedListener() {
  l("Adding listener");
  const filter = await createFilter();
  l(filter);
  if (!filter) return;
  browser.webNavigation.onCompleted.addListener(renderContentBlocker, filter);
}

async function removeProcsiteLoadedListener() {
  l("Removing listener");
  browser.webNavigation.onCompleted.removeListener(renderContentBlocker);
}

export default {
  navigationListener: {
    start: addNavigationListener,
    stop: removeNavigationListener,
    restart: restartNavigationListener,
  },
  tabChangeListener: {
    start: addTabChangeListener,
    stop: removeTabChangeListener,
    restart: restartTabChangeListener,
  },
  windowChangeListener: {
    start: addWindowChangeListener,
    stop: removeWindowChangeListener,
    restart: restartWindowChangeListener,
  },
  gotoOrigin,
  addOriginTabCloseListener,
  removeLearningSiteLoadedListener,
  checkActiveTab,
  registerProcrastinationGuards,
  finalizeAllActiveSessions,
};
