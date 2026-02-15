import storage from "./util/storage";
import { logEvent } from "./util/logger";
import browser from "webextension-polyfill";
import timer from "./services/TimerManager";
import { parseUrl, makeDate, parseTime } from "./util/utilities";
import { isControlled } from "./util/variantConfig";
import controlledMode from "./controlledMode";
import SessionService from "./services/SessionService";
import NavigationGuards from "./services/NavigationGuards";
import ControlledStrategy from "./util/ControlledStrategy";
import ExperimentalStrategy from "./util/ExperimentalStrategy";
import PromptCoordinator from "./services/PromptCoordinator";

const l = console.log;

const strategy = isControlled() ? new ControlledStrategy() : new ExperimentalStrategy();

const navigationGuards = new NavigationGuards(strategy);
const promptCoordinator = new PromptCoordinator({
  applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
  removePreemptiveHide: (tabId) => navigationGuards.removePreemptiveHide(tabId),
  showImmediatePrompt,
  hideImmediatePrompt: (tabId) => navigationGuards.hideImmediatePrompt(tabId),
});

let shouldShowWelcome = true;
const PROMPT_SUPPRESS_DURATION = 10 * 60 * 1000; // 10 minutes - global cooldown across all tabs
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

      const procList = await storage.list.get();
      const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);
      const learningUrl = await storage.learningUri.get();

      const handled = await strategy.handleNavigation(details, {
        applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
        removePreemptiveHide: (tabId) => navigationGuards.removePreemptiveHide(tabId),
        procrastinationHosts: procHosts,
        learningUrl,
      });
      if (handled) return;

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

        // Validate that the origin learning tab still exists before showing blocker
        let isOriginValid = false;
        if (origin && origin.tabId !== undefined) {
          try {
            const originTab = await browser.tabs.get(origin.tabId);
            const learningUri = await storage.learningUri.get();
            if (originTab && learningUri) {
              const learningName = parseUrl(learningUri).name;
              if (learningName && originTab.url && originTab.url.includes(learningName)) {
                isOriginValid = true;
              }
            }
          } catch (_) {
            // Tab doesn't exist - origin is stale
          }

          // Clear stale origin if tab no longer exists or isn't on learning site
          if (!isOriginValid) {
            l("Origin tab no longer valid, clearing stale origin");
            await storage.origin.remove();
            removeOriginUpdatedListener();
            removeAllContentBlockers();
            timer.stopBonusTime();
            timer.stopLearningSession();
          }
        }

        if (isOriginValid) {
          l(details);
          // Only show blocker for experimental variant
          // Controlled variant handles blocking via direct redirect in controlledMode
          if (!isControlled()) {
            addProcsiteLoadedListener();
          }
        } else {
          const learningUri = await storage.learningUri.get();
          if (!learningUri) return; // skip redirection if no learning URL configured
          
          // Check global prompt lock (applies to all tabs)
          const globalPromptLock = await storage.globalPromptLock.get();  // ← GLOBAL CHECK
          const now = Date.now();

          if (
            globalPromptLock &&                                           // Does global lock exists
            now - globalPromptLock.timestamp < PROMPT_SUPPRESS_DURATION   // And still within time limit set (10 min)
          ) {
            l("Skipping prompt due to global cooldown (10 minutes)");
            return; // We are in global cooldown period - Don't show prompt
          }

          // Experimental variant: show consent prompt
          promptRedirect(details.tabId, learningUri, details.url);
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
              await SessionService.transferActiveSession(details, replacement.id);
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
  const learningName = parseUrl(currentLearning).name;
  if (!learningName) return;
  browser.webNavigation.onCompleted.addListener(messageLearningResource, {
    url: [{ hostContains: `.${learningName}.` }],
  });
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

  browser.webNavigation.onCompleted.addListener(strategy.onLearningSiteNavigation?.bind(strategy) || (() => { }), {
    url: [{ hostContains: learningName }],
  });
  console.log("[Redirection] Added controlled learning site listener for:", learningName);
}

// Fallback trigger in case webNavigation timing misses injection readiness
async function triggerLearningOverlay(tabId) {
  try {
    await messageLearningResource({ tabId });
  } catch (_) { }
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
  if (!url) return;
  try {
    // Set global prompt lock (applies to all tabs for 10 minutes)
    await storage.globalPromptLock.set({  
      timestamp: Date.now(),  // Time stored for cooldown
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

        const procHosts = procList.map(item => item?.host || item?.name || "").filter(Boolean);
        const handled = await strategy.handleNavigation(
          { tabId: tab.id, url: tab.url },
          { procrastinationHosts: procHosts, learningUrl }
        );
        if (handled) return;

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
        promptRedirect(tab.id, learningUri, tab.url);
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
    } catch (_) { }
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
      await SessionService.finalizeSession(sessionTabId, "learning", normalizedEvent);
    }
  } else {
    console.log("[Aiki Debug] No session to finalize - sessionTabId is undefined");
  }

  removeOriginUpdatedListener();
  removeProcsiteLoadedListener();
  await removeAllContentBlockers();

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
            } catch (error) { }
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

async function promptRedirect(tabId, url, originUrl) {
  await promptCoordinator.promptRedirect(tabId, url, originUrl, {
    onContinue: async () => {
      // Set global prompt lock now that user has explicitly clicked Stay
      // This prevents the prompt from appearing again for 10 minutes (across all tabs)
      await storage.globalPromptLock.set({  
        timestamp: Date.now(),
      });

      // Start tracking procastination session
      navigationGuards.install();
      await SessionService.startSession(tabId, "procrastination", originUrl);
      await logDeclinedIntervention(originUrl, url);
    },
    onAccept: async () => {
      addLearningSiteLoadedListener();
      navigationGuards.install();
      await SessionService.startSession(tabId, "learning", url, originUrl);
      await logEvent({
        participantId: await storage.uid.get(),
        eventType: "experimental_redirection",
        procrastinationSite: originUrl,
        learningSite: url,
        eventData: "accept",
      });
      await timer.startLearningSession();
      storage.origin.set({ url: originUrl, tabId: tabId });
      addOriginUpdatedListener(tabId);

      // Clears the global prompt lock when user accepts
      await storage.promptLocks.remove();
      try {
        scheduleRevealOnLoad(tabId);
        await browser.tabs.update(tabId, {
          url: url,
        });
        setTimeout(() => triggerLearningOverlay(tabId), 1500);
      } catch (error) {
        l(error);
      }
    },
  });
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
  addOriginTabCloseListener,
  removeLearningSiteLoadedListener,
  checkActiveTab,
  finalizeAllActiveSessions,
};
