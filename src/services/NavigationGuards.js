import browser from 'webextension-polyfill';
import SessionService from './SessionService';
import siteDetector from './siteDetector';
import storage from '../util/storage';
import PreemptiveHide from './PreemptiveHide';

class NavigationGuards {
  constructor() {
    this.lastActiveTabByWindow = new Map();
    this.timeWastingGuardsRegistered = false;
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
      browser.webNavigation.onBeforeNavigate.removeListener(
        this.navigationHandler,
      );
    }
  }

  async restartNavigationListener() {
    await this.stopNavigationListener();
    if (this.navigationHandler && this.filterBuilder) {
      await this.startNavigationListener(
        this.filterBuilder,
        this.navigationHandler,
      );
    }
  }

  async maybeStartSessionForTab(tabId) {
    if (tabId === undefined || tabId === null) return;
    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab?.url) return;

      if (await siteDetector.checkIfTimeWastingSite(tab.url)) {
        await SessionService.startSession(tabId, 'timeWasting', tab.url);
        return;
      }

      if (await siteDetector.checkIfLearning(tab.url)) {
        const origin = await storage.origin.get();
        await SessionService.startSession(
          tabId,
          'learning',
          tab.url,
          origin?.url || null,
        );
        return;
      }
    } catch {
      // Tab may have been closed or is otherwise inaccessible
    }
  }

  async finalizeAllActiveSessions(reason = 'window_blur') {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      for (const tab of tabs) {
        if (tab?.id !== undefined) {
          await SessionService.finalizeSession(tab.id, 'timeWasting', reason);
          await SessionService.finalizeSession(tab.id, 'learning', reason);
        }
      }
    } catch {}
  }

  async handleTabNavigation(tabId, nextUrl) {
    if (!tabId || !nextUrl) return;
    const session = await storage.activeSessions.get(tabId);
    if (!session) return;

    const extractName = (value) => {
      try {
        return siteDetector.getSiteName(value || '');
      } catch {
        return '';
      }
    };

    const nextName = extractName(nextUrl);

    if (session.sessionType === 'timeWasting') {
      const currentName = extractName(session.timeWastingUrl);
      if (currentName && nextName && currentName === nextName) {
        await storage.activeSessions.set(tabId, {
          ...session,
          timeWastingUrl: nextUrl,
        });
        return;
      }
      await SessionService.finalizeSession(tabId, 'timeWasting', 'navigation');
      return;
    }

    if (session.sessionType === 'learning') {
      const currentName = extractName(session.learningUrl);
      if (currentName && nextName && currentName === nextName) {
        await storage.activeSessions.set(tabId, {
          ...session,
          learningUrl: nextUrl,
        });
        return;
      }
      await SessionService.finalizeSession(tabId, 'learning', 'navigation');
    }
  }

  scheduleRevealOnLoad(tabId) {
    PreemptiveHide.scheduleReveal(tabId);
  }

  async applyPreemptiveHide(tabId) {
    return PreemptiveHide.apply(tabId);
  }

  async removePreemptiveHide(tabId) {
    return PreemptiveHide.remove(tabId);
  }

  async hideImmediatePrompt(tabId) {
    if (!tabId) return;
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: (overlayId) => {
          const overlay = document.getElementById(overlayId);
          if (overlay?.remove) overlay.remove();
        },
        args: ['__aiki-preprompt'],
      });
    } catch {}
  }

  install() {
    if (this.timeWastingGuardsRegistered) return;
    this.timeWastingGuardsRegistered = true;

    this.onActivatedHandler = async ({ tabId, windowId }) => {
      const previousTabId = this.lastActiveTabByWindow.get(windowId);
      this.lastActiveTabByWindow.set(windowId, tabId);

      if (previousTabId !== undefined && previousTabId !== tabId) {
        setTimeout(async () => {
          try {
            await browser.tabs.get(previousTabId);
            await SessionService.finalizeSession(
              previousTabId,
              'timeWasting',
              'tab_switch',
            );
            await SessionService.finalizeSession(
              previousTabId,
              'learning',
              'tab_switch',
            );
          } catch {
            // Tab closed; ignore
          }
        }, 50);
      }

      await this.maybeStartSessionForTab(tabId);
    };
    browser.tabs.onActivated.addListener(this.onActivatedHandler);

    this.onRemovedHandler = async (tabId, removeInfo) => {
      await SessionService.finalizeSession(tabId, 'timeWasting', 'tab_closed');
      await SessionService.finalizeSession(tabId, 'learning', 'tab_closed');

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
      if (changeInfo.status === 'complete') {
        await PreemptiveHide.revealIfPending(
          tabId,
          this.hideImmediatePrompt.bind(this),
        );
      }
    };
    browser.tabs.onUpdated.addListener(this.onUpdatedHandler);

    this.onCommittedHandler = async (details) => {
      if (details.frameId !== 0) return;
      await PreemptiveHide.revealIfPending(
        details.tabId,
        this.hideImmediatePrompt.bind(this),
      );
    };
    browser.webNavigation.onCommitted.addListener(this.onCommittedHandler);

    this.onFocusChangedHandler = async (windowId) => {
      if (windowId === browser.windows.WINDOW_ID_NONE) {
        await this.finalizeAllActiveSessions('window_blur');
      } else {
        try {
          const tabs = await browser.tabs.query({ active: true, windowId });
          if (tabs.length > 0) {
            const tab = tabs[0];
            if (tab.id !== undefined) {
              await this.maybeStartSessionForTab(tab.id);
            }
          }
        } catch {}
      }
    };
    browser.windows.onFocusChanged.addListener(this.onFocusChangedHandler);
  }

  teardown() {
    if (!this.timeWastingGuardsRegistered) return;
    this.timeWastingGuardsRegistered = false;
    if (this.onActivatedHandler)
      browser.tabs.onActivated.removeListener(this.onActivatedHandler);
    if (this.onRemovedHandler)
      browser.tabs.onRemoved.removeListener(this.onRemovedHandler);
    if (this.onUpdatedHandler)
      browser.tabs.onUpdated.removeListener(this.onUpdatedHandler);
    if (this.onCommittedHandler)
      browser.webNavigation.onCommitted.removeListener(this.onCommittedHandler);
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
