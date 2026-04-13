import browser from 'webextension-polyfill';

const hiddenTabs = new Set();
const pendingRevealTabs = new Set();

const PRELOAD_HIDE_CSS = `
  html, body {
    visibility: hidden !important;
    opacity: 0 !important;
    background: #030712 !important;
  }
`;

async function apply(tabId) {
  if (!tabId || hiddenTabs.has(tabId)) return;
  try {
    await browser.scripting.insertCSS({
      target: { tabId },
      css: PRELOAD_HIDE_CSS,
      origin: 'USER',
    });
    hiddenTabs.add(tabId);
  } catch {}
}

async function remove(tabId) {
  if (!tabId || !hiddenTabs.has(tabId)) return;
  try {
    await browser.scripting.removeCSS({
      target: { tabId },
      css: PRELOAD_HIDE_CSS,
      origin: 'USER',
    });
  } catch {}
  hiddenTabs.delete(tabId);
}

function scheduleReveal(tabId) {
  if (!tabId) return;
  pendingRevealTabs.add(tabId);
}

async function revealIfPending(tabId, cleanup) {
  if (!pendingRevealTabs.has(tabId)) return;
  pendingRevealTabs.delete(tabId);
  if (typeof cleanup === 'function') {
    await cleanup(tabId);
  }
  await remove(tabId);
}

export default {
  apply,
  remove,
  scheduleReveal,
  revealIfPending,
};
