import storage from "./util/storage";
import { logEvent } from "./util/logger";
import browser from "webextension-polyfill";
import timer from "./services/TimerManager";
import { parseUrl, makeDate, parseTime } from "./util/utilities";
import { isControlled } from "./util/variantConfig";
import interventionEngine from "./interventionEngine";
import SessionService from "./services/SessionService";
import NavigationGuards from "./services/NavigationGuards";
import PromptCoordinator from "./services/PromptCoordinator";
import siteDetector from "./services/siteDetector";

const l = console.log;

// NavigationGuards now uses interventionEngine directly (no strategy needed)
const navigationGuards = new NavigationGuards();
const promptCoordinator = new PromptCoordinator({
  applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
  removePreemptiveHide: (tabId) => navigationGuards.removePreemptiveHide(tabId),
  showImmediatePrompt,
  hideImmediatePrompt: (tabId) => navigationGuards.hideImmediatePrompt(tabId),
});

let shouldShowWelcome = true;
const PROMPT_SUPPRESS_DURATION = 2 * 60 * 1000; // 2 minutes
const CONTINUE_TRANSITION_SUPPRESS_MS = 2000;
const PREPROMPT_ID = "__aiki-preprompt";

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

function extractProcrastinationHosts(list = []) {
  return (list || [])
    .map((item) => item?.host || item?.name || "")
    .filter(Boolean);
}

async function getRewardDurationMs(defaultMs = 60 * 1000) {
  const rewardMinutes = await storage.controlledTimerSettings.rewardMinutes.get();
  const rewardSeconds = await storage.controlledTimerSettings.rewardSeconds.get();
  const rewardMs = (rewardMinutes * 60 + rewardSeconds) * 1000;
  return rewardMs > 0 ? rewardMs : defaultMs;
}

async function isDailyGoalCompleted() {
  const goal = parseTime.toSystem(await storage.timeSettings.dailyGoal.get());
  if (goal <= 0) return false;
  const progress = await storage.dailyProgress.get();
  return progress >= goal;
}

async function canInterceptNow() {
  const goalCompleted = await isDailyGoalCompleted();
  if (goalCompleted) {
    const [shouldRedirect, unlockAt] = await Promise.all([
      storage.shouldRedirect.get(),
      storage.rewardUnlock.get(),
    ]);
    const updates = [];
    if (shouldRedirect !== false) {
      updates.push(storage.shouldRedirect.set(false));
    }
    if (typeof unlockAt === "number" && unlockAt > 0) {
      updates.push(storage.rewardUnlock.set(0));
    }
    if (updates.length > 0) {
      await Promise.allSettled(updates);
    }
    return false;
  }

  let shouldRedirect = await storage.shouldRedirect.get();
  if (!shouldRedirect) {
    const unlockAtRaw = await storage.rewardUnlock.get();
    const unlockAt = typeof unlockAtRaw === "number" ? unlockAtRaw : 0;
    const hasActiveRewardWindow = unlockAt > Date.now();

    // Self-heal stale gating state:
    // if reward window is not active, interception should be enabled.
    if (!hasActiveRewardWindow) {
      if (unlockAt > 0) {
        await storage.rewardUnlock.set(0);
      }
      await storage.shouldRedirect.set(true);
      shouldRedirect = true;
    }
  }

  return Boolean(shouldRedirect);
}

async function clearStaleOriginState() {
  await storage.origin.remove();
  removeOriginUpdatedListener();
  await removeAllContentBlockers();
  timer.stopBonusTime();
  timer.stopLearningSession();
}

async function validateOriginSession(learningUri = "") {
  const origin = await storage.origin.get();
  if (!origin || origin.tabId === undefined) {
    return { origin: null, isValid: false };
  }

  const configuredLearning = learningUri || (await storage.learningUri.get());
  if (!configuredLearning) {
    await clearStaleOriginState();
    return { origin: null, isValid: false };
  }

  try {
    const originTab = await browser.tabs.get(origin.tabId);
    const isValid =
      Boolean(originTab?.url) &&
      siteDetector.isLearningSite(originTab.url, configuredLearning);
    if (!isValid) {
      await clearStaleOriginState();
      return { origin: null, isValid: false };
    }
    return { origin, isValid: true };
  } catch (_) {
    await clearStaleOriginState();
    return { origin: null, isValid: false };
  }
}

