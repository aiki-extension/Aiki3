import browser from 'webextension-polyfill';
import storage from '../util/storage';
import PromptCoordinator from '../services/PromptCoordinator';
import { PROMPT_SUPPRESS_DURATION } from '../values/defaultSettingValues';

const PREPROMPT_ID = '__aiki-preprompt';

async function showImmediatePrompt(tabId) {
  if (!tabId) return;
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (overlayId) => {
        if (document.getElementById(overlayId)) return;
        const root = document.createElement('div');
        root.id = overlayId;
        root.setAttribute(
          'style',
          "position:fixed;inset:0;background:#030712;display:flex;align-items:center;justify-content:center;z-index:2147483645;font-family:'Inter','Segoe UI',sans-serif;color:#f8fafc;",
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
  } catch {}
}

async function isGlobalPromptLocked() {
  try {
    const globalPromptLock = await storage.globalPromptLock.get();
    // console.log("Is Global Prompt Lock Enabled? ", Boolean(globalPromptLock?.timestamp && Date.now() - globalPromptLock.timestamp < PROMPT_SUPPRESS_DURATION));
    return Boolean(
      globalPromptLock?.timestamp &&
        Date.now() - globalPromptLock.timestamp < PROMPT_SUPPRESS_DURATION,
    );
  } catch {
    return false;
  }
}

// tabId is accepted for call-site readability but not used — the lock is global.
async function setPromptCooldown(tabId, url) {
  if (!url) return;
  try {
    await storage.globalPromptLock.set({ timestamp: Date.now() });
  } catch {}
}

/**
 * Build the prompt-control facade. Owns:
 *  - the `pendingIntents` queue (intents queued during onBeforeNavigate before
 *    the content script signals ready)
 *  - the global prompt lock + cooldown bookkeeping
 *  - thin wrappers around PromptCoordinator that bake in the bookkeeping so
 *    callers don't repeat lock checks or cooldown writes
 *
 * Callers (redirectFlow, originTracking, etc.) inject their flow-specific
 * callbacks through `promptRedirect` and `renderContentBlocker`.
 */
export function createPromptControl({ navigationGuards }) {
  const pendingIntents = new Map();

  const promptCoordinator = new PromptCoordinator({
    applyPreemptiveHide: (tabId) => navigationGuards.applyPreemptiveHide(tabId),
    removePreemptiveHide: (tabId) =>
      navigationGuards.removePreemptiveHide(tabId),
    showImmediatePrompt,
    hideImmediatePrompt: (tabId) => navigationGuards.hideImmediatePrompt(tabId),
  });

  function queuePendingIntent(tabId, fn) {
    pendingIntents.set(tabId, fn);
  }

  // Called by the background message handler when a content script fires
  // contentScript:ready. Consumes any pending intent queued during
  // onBeforeNavigate for that tab.
  function onContentScriptReady(tabId) {
    const fn = pendingIntents.get(tabId);
    if (fn) {
      pendingIntents.delete(tabId);
      fn();
    }
  }

  async function promptRedirect(tabId, url, originUrl, callbacks = {}) {
    if (await isGlobalPromptLocked()) return;
    return promptCoordinator.promptRedirect(tabId, url, originUrl, callbacks);
  }

  async function renderContentBlocker(details, extraCallbacks = {}) {
    if (await isGlobalPromptLocked()) return;
    return promptCoordinator.renderContentBlocker(details, {
      onConnectionFailed: () => {
        queuePendingIntent(details.tabId, () =>
          renderContentBlocker(details, extraCallbacks),
        );
      },
      onContinue: async () => {
        await removeContentBlocker(details.tabId);
        await setPromptCooldown(details.tabId, details.url);
        await extraCallbacks.onContinue?.();
      },
    });
  }

  function removeContentBlocker(tabId) {
    return promptCoordinator.removeContentBlocker(tabId);
  }

  function removeAllContentBlockers() {
    return promptCoordinator.removeAllContentBlockers();
  }

  function removeTimeWastingLoadedListener() {
    return promptCoordinator.removeTimeWastingLoadedListener();
  }

  return {
    queuePendingIntent,
    onContentScriptReady,
    isGlobalPromptLocked,
    setPromptCooldown,
    showImmediatePrompt,
    promptRedirect,
    renderContentBlocker,
    removeContentBlocker,
    removeAllContentBlockers,
    removeTimeWastingLoadedListener,
  };
}
