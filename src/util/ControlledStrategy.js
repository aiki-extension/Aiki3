import controlledMode from "../controlledMode";
import storage from "../util/storage";
import siteDetector from "../services/siteDetector";
import SessionService from "../services/SessionService";

class ControlledStrategy {
  async handleNavigation(details, helpers = {}) {
    const { tabId, url } = details;
    if (!tabId || !url) return false;

    const { applyPreemptiveHide, removePreemptiveHide, procrastinationHosts, learningUrl } = helpers;

    // Allow procrastination during reward window
    if (controlledMode.isInReward && controlledMode.isInReward()) {
      return true;
    }

    if (applyPreemptiveHide) {
      await applyPreemptiveHide(tabId);
    }

    const handled = await controlledMode.handleNavigation(
      tabId,
      url,
      procrastinationHosts || [],
      learningUrl || ""
    );

    if (!handled && removePreemptiveHide) {
      await removePreemptiveHide(tabId);
    }

    return Boolean(handled);
  }

  async handleTabClose(tabId) {
    await controlledMode.handleTabClose(tabId);
    await SessionService.finalizeSession(tabId, "procrastination", "tab_closed");
    await SessionService.finalizeSession(tabId, "learning", "tab_closed");
  }

  async onLearningSiteNavigation(details) {
    if (details.frameId !== 0) return;

    const toggled = await storage.redirection.get();
    if (!toggled) return;

    const procList = await storage.list.get();
    const procHosts = (procList || []).map((item) => item?.host || item?.name || "").filter(Boolean);
    const learningUrl = await storage.learningUri.get();

    await controlledMode.handleNavigation(details.tabId, details.url, procHosts, learningUrl);
  }
}

export default ControlledStrategy;
