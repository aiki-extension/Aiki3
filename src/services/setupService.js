/*
 * This file contains the installation setup logic for the Aiki extension.
 * It initializes storage, sets default values, and opens the options page on first install.
 */
import browser from "webextension-polyfill";
import storage from "../util/storage";
import redirection from "../redirection";
import intervals from "../intervals";
import { setTheme } from "../util/themes";

async function installationSetup() {
  storage.clearStorage();
  storage.stats.init();
  storage.operatingHours.init();
  setTheme("dark");
  storage.shouldRedirect.set(true);
  storage.redirection.toggle();
  storage.list.set([]);
  storage.uid.set("");
  // Leave learning URL empty by default; user sets this in settings
  storage.learningUri.set("");
  storage.timeSettings.init();
  try {
    await browser.runtime.openOptionsPage();
  } catch (e) {
    // Fallback if polyfill is unavailable
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }
}

async function setup() {
  intervals.intervalSetup();
  storage.shouldRedirect.set(true);
  await redirection.start();
}

export default {
  installationSetup,
  setup,
};