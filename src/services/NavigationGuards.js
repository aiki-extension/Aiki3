import browser from "webextension-polyfill";
import SessionService from "./SessionService";
import siteDetector from "./siteDetector";
import storage from "../util/storage";
import interventionEngine from "../interventionEngine";
import { isControlled } from "../util/variantConfig";

/**
 * NavigationGuards centralizes tab/window listeners and delegates session handling.
 * A strategy object must be provided with:
 * - handleNavigation(tabId, url): boolean (true if handled)
 * - handleTabClose?(tabId): optional async hook
 * - onLearningSiteNavigation?(details): optional async hook
 */
class NavigationGuards {
  constructor(strategy = null) {
    this.strategy = strategy; // Optional for backward compatibility
    this.lastActiveTabByWindow = new Map();
    this.procrastinationGuardsRegistered = false;
    this.onActivatedHandler = null;
    this.onRemovedHandler = null;
    this.onUpdatedHandler = null;
    this.onCommittedHandler = null;
    this.onFocusChangedHandler = null;
  }

  async startNavigationListener(filterBuilder, handler) {
    this.navigationHandler = handler;
    this.filterBuilder = filterBuilder;
    const filter = await filterBuilder();
    if (!filter) return;
    browser.webNavigation.onBeforeNavigate.addListener(handler, filter);
  }

  async stopNavigationListener() {
    if (this.navigationHandler) {
      browser.webNavigation.onBeforeNavigate.removeListener(this.navigationHandler);
    }
  }

  async restartNavigationListener() {
    await this.stopNavigationListener();
    if (this.navigationHandler && this.filterBuilder) {
      await this.startNavigationListener(this.filterBuilder, this.navigationHandler);
    }
  }

  async maybeStartSessionForTab(tabId) {
    if (tabId === undefined || tabId === null) return;
    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab || !tab.url) return;

      if (await siteDetector.checkIfProcrastination(tab.url)) {
        await SessionService.startSession(tabId, "procrastination", tab.url);
        return;
      }

