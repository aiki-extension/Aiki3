import browser from "webextension-polyfill";
import storage from "../util/storage";

class PromptCoordinator {
  constructor({ applyPreemptiveHide, removePreemptiveHide, showImmediatePrompt, hideImmediatePrompt }) {
    this.applyPreemptiveHide = applyPreemptiveHide;
    this.removePreemptiveHide = removePreemptiveHide;
    this.showImmediatePrompt = showImmediatePrompt;
    this.hideImmediatePrompt = hideImmediatePrompt;
    this.boundRenderContentBlocker = this.renderContentBlocker.bind(this);
  }

  async promptRedirect(tabId, learningUrl, originUrl, callbacks = {}, attempt = 0) {
    const { onAccept, onContinue } = callbacks;

    // Validate tab still exists and is on the intended time wasting site before retrying
    if (attempt > 0) {
      try {
        const tab = await browser.tabs.get(tabId);
        if (!tab || !tab.url) {
          return; // Tab closed or no URL
        }
        const currentHost = new URL(tab.url).hostname.replace(/^www\./, "");
        const intendedHost = new URL(originUrl).hostname.replace(/^www\./, "");
        if (currentHost !== intendedHost) {
          // Tab navigated away from the time wasting site, abort retries
          await this.hideImmediatePrompt(tabId).catch(() => { });
          await this.removePreemptiveHide(tabId).catch(() => { });
          return;
        }
      } catch (_) {
        return; // Tab closed or invalid
      }
    }

    try {
      await this.applyPreemptiveHide(tabId);
      await this.showImmediatePrompt(tabId);
      const result = await browser.tabs.sendMessage(tabId, {
        action: "display: redirectPrompt",
        url: learningUrl,
        originUrl: originUrl,
      });

      if (!result) {
        throw new Error("No response from content script");
      }

      if (result && result.action === "continue") {
        if (typeof onContinue === "function") {
          await onContinue();
        }
        await this.hideImmediatePrompt(tabId);
        await this.removePreemptiveHide(tabId);
      } else if (result && result.action === "redirect") {
        if (typeof onAccept === "function") {
          await onAccept();
        }
      }
    } catch (error) {
      if (attempt < 20) {
        setTimeout(() => {
          this.promptRedirect(tabId, learningUrl, originUrl, callbacks, attempt + 1);
        }, 100);
      } else {
        await this.hideImmediatePrompt(tabId);
        await this.removePreemptiveHide(tabId);
      }
    }
  }

  async renderContentBlocker(details) {
    if (details.frameId === 0) {
      // Check if reward timer is active - if so, don't block
      try {
        const timer = await import("./TimerManager");
        if (timer.default.isSessionRewardActive()) {
          console.log("[PromptCoordinator] Skipping blocker - reward mode active");
          return;
        }
      } catch (_) { }

      storage.blockedTabs.add(details.tabId);
      if (details.url) {
        storage.blockedOrigins.add(details.tabId, details.url);
      }
      storage.promptLocks.remove(details.tabId);
      try {
        await this.applyPreemptiveHide(details.tabId);
        await this.showImmediatePrompt(details.tabId);
        await browser.tabs.sendMessage(details.tabId, {
          action: "inject blocker",
        });
        setTimeout(() => {
          this.hideImmediatePrompt(details.tabId).catch(() => { });
          this.removePreemptiveHide(details.tabId).catch(() => { });
        }, 150);
      } catch (_) { }
    }
  }

  async removeContentBlocker(tabId) {
    try {
      await this.hideImmediatePrompt(tabId);
      await this.removePreemptiveHide(tabId);
      await storage.blockedOrigins.remove(tabId);
      await storage.blockedTabs.remove(tabId);
      await storage.promptLocks.remove(tabId);
      return browser.tabs.sendMessage(tabId, { action: "remove blocker" }).catch(() => { });
    } catch (_) { }
  }

  async removeAllContentBlockers() {
    const blockedTabs = await storage.blockedTabs.get();
    await Promise.allSettled(blockedTabs.map((tabId) => this.removeContentBlocker(tabId)));
    storage.blockedTabs.clear();
    storage.blockedOrigins.clear();
    storage.promptLocks.clear();
  }

  async addProcsiteLoadedListener(createFilter) {
    const filter = await createFilter();
    if (!filter) return;
    browser.webNavigation.onCompleted.addListener(this.boundRenderContentBlocker, filter);
  }

  removeProcsiteLoadedListener() {
    browser.webNavigation.onCompleted.removeListener(this.boundRenderContentBlocker);
  }
}

export default PromptCoordinator;
