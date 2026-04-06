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
    console.log("[Aiki PromptCoordinator] promptRedirect() — tab:", tabId, "learningUrl:", learningUrl);

    try {
      await this.applyPreemptiveHide(tabId);
      await this.showImmediatePrompt(tabId);
      console.log("[Aiki PromptCoordinator] Sending display:redirectPrompt to tab", tabId);
      let result;
      try {
        result = await browser.tabs.sendMessage(tabId, {
          action: "display: redirectPrompt",
          url: learningUrl,
          originUrl: originUrl,
        });
      } catch (sendError) {
        console.error("[Aiki PromptCoordinator] sendMessage threw:", sendError?.message);
        // Page navigated away mid-flight (e.g. auth redirect). Signal the caller
        // so it can re-queue the intent for when the tab settles.
        if (typeof onConnectionFailed === "function") {
          onConnectionFailed();
        }
        throw sendError;
      }
      console.log("[Aiki PromptCoordinator] sendMessage result:", result);

      if (!result) {
        throw new Error("No response from content script");
      }

      if (result.action === "continue") {
        if (typeof onContinue === "function") {
          await onContinue();
        }
        await this.hideImmediatePrompt(tabId);
        await this.removePreemptiveHide(tabId);
      } else if (result.action === "redirect") {
        if (typeof onAccept === "function") {
          await onAccept();
        }
      }
    } catch (error) {
      await this.hideImmediatePrompt(tabId);
      await this.removePreemptiveHide(tabId);
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
        this.hideImmediatePrompt(details.tabId).catch(() => { });
        this.removePreemptiveHide(details.tabId).catch(() => { });
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