      if (await siteDetector.checkIfLearning(tab.url)) {
        const origin = await storage.origin.get();
        await SessionService.startSession(tabId, "learning", tab.url, origin?.url || null);
        return;
      }
    } catch (_) {
      // Tab may have been closed or is otherwise inaccessible
    }
  }

  async finalizeAllActiveSessions(reason = "window_blur") {
    if (reason === "extension_disabled") {
      await SessionService.finalizeAllSessions("procrastination", reason);
      await SessionService.finalizeAllSessions("learning", reason);
      return;
    }

    try {
      const tabs = await browser.tabs.query({ active: true });
      for (const tab of tabs) {
        if (tab?.id !== undefined) {
          await SessionService.finalizeSession(tab.id, "procrastination", reason);
          await SessionService.finalizeSession(tab.id, "learning", reason);
        }
      }
    } catch (_) { }
  }

  async handleTabNavigation(tabId, nextUrl) {
    if (!tabId || !nextUrl) return;
    const session = await storage.activeSessions.get(tabId);
    if (!session) return;

    const extractHost = (value) => {
      try {
        return new URL(value || "").hostname.replace(/^www\./, "").toLowerCase();
      } catch (_) {
        return "";
      }
    };

    const nextHost = extractHost(nextUrl);

    if (session.sessionType === "procrastination") {
      const currentHost = extractHost(session.procrastinationUrl);
      if (currentHost && nextHost && currentHost === nextHost) {
        await storage.activeSessions.set(tabId, { ...session, procrastinationUrl: nextUrl });
        await SessionService.syncProcrastinationSessionActivity(tabId);
        return;
      }
      await SessionService.finalizeSession(tabId, "procrastination", "navigation");
      if (await siteDetector.checkIfProcrastination(nextUrl)) {
        await SessionService.startSession(tabId, "procrastination", nextUrl);
      }
      return;
    }

    if (session.sessionType === "learning") {
      const currentHost = extractHost(session.learningUrl);
      if (currentHost && nextHost && currentHost === nextHost) {
        await storage.activeSessions.set(tabId, { ...session, learningUrl: nextUrl });
        await SessionService.syncLearningSessionActivity(tabId);
        return;
      }
      await SessionService.finalizeSession(tabId, "learning", "navigation");
    }
  }

  scheduleRevealOnLoad() {
    // No-op: this hook is retained for prompt rendering compatibility.
  }

  async applyPreemptiveHide() {
    // No-op: preemptive hiding is intentionally disabled.
  }

  async removePreemptiveHide() {
    // No-op: preemptive hiding is intentionally disabled.
  }

  async hideImmediatePrompt(tabId) {
    if (!tabId) return;
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: (overlayId) => {
          const overlay = document.getElementById(overlayId);
          if (overlay && overlay.remove) overlay.remove();
        },
        args: ["__aiki-preprompt"],
      });
    } catch (_) { }
  }

  install() {
    if (this.procrastinationGuardsRegistered) return;
    this.procrastinationGuardsRegistered = true;
    SessionService.reconcileLearningSessions().catch(() => { });
    SessionService.reconcileProcrastinationSessions().catch(() => { });

    this.onActivatedHandler = async ({ tabId, windowId }) => {
      const previousTabId = this.lastActiveTabByWindow.get(windowId);
      this.lastActiveTabByWindow.set(windowId, tabId);

      if (previousTabId !== undefined && previousTabId !== tabId) {
        setTimeout(async () => {
          try {
            await browser.tabs.get(previousTabId);
            await SessionService.finalizeSession(previousTabId, "procrastination", "tab_switch");
            await SessionService.finalizeSession(previousTabId, "learning", "tab_switch");
          } catch {
            // Tab closed; ignore
          }
        }, 50);
      }

      await this.maybeStartSessionForTab(tabId);
    };
    browser.tabs.onActivated.addListener(this.onActivatedHandler);

    this.onRemovedHandler = async (tabId, removeInfo) => {
      // Use interventionEngine for unified tab close handling
      await interventionEngine.handleTabClose(tabId);
      await SessionService.finalizeSession(tabId, "procrastination", "tab_closed");
      await SessionService.finalizeSession(tabId, "learning", "tab_closed");

      if (removeInfo?.windowId !== undefined) {
        const tracked = this.lastActiveTabByWindow.get(removeInfo.windowId);
        if (tracked === tabId) {
          this.lastActiveTabByWindow.delete(removeInfo.windowId);
        }
      }
    };
    browser.tabs.onRemoved.addListener(this.onRemovedHandler);

    this.onUpdatedHandler = async (tabId, changeInfo) => {
      if (changeInfo.url) {
        await this.handleTabNavigation(tabId, changeInfo.url);
      }
      if (changeInfo.status === "complete") {
        await this.hideImmediatePrompt(tabId);
      }
    };
    browser.tabs.onUpdated.addListener(this.onUpdatedHandler);

    this.onCommittedHandler = async (details) => {
      if (details.frameId !== 0) return;
      await this.hideImmediatePrompt(details.tabId);

      // Handle learning site navigation via interventionEngine (controlled variant only).
      if (details.url) {
        const toggled = await storage.redirection.get();
        if (toggled && isControlled()) {
          const procList = await storage.list.get();
          const procHosts = (procList || []).map((item) => item?.host || item?.name || "").filter(Boolean);
          const learningUrl = await storage.learningUri.get();
          if (learningUrl && siteDetector.isLearningSite(details.url, learningUrl)) {
            await interventionEngine.handleNavigation(details.tabId, details.url, procHosts, learningUrl);
          }
        }
      }
    };
    browser.webNavigation.onCommitted.addListener(this.onCommittedHandler);

    this.onFocusChangedHandler = async (windowId) => {
      if (windowId === browser.windows.WINDOW_ID_NONE) {
        await this.finalizeAllActiveSessions("window_blur");
      } else {
        try {
          const tabs = await browser.tabs.query({ active: true, windowId });
          if (tabs.length > 0) {
            const tab = tabs[0];
            if (tab.id !== undefined) {
              await this.maybeStartSessionForTab(tab.id);
            }
          }
        } catch (_) { }
      }
    };
    browser.windows.onFocusChanged.addListener(this.onFocusChangedHandler);
  }

  teardown() {
    if (!this.procrastinationGuardsRegistered) return;
    this.procrastinationGuardsRegistered = false;
    if (this.onActivatedHandler) browser.tabs.onActivated.removeListener(this.onActivatedHandler);
    if (this.onRemovedHandler) browser.tabs.onRemoved.removeListener(this.onRemovedHandler);
    if (this.onUpdatedHandler) browser.tabs.onUpdated.removeListener(this.onUpdatedHandler);
    if (this.onCommittedHandler) browser.webNavigation.onCommitted.removeListener(this.onCommittedHandler);
    if (this.onFocusChangedHandler)
      browser.windows.onFocusChanged.removeListener(this.onFocusChangedHandler);
    this.onActivatedHandler = null;
    this.onRemovedHandler = null;
    this.onUpdatedHandler = null;
    this.onCommittedHandler = null;
    this.onFocusChangedHandler = null;
    this.lastActiveTabByWindow.clear();
  }
}

export default NavigationGuards;
