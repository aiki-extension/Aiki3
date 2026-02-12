import browser from "webextension-polyfill";

function createLearningOverlay({
  registerPersistenceCallback,
  scheduleLearningEnsure,
  removeOverlay,
  makeDraggable,
  createTimerPort,
  formatDuration,
}) {
  function renderLearningContent() {
    return new Promise((resolve) => {
      try {
        removeOverlay();
      } catch (_) { }

      const overlay = document.createElement("div");
      overlay.id = "aiki-overlay";
      overlay.className = "aiki-overlay";
      overlay.setAttribute(
        "style",
        `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483645; display: flex; justify-content: flex-end; align-items: flex-end; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
      );

      const panel = document.createElement("div");
      const isCollapsedKey = "aiki-learning-collapsed";
      let isCollapsed = localStorage.getItem(isCollapsedKey) === "true";

      const getPanelStyle = (collapsed) => `pointer-events: auto; margin: 24px; padding: ${collapsed ? "10px 14px" : "clamp(16px, 3vw, 22px)"}; min-width: ${collapsed ? "140px" : "260px"}; max-width: ${collapsed ? "180px" : "320px"}; background: rgba(15, 23, 42, 0.96); color: #f8fafc; border-radius: ${collapsed ? "12px" : "18px"}; box-shadow: 0 24px 45px rgba(15, 23, 42, 0.45); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? "6px" : "12px"}; cursor: grab; position: relative; font-size: 14px; transition: all 0.3s ease;`;

      panel.setAttribute("style", getPanelStyle(isCollapsed));

      // Collapse toggle button
      const collapseBtn = document.createElement("button");
      collapseBtn.textContent = isCollapsed ? "▼" : "▲";
      collapseBtn.setAttribute(
        "style",
        "position: absolute; top: 6px; right: 8px; background: transparent; border: none; color: rgba(248, 250, 252, 0.6); cursor: pointer; font-size: 10px; padding: 4px; transition: color 0.2s;"
      );
      collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.color = "rgba(248, 250, 252, 0.95)"; });
      collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.color = "rgba(248, 250, 252, 0.6)"; });

      const heading = document.createElement("strong");
      heading.textContent = "Learning progress";
      heading.setAttribute("style", `font-size: 1em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? "none" : "block"};`);

      const progressLabel = document.createElement("span");
      progressLabel.setAttribute(
        "style",
        `font-size: ${isCollapsed ? "0.95em" : "0.9em"}; color: rgba(248, 250, 252, 0.92); font-weight: ${isCollapsed ? "600" : "400"};`
      );
      progressLabel.textContent = "Getting things ready...";

      const barShell = document.createElement("div");
      barShell.setAttribute(
        "style",
        `width: 100%; height: ${isCollapsed ? "6px" : "10px"}; border-radius: 999px; background: rgba(148, 163, 184, 0.35); overflow: hidden; transition: height 0.3s ease;`
      );

      const barFill = document.createElement("div");
      barFill.setAttribute(
        "style",
        "width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(135deg, #22c55e, #14b8a6); transition: width 0.4s ease;"
      );
      barShell.appendChild(barFill);

      const status = document.createElement("span");
      status.setAttribute(
        "style",
        `font-size: 0.88em; color: rgba(248, 250, 252, 0.78); display: ${isCollapsed ? "none" : "block"};`
      );
      status.textContent = "Stay focused here to earn your time.";

      // Claim Reward button for controlled variant (initially hidden)
      const claimRewardBtn = document.createElement("button");
      claimRewardBtn.textContent = "Continue";
      claimRewardBtn.setAttribute(
        "style",
        "display: none; margin-top: 8px; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; border: none; border-radius: 10px; font-size: 0.95em; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center;"
      );
      claimRewardBtn.addEventListener("mouseenter", () => {
        claimRewardBtn.style.transform = "scale(1.02)";
        claimRewardBtn.style.boxShadow = "0 8px 20px rgba(249, 115, 22, 0.4)";
      });
      claimRewardBtn.addEventListener("mouseleave", () => {
        claimRewardBtn.style.transform = "scale(1)";
        claimRewardBtn.style.boxShadow = "none";
      });
      claimRewardBtn.addEventListener("click", async () => {
        try {
          await browser.runtime.sendMessage({ type: "controlled:claimReward" });
        } catch (e) {
          console.log("[Aiki] Failed to claim reward:", e);
        }
      });

      // Collapse/expand toggle handler
      const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
        localStorage.setItem(isCollapsedKey, isCollapsed.toString());
        collapseBtn.textContent = isCollapsed ? "▼" : "▲";
        panel.setAttribute("style", getPanelStyle(isCollapsed));
        heading.style.display = isCollapsed ? "none" : "block";
        status.style.display = isCollapsed ? "none" : "block";
        barShell.style.height = isCollapsed ? "6px" : "10px";
        progressLabel.style.fontSize = isCollapsed ? "0.95em" : "0.9em";
        progressLabel.style.fontWeight = isCollapsed ? "600" : "400";
        if (isCollapsed && claimRewardBtn.style.display !== "none") {
          claimRewardBtn.dataset.wasVisible = "true";
          claimRewardBtn.style.display = "none";
        } else if (!isCollapsed && claimRewardBtn.dataset.wasVisible === "true") {
          claimRewardBtn.style.display = "block";
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
      panel.appendChild(claimRewardBtn);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      registerPersistenceCallback(scheduleLearningEnsure);

      // Use shared drag utility
      const dragHandle = makeDraggable(panel);
      let experimentalSessionGoal = 0;

      const update = (msg) => {
        if (!msg) return;

        const isControlledVariant = msg.isControlledVariant === true;
        const controlledState = msg.controlledState;
        const defaultBg = "rgba(15, 23, 42, 0.96)";

        if (isControlledVariant) {
          if (controlledState === "learning") {
            const goal = msg.controlledLearningGoal || 0;
            const remaining = typeof msg.controlledLearningRemaining === "number" ? msg.controlledLearningRemaining : 0;
            const elapsed = typeof msg.controlledLearningElapsed === "number" ? msg.controlledLearningElapsed : 0;
            const completed = msg.controlledLearningCompleted || false;
            const progress = Math.max(0, goal - remaining);
            const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

            barFill.style.width = `${percent}%`;
            barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
            heading.textContent = "📚 Learning Session";
            panel.style.background = defaultBg;
            claimRewardBtn.style.display = "none";

            if (goal > 0 && (remaining <= 0 || completed)) {
              progressLabel.textContent = `${formatDuration(elapsed)} / ${formatDuration(goal)}`;
              status.textContent = "Session complete! Claim your reward.";
              panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
              claimRewardBtn.style.display = "block";
            } else if (goal > 0) {
              progressLabel.textContent = `${formatDuration(progress)} / ${formatDuration(goal)}`;
              status.textContent = `Stay focused for ${formatDuration(remaining)} more.`;
            } else {
              progressLabel.textContent = "Starting...";
              status.textContent = "Session starting...";
            }
          } else if (controlledState === "reward") {
            const goal = msg.controlledRewardGoal || 0;
            const remaining = typeof msg.controlledRewardRemaining === "number" ? msg.controlledRewardRemaining : 0;
            const progress = Math.max(0, goal - remaining);
            const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

            barFill.style.width = `${percent}%`;
            barFill.style.background = "linear-gradient(135deg, #ffffffff, #32CD32)";
            progressLabel.textContent = goal > 0 ? `${formatDuration(progress)} / ${formatDuration(goal)}` : "Enjoy!";
            heading.textContent = "🎉 Reward Time";
            status.textContent = goal > 0 ? `Enjoy! ${formatDuration(remaining)} remaining.` : "Your reward time!";
            panel.style.background = "linear-gradient(135deg, #ffffff, #32CD32)";
            claimRewardBtn.style.display = "none";
          } else {
            heading.textContent = "📚 Aiki Learning";
            progressLabel.textContent = "Ready to learn";
            barFill.style.width = "0%";
            barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
            status.textContent = "Visit a procrastination site to start a learning session.";
            panel.style.background = defaultBg;
            claimRewardBtn.style.display = "none";
          }
        } else {
          const remaining = typeof msg.learningTimeRemaining === "number" ? Math.max(0, msg.learningTimeRemaining) : 0;
          const elapsed = typeof msg.sessionElapsed === "number" ? Math.max(0, msg.sessionElapsed) : 0;
          const computedGoal = elapsed + remaining;
          if (computedGoal > 0) {
            experimentalSessionGoal = Math.max(experimentalSessionGoal, computedGoal);
          }

          const goal = computedGoal > 0 ? computedGoal : experimentalSessionGoal;
          const progress = goal > 0 ? Math.max(0, goal - remaining) : 0;
          const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

          barFill.style.width = `${percent}%`;
          barFill.style.background = "linear-gradient(135deg, #22c55e, #14b8a6)";
          progressLabel.textContent = goal > 0 ? `${formatDuration(progress)} / ${formatDuration(goal)}` : "Starting...";
          heading.textContent = "📚 Learning Session";
          claimRewardBtn.style.display = "none";
          panel.style.background = defaultBg;

          if (goal > 0 && remaining === 0) {
            status.textContent = "Session complete! Claim your reward.";
            panel.style.background = "linear-gradient(135deg, #22c55e, #0ea5e9)";
          } else if (goal > 0) {
            status.textContent = `Stay focused for ${formatDuration(remaining)} more.`;
          } else {
            status.textContent = "Session starting...";
          }
        }
      };

      // Use shared timer port utility
      const timerPort = createTimerPort(update);

      let cleanupCalled = false;
      const cleanup = () => {
        if (cleanupCalled) return;
        cleanupCalled = true;
        dragHandle.cleanup();
        timerPort.cleanup();
        try { removeOverlay(); } catch (_) { }
      };

      overlay.cleanup = cleanup;
      window.addEventListener("beforeunload", cleanup, { once: true });
      update(null);

      resolve({ action: "end injection" });
    });
  }

  return renderLearningContent;
}

export { createLearningOverlay };