async function shouldSkipPrompt(tabId, url) {
  const hostName = parseUrl(url).name;
  if (!hostName) return false;

  const promptLock = await storage.promptLocks.get(tabId);
  if (!promptLock || promptLock.host !== hostName) return false;

  const now = Date.now();
  const lockTimestamp = Number(promptLock.timestamp);
  const lockAgeMs = Number.isFinite(lockTimestamp) ? now - lockTimestamp : Number.POSITIVE_INFINITY;

  // Short transition suppress window: prevent immediate re-prompt while reward is being armed.
  if (lockAgeMs >= 0 && lockAgeMs < CONTINUE_TRANSITION_SUPPRESS_MS) {
    return true;
  }

  const [shouldRedirect, unlockAt] = await Promise.all([
    storage.shouldRedirect.get(),
    storage.rewardUnlock.get(),
  ]);
  const rewardWindowActive =
    shouldRedirect === false &&
    typeof unlockAt === "number" &&
    unlockAt > now;

  // Prompt suppression should only apply while reward is actively running.
  // Once reward expires, interception should show promptly on first return.
  if (!rewardWindowActive) return false;
  return lockAgeMs >= 0 && lockAgeMs < PROMPT_SUPPRESS_DURATION;
}

async function handleUnifiedNavigation(tabId, url, procrastinationHosts, learningUrl) {
  if (!tabId || !url || !learningUrl) return false;
  if (!isControlled()) return false;

  try {
    return Boolean(
      await interventionEngine.handleNavigation(
        tabId,
        url,
        procrastinationHosts || [],
        learningUrl
      )
    );
  } catch (_) {
    return false;
  }
}

async function hideImmediatePrompt(tabId) {
  return navigationGuards.hideImmediatePrompt(tabId);
}

const finalizeAllActiveSessions = (reason = "window_blur") =>
  navigationGuards.finalizeAllActiveSessions(reason);

async function logDeclinedIntervention(originUrl, learningUrl) {
  // Log as event only - "stay" decision shouldn't create a Session row
  await logEvent({
    participantId: await storage.uid.get(),
    eventType: "experimental_redirection",
    procrastinationSite: originUrl,
    learningSite: learningUrl,
    eventData: "stay",
  });
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
  } catch (_) { }
}

function scheduleRevealOnLoad(tabId) {
  navigationGuards.scheduleRevealOnLoad(tabId);
}

async function removePreemptiveHide(tabId) {
  return navigationGuards.removePreemptiveHide(tabId);
}


async function triggerLearningOverlay(tabId) {
  if (!tabId) return;
  try {
    await browser.tabs.sendMessage(tabId, {
      action: "display: encouragement",
      countdown: timer.getTime().learningTimeRemaining,
      shouldShowWelcome: shouldShowWelcome,
    });
    shouldShowWelcome = false;
  } catch (_) {
  }
}

async function createFilter() {
  const procList = await storage.list.get();
  const url = buildProcrastinationUrlFilters(procList || []);
  if (!url.length) return null;
  return { url };
}

async function addNavigationListener() {
  navigationGuards.install();
  await navigationGuards.startNavigationListener(createFilter, redirect);
}

async function removeNavigationListener() {
  await navigationGuards.stopNavigationListener();
}

async function restartNavigationListener() {
  await navigationGuards.restartNavigationListener();
}

function addTabChangeListener() {
  navigationGuards.install();
  browser.tabs.onActivated.addListener(checkTabById);
}

function removeTabChangeListener() {
  browser.tabs.onActivated.removeListener(checkTabById);
}

function addWindowChangeListener() {
  navigationGuards.install();
}

function removeWindowChangeListener() { }

async function restartWindowChangeListener() {
  navigationGuards.install();
}

