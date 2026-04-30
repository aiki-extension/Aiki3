import browser from 'webextension-polyfill';

/**
 * Tab-check helpers: look up the currently active tab (or a specific tab by
 * id) and run it through the redirect decision pipeline. All three functions
 * funnel through `checkTab`, resolving the old TODO at the bottom of
 * redirection.js that asked for "1 single function that checks if tab has url".
 *
 * Using `redirect(..., immediate=true)` means already-loaded tabs skip the
 * pending-intent queue and are evaluated synchronously.
 *
 * @param {object} deps
 * @param {(details: object, immediate: boolean) => Promise<void>} deps.redirect
 */
export function createActiveTabCheck({ redirect }) {
  async function checkTab(tab) {
    if (!tab?.id || !tab?.url) return;
    await redirect({ frameId: 0, url: tab.url, tabId: tab.id }, true);
  }

  async function checkTabById({ tabId }) {
    try {
      const tab = await browser.tabs.get(tabId);
      await checkTab(tab);
    } catch (error) {
      console.log(error.message);
    }
  }

  async function checkActiveTab() {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) await checkTab(tab);
    } catch {}
  }

  return { checkActiveTab, checkTab, checkTabById };
}
