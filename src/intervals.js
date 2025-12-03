import browser from "webextension-polyfill";
import storage from "./util/storage";
import { logEvent, logSessionEvent } from "./util/logger";
import { parseUrl } from "./util/utilities";
import { learningSites } from "./util/constants";

let list;
let user;
let data = {
  chromeActive: 0,
  chromeInactive: 0,
};
let counterId;
let loggerId;

function intervalSetup() {
  syncUser();
  syncList();
  startCounter();
  startLogger();
  addOnWindowsCloseListener();
}

async function counter() {
  const window = await browser.windows.getCurrent();
  const views = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getViews)
    ? chrome.runtime.getViews({ type: "popup" })
    : [];
  if (window.focused || views.length > 0) {
    data.chromeActive++;
    const result = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const name = parseUrl(result[0].url).name;
    if (
      list.includes(name) ||
      learningSites.find((site) => site.name === name) !== undefined
    ) {
      data[name] = data[name] ? data[name] + 1 : 1;
    }
  } else {
    data.chromeInactive++;
  }
}

function logger() {
  storeData(data);
  resetData();
}

function startCounter() {
  counterId = setInterval(counter, 1000); // 1 second
}

function stopCounter() {
  clearInterval(counterId);
}

function startLogger() {
  loggerId = setInterval(logger, 1000 * 60 * 5); // 5 minutes
}

function stopLogger() {
  clearInterval(loggerId);
}

async function restartCounter() {
  stopCounter();
  await syncList();
  startCounter();
}

async function restartLogger() {
  stopLogger();
  storeData(data);
  resetData();
  await syncUser();
  startLogger();
}

async function syncUser() {
  const result = await storage.uid.get();
  user = result;
}

async function syncList() {
  const result = await storage.list.get();
  list = result ? result.map((item) => item.name) : [];
}

function calculateCategoryTime(data, siteList) {
  let totalSeconds = 0;
  const siteDetails = [];

  Object.entries(data).forEach(([name, seconds]) => {
    if (typeof seconds === "number" && siteList.includes(name)) {
      totalSeconds += seconds;
      siteDetails.push({ name, seconds });
    }
  });

  return { totalSeconds, siteDetails };
}

function storeData(data) {
  if (!user) return;
  storage.stats.storeSession(data);

  const perSiteSeconds = Object.entries(data).reduce((acc, [key, value]) => {
    if (key !== "chromeActive" && key !== "chromeInactive" && typeof value === "number") {
      acc[key] = value;
    }
    return acc;
  }, {});

  const learningList = learningSites.map((s) => s.name);
  
  const procrastination = calculateCategoryTime(perSiteSeconds, list || []);
  const learning = calculateCategoryTime(perSiteSeconds, learningList);

  procrastination.siteDetails.forEach((site) => {
    logSessionEvent({
      participantId: user,
      sessionType: "procrastination",
      siteVisited: site.name,
      durationSeconds: site.seconds,
      timestamp: Date.now(),
      triggeredBySite: null, 
    });
  });



function resetData() {
  data = {
    chromeActive: 0,
    chromeInactive: 0,
  };
}

function addOnWindowsCloseListener() {
  browser.windows.onRemoved.addListener((details) => {
    storeData(data);
    resetData();
  });
}

export default {
  intervalSetup,
  counter: { start: startCounter, restart: restartCounter },
  logger: { start: startLogger, restart: restartLogger },
  addOnWindowsCloseListener,
};