async function restartTabChangeListener() {
  navigationGuards.install();
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
      if (
        typeof tab?.url === "string" &&
        currentLearning &&
        siteDetector.isLearningSite(tab.url, currentLearning)
      ) {
        await storage.learningUri.set(tab.url);
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
  if (!(await checkActiveTime())) return;
  if (details.frameId !== 0 || details.url.includes("auth")) return;

  const toggled = await storage.redirection.get();
  if (!toggled) return;

  const procList = await storage.list.get();
  const procHosts = extractProcrastinationHosts(procList);
  // Always revalidate against latest storage list to avoid stale listener filters.
  if (!siteDetector.isProcrastinationSite(details.url, procHosts)) return;
  const learningUrl = await storage.learningUri.get();

  const handled = await handleUnifiedNavigation(
    details.tabId,
    details.url,
    procHosts,
    learningUrl
  );
  if (handled) return;
  if (isControlled()) return;

  if (!(await canInterceptNow())) {
    return;
  }

  const { isValid: isOriginValid } = await validateOriginSession(learningUrl);
  if (isOriginValid) {
    if (!isControlled()) {
      await addProcsiteLoadedListener();
    }
    return;
  }

  if (!learningUrl) return;
  if (await shouldSkipPrompt(details.tabId, details.url)) {
    l("Skipping prompt due to recent eventData for tab", details.tabId);
    return;
  }

  await promptRedirect(details.tabId, learningUrl, details.url);
}

async function checkActiveTime() {
  const fromTime = await storage.operatingHours.from.get();
  const toTime = await storage.operatingHours.to.get();
  const date = makeDate();
  const currentMinutes = date.hours * 60 + date.minutes;
  const startMinutes = (Number(fromTime?.hrs) || 0) * 60 + (Number(fromTime?.min) || 0);
  const endMinutes = (Number(toTime?.hrs) || 0) * 60 + (Number(toTime?.min) || 0);

  // Equal start/end means interception should stay active all day.
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Window crosses midnight (e.g., 22:00 -> 06:00).
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function addOriginTabCloseListener() {
  browser.tabs.onRemoved.addListener(onOriginRemoved);
}

function removeOriginTabCloseListener() {
  browser.tabs.onRemoved.removeListener(onOriginRemoved);
}

async function onOriginRemoved(details) {
  const origin = await storage.origin.get();
  if (origin) {
    if (details === origin.tabId) {
      const learningUri = await storage.learningUri.get();
      let migrated = false;
      if (learningUri) {
        try {
          const tabs = await browser.tabs.query({});
          const replacement = tabs.find(
            (tab) =>
              tab.id !== details &&
              typeof tab.url === "string" &&
              siteDetector.isLearningSite(tab.url, learningUri)
          );
          if (replacement) {
            storage.origin.set({ url: replacement.url, tabId: replacement.id });
            addOriginUpdatedListener(replacement.id);
            setTimeout(() => triggerLearningOverlay(replacement.id), 150);
            await SessionService.transferActiveSession(details, replacement.id);
            migrated = true;
          }
        } catch (error) {
          l(error);
        }
      }

      if (!migrated) {
        l("Origin killed");
        removeOriginUpdatedListener();
        await removeAllContentBlockers();
        storage.origin.remove();
        await SessionService.finalizeSession(details, "learning", "tab_closed");
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
  let learningHost = "";
  try {
    learningHost = new URL(currentLearning).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_) {
    learningHost = (parseUrl(currentLearning).host || "").replace(/^www\./, "").toLowerCase();
  }
  if (!learningHost) return;
  browser.webNavigation.onCompleted.addListener(messageLearningResource, {
    url: [{ hostSuffix: learningHost }],
  });
}

/**
 * Add listener for learning site navigation (controlled variant only).
 * This enables direct learning session start when user navigates to learning site.
 */

function removeLearningSiteLoadedListener() {
  l("Removing Leaning site loaded listener");
  browser.webNavigation.onCompleted.removeListener(messageLearningResource);
  shouldShowWelcome = true;
}

async function getActiveLearningTabs(excludedIds = new Set()) {
  const learningUri = await storage.learningUri.get();
  if (!learningUri) return [];
  try {
    const tabs = await browser.tabs.query({});
    return tabs.filter(
      (tab) =>
        tab &&
        typeof tab.id === "number" &&
        typeof tab.url === "string" &&
        siteDetector.isLearningSite(tab.url, learningUri) &&
        !excludedIds.has(tab.id)
    );
  } catch (_) {
    return [];
  }
}

async function shouldPreserveLearningStateOnStay(currentTabId) {
  const state = interventionEngine.getState();
  if (!state || state.state !== "learning") return false;
  if (
    typeof state.tabId === "number" &&
    typeof currentTabId === "number" &&
    state.tabId !== currentTabId
  ) {
    return true;
  }
  const excludedIds = new Set();
  if (typeof currentTabId === "number") {
    excludedIds.add(currentTabId);
  }
  const remainingLearningTabs = await getActiveLearningTabs(excludedIds);
  return remainingLearningTabs.length > 0;
}

async function showRewardOverlayWithRetry(tabId, attempt = 0) {
  if (tabId === undefined || tabId === null) return;
  try {
    await browser.tabs.sendMessage(tabId, { action: "display: rewardOverlay" });
    return;
  } catch (_) { }

  if (attempt >= 6) return;
  setTimeout(() => {
    showRewardOverlayWithRetry(tabId, attempt + 1).catch(() => { });
  }, 150);
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
  } catch (_) { }
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
async function checkActiveTab(options = {}) {
  const { ignorePromptCooldown = false } = options || {};
  try {
    const redirectionToggled = await storage.redirection.get();
    if (!redirectionToggled) return;

    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) return;
    await handleInterceptionForTab(tab, {
      addPromptLog: true,
      ignorePromptCooldown,
    });
  } catch (_) { }
}

async function checkTabById({ tabId }) {
  try {
    const tab = await browser.tabs.get(tabId);
    await checkTab(tab);
  } catch (_) { }
}

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
  await handleInterceptionForTab(tab);
}

async function handleInterceptionForTab(tab, options = {}) {
  const { addPromptLog = false, ignorePromptCooldown = false } = options;
  if (!tab || typeof tab.url !== "string" || tab.id === undefined) return;
  if (!(await storage.redirection.get())) return;

  const procList = await storage.list.get();
  const procHosts = extractProcrastinationHosts(procList);
  if (!siteDetector.isProcrastinationSite(tab.url, procHosts)) return;
  const siteName = parseUrl(tab.url).name;

  const learningUri = await storage.learningUri.get();
  if (!learningUri) return;

  const handled = await handleUnifiedNavigation(tab.id, tab.url, procHosts, learningUri);
  if (handled) return;
  if (isControlled()) return;

  if (!(await canInterceptNow())) return;

  const { isValid: isOriginValid } = await validateOriginSession(learningUri);
  if (isOriginValid) {
    await renderContentBlocker({ tabId: tab.id, frameId: 0, url: tab.url });
    return;
  }

  if (!ignorePromptCooldown && (await shouldSkipPrompt(tab.id, tab.url))) return;

  if (addPromptLog) {
    await addRedirectionLog(
      "Interception: initiating countdown",
      siteName,
      parseUrl(learningUri).name,
      {
        eventType: "redirection_prompt",
        action: "prompt_shown",
        procrastinationUrl: tab.url,
        learningUrl: learningUri,
      }
    );
  }

  await promptRedirect(tab.id, learningUri, tab.url);
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

  const context =
    sourceContext && typeof sourceContext === "object"
      ? sourceContext
      : { type: sourceContext };
  const { type: sourceType, tabId: providedTabId, restoreAll } = context;

  // Handle controlled variant continue bypass via controlledMode
  if (isControlled() && normalizedEvent === "continue") {
    const origin = await storage.origin.get();
    const engineState = interventionEngine.getState();
    const targetTabId =
      providedTabId !== undefined
        ? providedTabId
        : engineState?.tabId !== undefined
          ? engineState.tabId
          : origin?.tabId;

    // If continue is triggered from a different tab while another tab is
    // actively in LEARNING, preserve that learning session and let the common
    // tab restore flow handle only the active tab.
    const preserveLearningSession =
      engineState?.state === "learning" &&
      typeof engineState.tabId === "number" &&
      typeof targetTabId === "number" &&
      targetTabId !== engineState.tabId;

    if (preserveLearningSession) {
      console.log("[Controlled] Continue on non-learning tab: preserving active learning session", {
        targetTabId,
        learningTabId: engineState.tabId,
      });
    } else {
      if (targetTabId !== undefined && targetTabId !== null) {
        await interventionEngine.handleContinue(targetTabId);
      } else {
        // Fallback: finalize tracked learning sessions before cleanup.
        await SessionService.finalizeAllSessions("procrastination", "session_aborted", {
          completed: false,
        });
        await SessionService.finalizeAllSessions("learning", "session_aborted", {
          completed: false,
        });
        interventionEngine.cleanup();
      }

      // Clear origin after continue when we intentionally transition out of learning.
      await storage.origin.remove();

      l("[Controlled] Continue handled by interventionEngine");
      return; // Don't execute shared flow
    }
  }

  const statsHandler = storage.stats[normalizedEvent];
  if (typeof statsHandler === "function") {
    await statsHandler();
  }

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
    } catch (_) { }
  }
  const targetSession =
    targetTabId !== undefined ? await storage.activeSessions.get(targetTabId) : null;
  const targetSessionOriginUrl =
    targetSession &&
      targetSession.sessionType === "learning" &&
      typeof targetSession.procrastinationUrl === "string" &&
      targetSession.procrastinationUrl
      ? targetSession.procrastinationUrl
      : null;

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
      await SessionService.finalizeSession(sessionTabId, "learning", normalizedEvent);
    }
  } else {
    console.log("[Aiki Debug] No session to finalize - sessionTabId is undefined");
  }

  // Experimental continue should always end the current learning cycle.
  // Reset intervention engine state so the next accepted redirect starts a fresh session.
  if (!isControlled() && normalizedEvent === "continue") {
    interventionEngine.cleanup();
  }

  removeOriginUpdatedListener();
  removeProcsiteLoadedListener();

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

  const shouldClearOrigin =
    !origin ||
    origin.tabId === undefined ||
    targetTabId === undefined ||
    origin.tabId === targetTabId ||
    shouldRestoreAllTabs;
  if (shouldClearOrigin) {
    storage.origin.remove();
  }

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
      try {
        await browser.tabs.update(targetTabId, { url: blockedOrigin });
        destinationUrl = blockedOrigin;
        await setPromptCooldown(targetTabId, blockedOrigin);
        restoredTabIds.add(targetTabId);
        await removeContentBlocker(targetTabId);
      } catch (error) {
        l(error);
      }
    } else if (targetSessionOriginUrl) {
      try {
        await browser.tabs.update(targetTabId, { url: targetSessionOriginUrl });
        destinationUrl = targetSessionOriginUrl;
        await setPromptCooldown(targetTabId, targetSessionOriginUrl);
        restoredTabIds.add(targetTabId);
      } catch (error) {
        l(error);
      }
    } else if (origin && origin.url) {
      if (origin.tabId === undefined || origin.tabId === targetTabId) {
        try {
          await browser.tabs.update(targetTabId, { url: origin.url });
          destinationUrl = origin.url;
          await setPromptCooldown(targetTabId, origin.url);
          restoredTabIds.add(targetTabId);
        } catch (error) {
          l(error);
        }
      }
    }
  }

  if (!destinationUrl && targetTabId !== undefined && targetSessionOriginUrl) {
    try {
      await browser.tabs.update(targetTabId, { url: targetSessionOriginUrl });
      destinationUrl = targetSessionOriginUrl;
      await setPromptCooldown(targetTabId, targetSessionOriginUrl);
      restoredTabIds.add(targetTabId);
    } catch (error) {
      l(error);
    }
  }

  if (
    !destinationUrl &&
    origin &&
    origin.tabId !== undefined &&
    (targetTabId === undefined || origin.tabId === targetTabId)
  ) {
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
            } catch (error) { }
          }
          restoredTabIds.add(tabId);
        })
    );
  } else if (
    targetTabId !== undefined &&
    blockedTabIds.includes(targetTabId) &&
    !restoredTabIds.has(targetTabId)
  ) {
    await removeContentBlocker(targetTabId);
  }

  const remainingLearningTabs = await getActiveLearningTabs(restoredTabIds);
  const hasRemainingLearningTabs = remainingLearningTabs.length > 0;

  // Start a procrastination session for the destination tab
  console.log("[Aiki Debug] gotoOrigin procrastination session check:", { destinationUrl, targetTabId });
  if (destinationUrl && targetTabId !== undefined) {
    console.log("[Aiki Debug] Starting procrastination session:", { targetTabId, destinationUrl });
    await SessionService.startSession(targetTabId, "procrastination", destinationUrl);
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
  const goalCompleted = await isDailyGoalCompleted();
  if (redirectionToggled && !hasRemainingLearningTabs && !goalCompleted) {
    const rewardTime = await getRewardDurationMs();
    await timer.startProcrastinationSession(
      () => checkActiveTab({ ignorePromptCooldown: true }),
      rewardTime,
      { tabId: targetTabId }
    );
  } else if (goalCompleted) {
    await storage.shouldRedirect.set(false);
  } else if (hasRemainingLearningTabs) {
    await storage.shouldRedirect.set(true);
  }
}

