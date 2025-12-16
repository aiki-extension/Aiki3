import storage from "./util/storage";
import { logEvent, logSessionEvent } from "./util/logger";
import browser from "webextension-polyfill";
import timer from "./timer";
import { parseUrl, makeDate, parseTime } from "./util/utilities";

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
let lastActiveTabId = null;
let procrastinationGuardsRegistered = false;
let activeLearningTabId = null;
let cachedGoalSeconds = null;
let lastGoalFetch = 0;

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

async function finalizeTrackedSession(tabId, outcome = "continue", metadata = {}) {
  if (tabId === undefined || tabId === null) return;
  const session = await storage.activeSessions.get(tabId);
  if (!session) return;
  await storage.activeSessions.remove(tabId);
  
  const now = Date.now();
  const startedAt = session.startedAt || now;
  const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
  
  await logSessionEvent({
    participantId: session.participantId,
    sessionType: session.sessionType || "learning",
    procrastinationSite: session.procrastinationUrl,
    learningSite: session.learningUrl,
    triggerSource: metadata.sourceType || "extension",
    promptResponse: "redirect",
    eventData: "accept",
    sessionStart: new Date(startedAt),
    sessionEnd: new Date(now),
    completedMicrolearning:
      typeof metadata.completed === "boolean"
        ? metadata.completed
        : outcome === "continue",
    actualDurationSeconds:
      typeof metadata.durationSeconds === "number"
        ? metadata.durationSeconds
        : durationSeconds,
    returnedToProcrastinationSite:
      typeof metadata.returned === "boolean"
        ? metadata.returned
        : outcome !== "tab_closed",
  });
}

async function startProcrastinationSession(tabId, procrastinationUrl) {
  if (tabId === undefined || tabId === null || !procrastinationUrl) return;
  const participantId = await storage.uid.get();
  if (!participantId) return;
  lastActiveTabId = tabId;
  await storage.activeSessions.set(tabId, {
    participantId,
    sessionType: "procrastination",
    procrastinationUrl,
    startedAt: Date.now(),
  });
}

async function finalizeProcrastinationSession(tabId, reason = "switch") {
  if (tabId === undefined || tabId === null) return;
  const session = await storage.activeSessions.get(tabId);
  if (!session || session.sessionType !== "procrastination") return;
  await storage.activeSessions.remove(tabId);

  const now = Date.now();
  const startedAt = session.startedAt || now;
  const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));

  await logSessionEvent({
    participantId: session.participantId,
    sessionType: "procrastination",
    procrastinationSite: session.procrastinationUrl,
    sessionStart: new Date(startedAt),
    sessionEnd: new Date(now),
    actualDurationSeconds: durationSeconds,
    durationSeconds,
    completed: false,
    eventData: reason,
  });
}

async function startLearningSession(tabId, learningUrl, procrastinationUrl) {
  if (tabId === undefined || tabId === null || !learningUrl) return;
  const participantId = await storage.uid.get();
  if (!participantId) return;
  lastActiveTabId = tabId;
  activeLearningTabId = tabId;
  await storage.activeSessions.set(tabId, {
    participantId,
    sessionType: "learning",
    procrastinationUrl: procrastinationUrl || null,
    learningUrl,
    startedAt: Date.now(),
  });
}

async function finalizeLearningSession(tabId, reason = "switch") {
  if (tabId === undefined || tabId === null) return;
  const session = await storage.activeSessions.get(tabId);
  if (!session || session.sessionType !== "learning") return;
  await storage.activeSessions.remove(tabId);
  if (activeLearningTabId === tabId) {
    activeLearningTabId = null;
  }

  const now = Date.now();
  const startedAt = session.startedAt || now;
  const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
  const goalSeconds = await getGoalSeconds();

  await logSessionEvent({
    participantId: session.participantId,
    sessionType: "learning",
    procrastinationSite: session.procrastinationUrl,
    learningSite: session.learningUrl,
    sessionStart: new Date(startedAt),
    sessionEnd: new Date(now),
    actualDurationSeconds: durationSeconds,
    durationSeconds,
    goalSeconds,
    completed: false,
    eventData: reason,
  });
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
    await finalizeProcrastinationSession(tabId, "navigation");
    return;
  }

  if (session.sessionType === "learning") {
    const currentName = extractName(session.learningUrl);
    if (currentName && nextName && currentName === nextName) {
      await storage.activeSessions.set(tabId, { ...session, learningUrl: nextUrl });
      return;
    }
    await finalizeLearningSession(tabId, "navigation");
  }
}

