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

  async promptRedirect(tabId, learningUrl, originUrl, callbacks = {}) {
    const { onAccept, onContinue, onConnectionFailed } = callbacks;

  async promptRedirect(tabId, learningUrl, originUrl, callbacks = {}) {
    const { onAccept, onContinue } = callbacks;
    
    try {
      await this.applyPreemptiveHide(tabId);
      await this.showImmediatePrompt(tabId);
      let result;
      try {
        result = await browser.tabs.sendMessage(tabId, {
          action: "display:redirectPrompt",
          url: learningUrl,
          originUrl: originUrl,
        });
      } catch (sendError) {
        if (typeof onConnectionFailed === "function") onConnectionFailed();
        throw sendError;
      }

      if (!result) throw new Error("No response from content script");

      if (result.action === "continue") {
        if (typeof onContinue === "function") await onContinue();
        await this.hideImmediatePrompt(tabId);
        await this.removePreemptiveHide(tabId);
      } else if (result.action === "redirect") {
        if (typeof onAccept === "function") await onAccept();
      }
    } catch (_) {
      await this.hideImmediatePrompt(tabId);
      await this.removePreemptiveHide(tabId);
    }
  }

  async renderContentBlocker(details, callbacks = {}) {
    const { onContinue, onConnectionFailed } = callbacks;
    if (details.frameId === 0) {
      // Check if reward timer is active - if so, don't block
      try {
        const timer = await import("./TimerManager");
        if (timer.default.isSessionRewardActive()) return;
      } catch (_) {}

      storage.blockedTabs.add(details.tabId);
      if (details.url) storage.blockedOrigins.add(details.tabId, details.url);
      storage.promptLocks.remove(details.tabId);

      try {
        await this.applyPreemptiveHide(details.tabId);
        await this.showImmediatePrompt(details.tabId);

        let result;
        try {
          result = await browser.tabs.sendMessage(details.tabId, {
            action: "display:contentBlocker", // request/response prompt
            originUrl: details.url,
          });
        } catch (sendError) {
          if (typeof onConnectionFailed === "function") onConnectionFailed();
          throw sendError;
        }

        if (result?.action === "continue" && typeof onContinue === "function") {
          await onContinue();
        }

        await this.hideImmediatePrompt(details.tabId);
        await this.removePreemptiveHide(details.tabId);
      } catch (_) {
        await this.hideImmediatePrompt(details.tabId);
        await this.removePreemptiveHide(details.tabId);
      }
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