async function promptRedirect(tabId, url, originUrl) {
  await promptCoordinator.promptRedirect(tabId, url, originUrl, {
    onContinue: async () => {
      if (!isControlled()) {
        // Preserve an existing learning session in other tabs so a decline in this tab
        // can run reward time without tearing down the active learning context.
        const preserveLearningState = await shouldPreserveLearningStateOnStay(tabId);
        if (!preserveLearningState) {
          interventionEngine.cleanup();
        }
      }
      // Set prompt lock now that user has explicitly clicked Stay
      // This prevents the prompt from appearing again for 2 minutes
      const hostName = parseUrl(originUrl).name;
      await storage.promptLocks.set(tabId, {
        host: hostName,
        timestamp: Date.now(),
      });
      navigationGuards.install();
      await SessionService.startSession(tabId, "procrastination", originUrl, url, {
        resumeIfExists: true,
      });
      await logDeclinedIntervention(originUrl, url);

      const rewardTime = await getRewardDurationMs();
      await timer.startProcrastinationSession(
        () => checkActiveTab({ ignorePromptCooldown: true }),
        rewardTime,
        { tabId }
      );

      // Show reward progress bar (same as controlled variant)
      await showRewardOverlayWithRetry(tabId);
    },
    onAccept: async () => {
      await SessionService.finalizeSession(tabId, "procrastination", "redirect_accept", {
        completed: false,
      });
      addLearningSiteLoadedListener();
      navigationGuards.install();
      await logEvent({
        participantId: await storage.uid.get(),
        eventType: "experimental_redirection",
        procrastinationSite: originUrl,
        learningSite: url,
        eventData: "accept",
      });

      const procList = await storage.list.get();
      const procHosts = extractProcrastinationHosts(procList);
      await interventionEngine.handleNavigation(tabId, originUrl, procHosts, url);

      await storage.promptLocks.remove(tabId);
      try {
        scheduleRevealOnLoad(tabId);
      } catch (error) {
        l(error);
      }
    },
  });
}

