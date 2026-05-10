/*
 * This file contains the installation setup logic for the Aiki extension.
 * It initializes storage, sets default values, and opens the options page on first install.
 */
import browser from 'webextension-polyfill';
import storage from '../util/storage';
import redirection from '../redirection';
import intervals from '../intervals';
import { setTheme } from '../util/themes';

export async function installationSetup() {
  storage.clearStorage();
  setTheme('dark');
  try {
    await browser.runtime.openOptionsPage();
  } catch {
    // Fallback if polyfill is unavailable
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }
}

export async function setup() {
  intervals.intervalSetup();
  await redirection.start();
}
