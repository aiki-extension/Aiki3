import browser from "webextension-polyfill";
import storage from "./util/storage";
import { parseUrl } from "./util/utilities";

let list = [];
let user = null;
let learningName = null;
let data = {
  chromeActive: 0,
  chromeInactive: 0,
};
let counterId = null;
let loggerId = null;

async function intervalSetup() {
  await Promise.all([syncUser(), syncList(), syncLearningSite()]);
  startCounter();
  startLogger();
  addOnWindowsCloseListener();
}

async function syncLearningSite() {
  const learningUri = await storage.learningUri.get();
  learningName = learningUri ? parseUrl(learningUri).name : null;
}

async function counter() {
  const currentWindow = await browser.windows.getCurrent();

  const views =
    typeof chrome !== "undefined" && chrome.runtime?.getViews
      ? chrome.runtime.getViews({ type: "popup" })
      : [];

  if (currentWindow.focused || views.length > 0) {
    data.chromeActive++;

    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab || !activeTab.url) return;

    const { name } = parseUrl(activeTab.url);

    const isProcrastinationSite = list.includes(name);
    const isLearningSite = learningName && name === learningName;

    if (isProcrastinationSite || isLearningSite) {
      data[name] = (data[name] ?? 0) + 1;
    }
  } else {
    data.chromeInactive++;
  }
}

function logger() {
  const snapshot = { ...data };
  storeData(snapshot);
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
  const snapshot = { ...data };
  storeData(snapshot);
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

function storeData(snapshot) {
  if (!user) return;

  // Store locally for stats/badge display only
  // Session logging is handled by redirection.js on tab switch/close
  storage.stats.storeSession(snapshot);
}

function resetData() {
  data = {
    chromeActive: 0,
    chromeInactive: 0,
  };
}

function addOnWindowsCloseListener() {
  browser.windows.onRemoved.addListener(() => {
    const snapshot = { ...data };
    storeData(snapshot);
    resetData();
  });
}

export default {
  intervalSetup,
  counter: { start: startCounter, restart: restartCounter },
  logger: { start: startLogger, restart: restartLogger },
  addOnWindowsCloseListener,
};