async function handleBlockerRelease(tabId, tabUrl = "") {
  if (isControlled()) {
    await removeContentBlocker(tabId);
    return;
  }

  await removeContentBlocker(tabId);

  let currentUrl = typeof tabUrl === "string" ? tabUrl : "";
  if (!currentUrl && typeof tabId === "number") {
    try {
      const tab = await browser.tabs.get(tabId);
      currentUrl = typeof tab?.url === "string" ? tab.url : "";
    } catch (_) { }
  }
  if (!currentUrl) return;

  const rewardTime = await getRewardDurationMs();
  await SessionService.startSession(tabId, "procrastination", currentUrl, null, {
    resumeIfExists: true,
  });
  await timer.startProcrastinationSession(
    () => checkActiveTab({ ignorePromptCooldown: true }),
    rewardTime,
    { tabId }
  );
  await setPromptCooldown(tabId, currentUrl);

  try {
    const learningUrl = await storage.learningUri.get();
    if (learningUrl) {
      await logDeclinedIntervention(currentUrl, learningUrl);
    }
  } catch (_) { }

  await showRewardOverlayWithRetry(tabId);
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
  return promptCoordinator.renderContentBlocker(details);
}

async function removeContentBlocker(tabId) {
  return promptCoordinator.removeContentBlocker(tabId);
}

