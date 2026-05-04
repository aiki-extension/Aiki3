/*
This file contains service functions related to the status of Aiki.
*/

import storage from '../util/storage';
import redirection from '../redirection';
import timer from './TimerManager';

async function reviveAiki() {
  redirection.checkActiveTab();
}

async function killAiki() {
  // FIRST: Finalize all active sessions before stopping anything
  // This ensures we capture the exact duration up to the disable moment
  try {
    await redirection.finalizeAllActiveSessions('extension_disabled');
    console.log(
      '[Background] Finalized all active sessions on extension disable',
    );
  } catch (e) {
    console.warn('[Background] Failed to finalize sessions on disable:', e);
  }

  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  try {
    await browser.tabs.sendMessage(tabs[0].id, { action: 'kill aiki' });
  } catch {
    // Tab may not have content script or context invalidated
  }
  timer.stopLearningSession();
  timer.killAiki();
}

async function gotoOriginTab() {
  const origin = await storage.origin.get();
  try {
    await browser.tabs.update(origin.tabId, { active: true });
  } catch {}
}

export default {
  reviveAiki,
  killAiki,
  gotoOriginTab,
};
