import browser from "webextension-polyfill";

function createRewardOverlay({
  registerPersistenceCallback,
  scheduleRewardEnsure,
  makeDraggable,
  createTimerPort,
  formatDuration,
}) {
  function renderProcrastinationRewardOverlay() {
    // Register with unified persistence system
    registerPersistenceCallback(scheduleRewardEnsure);

    // Check if overlay already exists
    if (document.getElementById("aiki-reward-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "aiki-reward-overlay";
    overlay.setAttribute(
      "style",
      `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483644; display: flex; justify-content: flex-end; align-items: flex-start; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
    );

    const panel = document.createElement("div");
    const isCollapsedKey = "aiki-reward-collapsed";
    let isCollapsed = localStorage.getItem(isCollapsedKey) === "true";

    const getPanelStyle = (collapsed, bg = "linear-gradient(135deg, #32CD32, #add8e6)") => `pointer-events: auto; margin: 24px; padding: ${collapsed ? "8px 12px" : "clamp(14px, 2.5vw, 18px)"}; min-width: ${collapsed ? "120px" : "220px"}; max-width: ${collapsed ? "160px" : "280px"}; background: ${bg}; color: #ffffff; border-radius: ${collapsed ? "10px" : "16px"}; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? "4px" : "10px"}; cursor: grab; position: relative; font-size: 13px; transition: all 0.3s ease;`;

    let currentBg = "linear-gradient(135deg, #32CD32, #add8e6)"; 
    panel.setAttribute("style", getPanelStyle(isCollapsed, currentBg));
    const setPanelBackground = (bg) => {
      currentBg = bg;
      panel.style.background = bg;
    };

    // Collapse toggle button
    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = isCollapsed ? "▼" : "▲";
    collapseBtn.setAttribute(
      "style",
      "position: absolute; top: 4px; right: 6px; background: transparent; border: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; font-size: 10px; padding: 4px; transition: color 0.2s;"
    );
    collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.color = "rgba(255, 255, 255, 0.95)"; });
    collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.color = "rgba(255, 255, 255, 0.6)"; });

    const heading = document.createElement("strong");
    heading.textContent = "🎉 Reward time";
    heading.setAttribute("style", `font-size: 0.95em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? "none" : "block"};`);

    const progressLabel = document.createElement("span");
    progressLabel.setAttribute(
      "style",
      `font-size: ${isCollapsed ? "0.9em" : "0.85em"}; color: rgba(255, 255, 255, 0.95); font-weight: ${isCollapsed ? "600" : "400"};`
    );
    progressLabel.textContent = "Syncing...";

    const barShell = document.createElement("div");
    barShell.setAttribute(
      "style",
      `width: 100%; height: ${isCollapsed ? "5px" : "8px"}; border-radius: 999px; background: rgba(255, 255, 255, 0.3); overflow: hidden; transition: height 0.3s ease;`
    );

    const barFill = document.createElement("div");
    barFill.setAttribute(
      "style",
      "width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #16a34a, #22c55e); box-shadow: 0 0 8px rgba(34, 197, 94, 0.35); transition: width 0.4s ease;"
    );
    barShell.appendChild(barFill);

    const status = document.createElement("span");
    status.setAttribute(
      "style",
      `font-size: 0.82em; color: rgba(255, 255, 255, 0.85); display: ${isCollapsed ? "none" : "block"};`
    );
    status.textContent = "Enjoy your break!";

    // Snooze button (hidden initially, shows at 5 seconds remaining)
    const snoozeBtn = document.createElement("button");
    snoozeBtn.textContent = "⏰ +1 Minute";
    snoozeBtn.setAttribute(
      "style",
      "display: none; margin-top: 6px; padding: 10px 16px; background: rgba(255, 255, 255, 0.95); color: #b45309; border: none; border-radius: 10px; font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center;"
    );
    snoozeBtn.addEventListener("mouseenter", () => {
      snoozeBtn.style.transform = "scale(1.02)";
      snoozeBtn.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
    });
    snoozeBtn.addEventListener("mouseleave", () => {
      snoozeBtn.style.transform = "scale(1)";
      snoozeBtn.style.boxShadow = "none";
    });
    snoozeBtn.addEventListener("click", async () => {
      try {
        await browser.runtime.sendMessage({ type: "controlled:snoozeReward" });
        // Hide button after snooze
        snoozeBtn.style.display = "none";
        status.textContent = "Added 1 minute! Enjoy!";
        setPanelBackground("linear-gradient(135deg, #32CD32, #add8e6)");
      } catch (e) {
        console.log("[Aiki] Failed to snooze:", e);
      }
    });

    // Collapse/expand toggle handler
    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      localStorage.setItem(isCollapsedKey, isCollapsed.toString());
      collapseBtn.textContent = isCollapsed ? "▼" : "▲";
      panel.setAttribute("style", getPanelStyle(isCollapsed, currentBg));
      heading.style.display = isCollapsed ? "none" : "block";
      status.style.display = isCollapsed ? "none" : "block";
      barShell.style.height = isCollapsed ? "5px" : "8px";
      progressLabel.style.fontSize = isCollapsed ? "0.9em" : "0.85em";
      progressLabel.style.fontWeight = isCollapsed ? "600" : "400";
      // Hide snooze button when collapsed
      if (isCollapsed && snoozeBtn.style.display !== "none") {
        snoozeBtn.dataset.wasVisible = "true";
        snoozeBtn.style.display = "none";
      } else if (!isCollapsed && snoozeBtn.dataset.wasVisible === "true") {
        snoozeBtn.style.display = "block";
      }
    };
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse();
    });

    panel.appendChild(collapseBtn);
    panel.appendChild(heading);
    panel.appendChild(progressLabel);
    panel.appendChild(barShell);
    panel.appendChild(status);
    panel.appendChild(snoozeBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Use shared drag utility
    const dragHandle = makeDraggable(panel);

    const SNOOZE_WARNING_MS = 10 * 1000;
    let cleanupCalled = false;
    let warningShown = false;
    let experimentalGoal = 0;
    let zeroSampleCount = 0;

    const update = (msg) => {
      if (!msg) return;

      // Support both controlled and experimental variants
      const isControlledReward = msg.controlledRewardGoal > 0;
      let goal;
      let remaining;

      if (isControlledReward) {
        goal = msg.controlledRewardGoal;
        remaining = typeof msg.controlledRewardRemaining === "number" ? msg.controlledRewardRemaining : 0;
      } else {
        // Experimental variant: compute from rewardUnlockAt
        const unlockAt = msg.rewardUnlockAt || 0;
        remaining = Math.max(0, unlockAt - Date.now());
        // Keep a stable goal for progress so the bar fills over time instead of resetting.
        if (remaining > 0) {
          const candidateGoal =
            typeof msg.rewardTimeRemaining === "number" && msg.rewardTimeRemaining > 0
              ? msg.rewardTimeRemaining
              : remaining;
          experimentalGoal = Math.max(experimentalGoal, candidateGoal, remaining);
        }
        goal = experimentalGoal;
      }

      if (remaining > 0) {
        zeroSampleCount = 0;
      }

      if (goal <= 0 && remaining <= 0) {
        zeroSampleCount += 1;
        if (zeroSampleCount < 2) {
          return;
        }
        cleanup();
        return;
      }

      if (!document.getElementById("aiki-reward-overlay")) {
        console.log("[Aiki] Reward overlay missing from DOM, re-rendering...");
        cleanup();
        renderProcrastinationRewardOverlay();
        return;
      }

      const progress = Math.max(0, goal - remaining);
      const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

      barFill.style.width = `${percent}%`;
      progressLabel.textContent = `${formatDuration(remaining)} remaining`;

      if (remaining <= SNOOZE_WARNING_MS && remaining > 0) {
        if (!warningShown) {
          warningShown = true;
          snoozeBtn.style.display = "block";
          heading.textContent = "⚠️ Time's almost up!";
        }
        setPanelBackground("linear-gradient(135deg, #dc2626, #b91c1c)");
        status.textContent = `Returning to productive site in ${Math.ceil(remaining / 1000)} seconds...`;
      } else if (remaining <= 0) {
        zeroSampleCount += 1;
        status.textContent = "Reward time over! Returning to productive site...";
        setPanelBackground("linear-gradient(135deg, #6366f1, #8b5cf6)");
        snoozeBtn.style.display = "none";
        if (zeroSampleCount < 2) {
          return;
        }
        // Timer hit zero. Let background drive the next prompt/redirect and remove this UI.
        cleanup();
        return;
      } else if (remaining < 30000) {
        status.textContent = "Almost time to learn again!";
        if (remaining > SNOOZE_WARNING_MS) {
          warningShown = false;
          snoozeBtn.style.display = "none";
          heading.textContent = "🎉 Reward time";
        }
        setPanelBackground("linear-gradient(135deg, #32CD32, #add8e6)");
      } else {
        status.textContent = "Enjoy your break!";
        warningShown = false;
        snoozeBtn.style.display = "none";
        heading.textContent = "🎉 Reward time";
        setPanelBackground("linear-gradient(135deg, #32CD32, #add8e6)");
      }
    };

    // Use shared timer port utility
    const timerPort = createTimerPort(update);

    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      dragHandle.cleanup();
      timerPort.cleanup();
      try { overlay.remove(); } catch (_) { }
    };

    overlay.cleanup = cleanup;
    window.addEventListener("beforeunload", cleanup, { once: true });
  }

  return renderProcrastinationRewardOverlay;
}

export { createRewardOverlay };