async function removeAllContentBlockers() {
  return promptCoordinator.removeAllContentBlockers();
}

async function addProcsiteLoadedListener() {
  return promptCoordinator.addProcsiteLoadedListener(createFilter);
}

async function removeProcsiteLoadedListener() {
  return promptCoordinator.removeProcsiteLoadedListener();
}

export default {
  start: async () => {
    navigationGuards.install();
    await SessionService.reconcileLearningSessions().catch(() => { });
    await SessionService.reconcileProcrastinationSessions().catch(() => { });
    await addNavigationListener();
    addTabChangeListener();
    addWindowChangeListener();
    addOriginTabCloseListener();
  },
  stop: async () => {
    await removeNavigationListener();
    navigationGuards.teardown();
    removeTabChangeListener();
    removeOriginTabCloseListener();
    removeLearningSiteLoadedListener();
    await promptCoordinator.removeAllContentBlockers();
  },
  restart: async () => {
    await Promise.allSettled([
      removeNavigationListener(),
      promptCoordinator.removeAllContentBlockers(),
    ]);
    navigationGuards.teardown();
    removeTabChangeListener();
    removeOriginTabCloseListener();
    removeLearningSiteLoadedListener();
    await SessionService.reconcileLearningSessions().catch(() => { });
    await SessionService.reconcileProcrastinationSessions().catch(() => { });
    await addNavigationListener();
    addTabChangeListener();
    addWindowChangeListener();
    addOriginTabCloseListener();
  },
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
  handleBlockerRelease,
  addOriginTabCloseListener,
  removeLearningSiteLoadedListener,
  checkActiveTab,
  finalizeAllActiveSessions,
  applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
  scheduleRevealOnLoad,
};