function registerProcrastinationGuards() {
  if (procrastinationGuardsRegistered) return;
  procrastinationGuardsRegistered = true;

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    if (lastActiveTabId !== null && lastActiveTabId !== tabId) {
      await finalizeProcrastinationSession(lastActiveTabId, "tab_switch");
      await finalizeLearningSession(lastActiveTabId, "tab_switch");
    }
    lastActiveTabId = tabId;
  });

  browser.tabs.onRemoved.addListener(async (tabId) => {
    await finalizeProcrastinationSession(tabId, "tab_closed");
    await finalizeLearningSession(tabId, "tab_closed");
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url) {
      await handleTabNavigation(tabId, changeInfo.url);
    }
  });
}

async function logDeclinedIntervention(originUrl, learningUrl) {
  await logSessionEvent({
    sessionType: "learning",
    procrastinationSite: originUrl,
    learningSite: learningUrl,
    triggerSource: "prompt",
    promptResponse: "continue",
    eventData: "stay",
    completedMicrolearning: false,
    actualDurationSeconds: 0,
    returnedToProcrastinationSite: true,
    sessionStart: Date.now(),
    sessionEnd: Date.now(),
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
  if (windowId >= 0) {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        checkTab(tabs[0]);
      }
    } catch (error) {
      // console.log(error);
    }
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
        await finalizeTrackedSession(details, "tab_closed", {
          sourceType: "tab_removed",
          completed: false,
          returned: false,
        });
        timer.stopBonusTime(); // Without this badge goes "Done". This is bad. Maybe I'll fix it later.
        timer.stopLearningSession(); // This is fine
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

  const sessionTabId = targetTabId !== undefined ? targetTabId : origin?.tabId;
  if (sessionTabId !== undefined) {
    await finalizeTrackedSession(sessionTabId, normalizedEvent, {
      sourceType,
      completed: normalizedEvent === "continue",
      returned: normalizedEvent !== "tab_closed",
    });
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
      await startProcrastinationSession(tabId, originUrl);
      // Log immediate event for continue decision
      await logEvent({
        participantId: await storage.uid.get(),
        eventType: "redirection_decision",
        procrastinationSite: originUrl,
        learningSite: url,
        eventData: "stay",
        timestamp: Date.now(),
      });
      await logDeclinedIntervention(originUrl, url);
      addRedirectionLog(
        `Interception: continue on procrastination site`,
        parseUrl(originUrl).name,
        parseUrl(url).name,
        {
          eventType: "redirection_decision",
          action: "continue",
          continueTap: true,
          eventData: "stay",
          procrastinationUrl: originUrl,
          learningUrl: url,
    }
  );
      await hideImmediatePrompt(tabId);
      await removePreemptiveHide(tabId);
    } else if (result && result.action === "redirect") {
      addLearningSiteLoadedListener();
      registerProcrastinationGuards();
      await startLearningSession(tabId, url, originUrl);
      addRedirectionLog(
        `Interception: user redirected to learning platform`,
        parseUrl(originUrl).name,
        parseUrl(url).name,
        {
          eventType: "redirection_decision",
          action: "redirect",
          eventData: "accept",
          procrastinationUrl: originUrl,
          learningUrl: url,
        }
      );
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
    sessionType: eventType,
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
};
