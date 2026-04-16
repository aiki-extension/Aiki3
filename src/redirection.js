import storage from "./util/storage";
import browser from "webextension-polyfill";
import timer from "./services/TimerManager";
import { parseUrl, makeDate, parseTime } from "./util/utilities";
import SessionService from "./services/SessionService";
import NavigationGuards from "./services/NavigationGuards";
import PromptCoordinator from "./services/PromptCoordinator";
import { PROMPT_SUPPRESS_DURATION } from "./values/defaultSettingValues";
import { getLearningUrl } from "./services/siteDetector";

const l = console.log;


const navigationGuards = new NavigationGuards(false); // Pass false to disable debug logs in NavigationGuards

// Pending intents for tabs that are mid-navigation (content script not yet ready).
// Keyed by tabId. Set by redirect() on onBeforeNavigate, consumed by onContentScriptReady().
const pendingIntents = new Map();

const promptCoordinator = new PromptCoordinator({
  applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
  removePreemptiveHide: (tabId) => navigationGuards.removePreemptiveHide(tabId),
  showImmediatePrompt,
  hideImmediatePrompt: (tabId) => navigationGuards.hideImmediatePrompt(tabId),
});
// Was previously used to select between different redirection strategies (e.g. controlled vs experimental variants). 
// todo: Refactor to not support multiple strategies in the same codebase, as this adds unnecessary complexity and indirection. If we want to run experiments, we can use feature flags and conditionals within a single strategy implementation.
const strategy = {
  handleNavigation: async () => false,
  onLearningSiteNavigation: async () => { },
};

let shouldShowWelcome = true;
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
  } catch { }
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
      const currentLearning = await getLearningUrl();
      const learningName = parseUrl(currentLearning).name;
      if (tab.url.includes(learningName)) {
        storage.learningUri.set(tab.url);
      }
    }
  }
}

async function isGlobalPromptLocked() {
  try {
    const globalPromptLock = await storage.globalPromptLock.get();
    return Boolean(
      globalPromptLock?.timestamp &&
      Date.now() - globalPromptLock.timestamp < PROMPT_SUPPRESS_DURATION
    );
  } catch {
    return false;
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
async function redirect(details, immediate = false) {
  if (await isGlobalPromptLocked()) {
    return;
  }

  if (await checkActiveTime()) {
    if (details.frameId === 0 && !details.url.includes("auth")) {
      const toggled = await storage.redirection.get();
      if (!toggled) { return; }

      const procList = await storage.list.get();

      // The hostSuffix URL filter is broad (e.g. "youtube.com" also matches
      // "accounts.youtube.com"). Guard here so auth/redirect subdomains never
      // queue a pending intent or overwrite a legitimate one.
      const tabSiteName = parseUrl(details.url).name;
      const procListNames = (procList || []).map(site => site.name);
      if (!procListNames.includes(tabSiteName)) {
        return;
      }

      const procHosts = (procList || []).map(item => item?.host || item?.name || "").filter(Boolean);
      const learningUrl = await getLearningUrl();

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

      if (toggled && shouldRedirect && !goalMet && !timer.isSessionRewardActive()) {
        l("ShouldRedirect", shouldRedirect);
        const origin = await storage.origin.get();
        l("Checking against this: ", origin);

        // Validate that the origin learning tab still exists before showing blocker
        let isOriginValid = false;
        if (origin && origin.tabId !== undefined) {
          try {
            const originTab = await browser.tabs.get(origin.tabId);
            const learningUri = await getLearningUrl();
            if (originTab && learningUri) {
              const learningName = parseUrl(learningUri).name;
              if (learningName && originTab.url && originTab.url.includes(learningName)) {
                isOriginValid = true;
              }
            }
          } catch {
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

        const learningUri = await getLearningUrl();
        if (!learningUri) return;

        // dispatchPrompt re-reads origin at call time so the correct UI is shown
        // regardless of async races between queuing and firing.
        if (immediate) {
          dispatchPrompt(details.tabId, learningUri, details.url);
        } else {
          pendingIntents.set(details.tabId, () => dispatchPrompt(details.tabId, learningUri, details.url));
        }
      }else if (toggled && shouldRedirect && goalMet) {
        // Goal met + reward unclaimed: auto-start reward without any prompt
        const [rewardMinutes, rewardSeconds] = await Promise.all([
          storage.timeSettings.rewardMinutes.get(),
          storage.timeSettings.rewardSeconds.get(),
        ]);
        let rewardDuration = (rewardMinutes * 60 * 1000) + (rewardSeconds * 1000);
        if (rewardDuration <= 0) {
          rewardDuration = 60 * 1000;
        }
        await storage.shouldRedirect.set(false);
        await timer.startProcrastinationSession(checkActiveTab, rewardDuration);
        return;
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
      const learningUri = await getLearningUrl();
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
        
        // Don't re-enable redirects if a session reward is currently active,
        // closing the origin tab while on reward time should not cancel the reward.
        if (!timer.isSessionRewardActive()) {
          storage.shouldRedirect.set(true);
        }
      }
    }
  }
}

async function addLearningSiteLoadedListener() {
  const currentLearning = await getLearningUrl();
  if (!currentLearning) return;
  const learningName = parseUrl(currentLearning).name;
  if (!learningName) return;
  browser.webNavigation.onCompleted.addListener(messageLearningResource, {
    url: [{ hostContains: `.${learningName}.` }],
  });
}

// Fallback trigger in case webNavigation timing misses injection readiness
async function triggerLearningOverlay(tabId) {
  try {
    await messageLearningResource({ tabId });
  } catch { }
}

function removeLearningSiteLoadedListener() {
  l("Removing Leaning site loaded listener");
  browser.webNavigation.onCompleted.removeListener(messageLearningResource);
  shouldShowWelcome = true;
}

async function getActiveLearningTabs(excludedIds = new Set()) {
  const learningUri = await getLearningUrl();
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
  } catch {
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
  } catch { }
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
  } catch { }
}

/** #CHECKCURRENTTAB()#
@function
@async
@description Gets currently active tab and sends message to the content script if it
is a time wasting website. */
async function checkActiveTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const tab = tabs[0];
      const tabSiteName = parseUrl(tab.url).name;
      const procList = await storage.list.get();
      const procListNames = procList.map((site) => site.name);
      if (procListNames.includes(tabSiteName)) {
        const learningUri = await getLearningUrl();
        if (!learningUri) return; // no learning site set; do nothing

        const procHosts = procList.map(item => item?.host || item?.name || "").filter(Boolean);
        const handled = await strategy.handleNavigation(
          { tabId: tab.id, url: tab.url },
          { procrastinationHosts: procHosts, learningUrl: learningUri } // fixed name
        );
        if (handled) return;

        // Show redirect prompt
        promptRedirect(tab.id, learningUri, tab.url);
        console.log("Prompt called from checkActiveTab()") // FLAG for further research, as i do not think this is ever called
      }
    }
  } catch { }
}

