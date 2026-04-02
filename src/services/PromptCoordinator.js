import browser from "webextension-polyfill";
import storage from "../util/storage";

class PromptCoordinator {
  constructor({ applyPreemptiveHide, removePreemptiveHide, showImmediatePrompt, hideImmediatePrompt }) {
    this.applyPreemptiveHide = applyPreemptiveHide;
    this.removePreemptiveHide = removePreemptiveHide;
    this.showImmediatePrompt = showImmediatePrompt;
    this.hideImmediatePrompt = hideImmediatePrompt;
    this.boundRenderContentBlocker = this.renderContentBlocker.bind(this);
    this._promptGenerations = new Map();
  }

  async promptRedirect(tabId, learningUrl, originUrl, callbacks = {}, attempt = 0) {
    const { onAccept, onContinue } = callbacks;

    if (attempt === 0) {
      const gen = (this._promptGenerations.get(tabId) || 0) + 1;
      this._promptGenerations.set(tabId, gen);
    }
    const myGeneration = this._promptGenerations.get(tabId);

    // Return if this retry is stale
    if (attempt > 0 && this._promptGenerations.get(tabId) !== myGeneration) {
      return;
    }

    // Validate tab still exists and is on the intended time wasting site before retrying
    if (attempt > 0) {
      try {
        // If another tab's "Stay" set the global cooldown, abort silently
        const globalLock = await storage.globalPromptLock.get();
        if (globalLock && Date.now() - globalLock.timestamp < 10 * 60 * 1000) {
          await storage.promptLocks.remove(tabId);
          await this.hideImmediatePrompt(tabId).catch(() => {});
          await this.removePreemptiveHide(tabId).catch(() => {});
          return;
        }

        const tab = await browser.tabs.get(tabId);
        if (!tab || !tab.url) {
          // Tab closed mid-prompt then clear the global cooldown so future visits still get prompted
          await storage.globalPromptLock.remove();
          return;
        }

        const currentHost = new URL(tab.url).hostname.replace(/^www\./, "");
        const intendedHost = new URL(originUrl).hostname.replace(/^www\./, "");

        if (currentHost !== intendedHost) {
          await this.hideImmediatePrompt(tabId).catch(() => {});
          await this.removePreemptiveHide(tabId).catch(() => {});
          await storage.globalPromptLock.remove(); // navigated away without answering
          return;
        }
      } catch (_) {
        await storage.globalPromptLock.remove(); // tab closed or invalid
        return;
      }
    }

    // Set a per-tab prompt lock so other tabs see this prompt is already active
    await storage.promptLocks.set(tabId, true);

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

      // Prompt was answered, so clear the per-tab lock either way
      await storage.promptLocks.remove(tabId);

      if (result.action === "continue") {
        if (typeof onContinue === "function") await onContinue();
        await this.hideImmediatePrompt(tabId);
        await this.removePreemptiveHide(tabId);
      } else if (result.action === "redirect") {
        if (typeof onAccept === "function") await onAccept();
      }
    } catch (error) {
      if (attempt < 20) {
        setTimeout(() => {
          if (this._promptGenerations.get(tabId) === myGeneration) {
            this.promptRedirect(
              tabId,
              learningUrl,
              originUrl,
              callbacks,
              attempt + 1
            );
          }
        }, 100);
      } else {
        // Exhausted retries should be treated as abandoned and clear everything
        await storage.promptLocks.remove(tabId);
        await storage.globalPromptLock.remove();
        await this.hideImmediatePrompt(tabId).catch(() => {});
        await this.removePreemptiveHide(tabId).catch(() => {});
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