async function checkTabById({ tabId }) {
  try {
    const tab = await browser.tabs.get(tabId);
    await checkTab(tab);
  } catch (error) {
    console.log(error.message);
  }
}
// TODO: Rewrite these two functions ^ & v to 1 single function that checks if tab has url (if not, get it)

/** #CHECKTAB()#
 * @async
 * @function
 * @description Checks a tab against a list of websites defined as time wasting websites.
 * If a tab's url is found in the list, it calls the redirect function using that tab's details.
 * @param {object} tab
 * @param {number} tab.frameId
 * @param {string} tab.url
 * @param {number} tab.id */
async function checkTab(tab) {
  if (!tab?.id || !tab?.url) return;

  // Single routing path: reuse redirect logic for tab-activation events.
  // `immediate=true` avoids pending-intent queue for already-loaded tabs.
  await redirect(
    { frameId: 0, url: tab.url, tabId: tab.id },
    true
  );
}

/** #GOTOORIGIN()#
 * @async
 * @function
 * @description Changes location of the tab registered as the tab
 * that triggered a redirection from time wasting to learning site.
 * The uri was saved upon redirection, and here restored in full in the same tab.
 * Origin is an object of type: {integer: tabId, string: url} */
async function gotoOrigin(event, sourceContext = {}) {
  const normalizedEvent = event === "injected" ? "continue" : event;

  // Handle controlled variant continue bypass via controlledMode
  
  const statsHandler = storage.stats[normalizedEvent];
  if (typeof statsHandler === "function") {
    await statsHandler();
  }

  const context =
    sourceContext && typeof sourceContext === "object"
      ? sourceContext
      : { type: sourceContext };
  const { tabId: providedTabId, restoreAll } = context;

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
    } catch { }
  }

  // Read blockedOrigin before removeAllContentBlockers() clears storage.blockedOrigins
  const targetBlockedOrigin = targetTabId !== undefined
    ? await storage.blockedOrigins.get(targetTabId)
    : null;

  const sessionTabId = targetTabId !== undefined ? targetTabId : origin?.tabId;
  if (sessionTabId !== undefined) {
      await SessionService.finalizeSession(sessionTabId, "learning", normalizedEvent);
  }

  removeOriginUpdatedListener();
  removeProcsiteLoadedListener();
  await removeAllContentBlockers();

  if (origin && origin.tabId !== undefined) {
    try {
      const learningTab = await browser.tabs.get(origin.tabId);
      const configuredLearning = await getLearningUrl();
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
    const blockedOrigin = targetBlockedOrigin;
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
            } catch { }
          }
          restoredTabIds.add(tabId);
        })
    );
  }

  const remainingLearningTabs = await getActiveLearningTabs(restoredTabIds);
  const hasRemainingLearningTabs = remainingLearningTabs.length > 0;

  // Start a time wasting session for the destination tab
  if (destinationUrl && targetTabId !== undefined) {
    await SessionService.startSession(targetTabId, "procrastination", destinationUrl);
  }

  const redirectionToggled = await storage.redirection.get();
  if (redirectionToggled && !hasRemainingLearningTabs) {
    const [rewardMinutes, rewardSeconds] = await Promise.all([
      storage.timeSettings.rewardMinutes.get(),
      storage.timeSettings.rewardSeconds.get(),
    ]);
    let rewardDuration = (rewardMinutes * 60 * 1000) + (rewardSeconds * 1000);

    if (rewardDuration <= 0) {
      // Provide a short grace period so the skip/continue action actually unlocks the site.
      rewardDuration = 60 * 1000;
    }

    await storage.shouldRedirect.set(false);
    await timer.startProcrastinationSession(checkActiveTab, rewardDuration);
  } else if (hasRemainingLearningTabs) {
    await storage.shouldRedirect.set(true);
  }
}

/**
 * Called by the background message handler when a content script fires contentScript:ready.
 * Consumes any pending intent queued during onBeforeNavigate for that tab.
 */
function onContentScriptReady(tabId) {
  const fn = pendingIntents.get(tabId);
  if (fn) {
    pendingIntents.delete(tabId);
    fn();
  }
}

// Checks origin at call time and routes to the correct UI.
// Using this instead of deciding at queue time avoids async races where origin
// changes between when the intent is queued and when it fires.
async function dispatchPrompt(tabId, learningUri, procUrl) {
  const origin = await storage.origin.get();
  const flags = await storage.featureFlags.get();
  const promptEnabled = !flags.redirectPrompt;
  console.log("promptEnabled is: " + promptEnabled);

  if (!promptEnabled) {
    // Skip prompt and instant redirect instead
    addLearningSiteLoadedListener();
    navigationGuards.install();
    await SessionService.startSession(tabId, "learning", learningUri, procUrl);
    await timer.startLearningSession();
    storage.origin.set({ url: procUrl})
    addOriginUpdatedListener(tabId);
    await storage.globalPromptLock.remove();

    try {
      scheduleRevealOnLoad(tabId);
      await browser.tabs.update(tabId, { url: learningUri });
      setTimeout(() => triggerLearningOverlay(tabId), 1500);
    } catch (error) {
      l(error);
    }
    return; // Exits early to dismiss prompt
    
  }

  if (origin) {
    renderContentBlocker({ tabId, frameId: 0, url: procUrl });
  } else {
    promptRedirect(tabId, learningUri, procUrl);
  }
}

async function promptRedirect(tabId, url, originUrl) {
  await promptCoordinator.promptRedirect(tabId, url, originUrl, {
    onConnectionFailed: () => {
      // The tab navigated away before the content script could respond (e.g. an
      // auth redirect mid-load). Re-queue via dispatchPrompt so origin is re-checked
      // when the tab settles — avoids overwriting a newer renderContentBlocker intent.
      pendingIntents.set(tabId, () => dispatchPrompt(tabId, url, originUrl));
    },
    onContinue: async () => {
      // Set global prompt lock now that user has explicitly clicked Stay
      // This prevents the prompt from appearing again for 10 minutes (across all tabs)
      await storage.globalPromptLock.set({  
        timestamp: Date.now(),
      });
      console.log("Lock engaged");

      // Start tracking procastination session
      navigationGuards.install();
      await SessionService.startSession(tabId, "procrastination", originUrl);
    },
    onAccept: async () => {
      addLearningSiteLoadedListener();
      navigationGuards.install();
      await SessionService.startSession(tabId, "learning", url, originUrl);
      await timer.startLearningSession();
      storage.origin.set({ url: originUrl, tabId: tabId });
      addOriginUpdatedListener(tabId);

      // Clears the global prompt lock when user accepts
      await storage.globalPromptLock.remove();
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

async function renderContentBlocker(details) {
  if (await isGlobalPromptLocked()) return;

  return promptCoordinator.renderContentBlocker(details, {
    onConnectionFailed: () => {
      pendingIntents.set(details.tabId, () => renderContentBlocker(details));
    },
    onContinue: async () => {
      await removeContentBlocker(details.tabId);
      await setPromptCooldown(details.tabId, details.url);
    },
  });
}

async function removeContentBlocker(tabId) {
  return promptCoordinator.removeContentBlocker(tabId);
}

async function removeAllContentBlockers() {
  return promptCoordinator.removeAllContentBlockers();
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
  onContentScriptReady,
};
