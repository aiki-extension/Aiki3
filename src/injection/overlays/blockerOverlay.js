import browser from "webextension-polyfill";

function createBlockerOverlay({
  removeOverlay,
  createTimerPort,
  formatDuration,
}) {
  function renderContentBlocker() {
    try {
      removeOverlay();
    } catch (_) { }

    const overlay = document.createElement("div");
    overlay.id = "aiki-overlay";
    overlay.className = "aiki-overlay";
    overlay.setAttribute(
      "style",
      `all: initial; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.98); display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: clamp(16px, 4vw, 28px); font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`
    );

    const card = document.createElement("div");
    card.setAttribute(
      "style",
      `width: min(420px, 92vw); max-width: 420px; min-width: 300px; border-radius: 22px; background: rgba(15, 23, 42, 0.98); color: #f8fafc; box-shadow: 0 32px 70px rgba(15, 23, 42, 0.55); display: flex; flex-direction: column; gap: 18px; padding: clamp(22px, 3.5vw, 28px); font-family: 'Inter', 'Segoe UI', sans-serif;`
    );

    const title = document.createElement("h2");
    title.textContent = "Keep learning";
    title.setAttribute("style", "margin: 0; font-size: clamp(1.15em, 1vw + 0.65em, 1.45em); font-weight: 700; letter-spacing: 0.01em; color: #f8fafc;");

    const description = document.createElement("p");
    description.textContent = "You're mid-session. Head back to your focus site to keep building momentum.";
    description.setAttribute("style", "margin: 0; font-size: clamp(0.9em, 1vw + 0.4em, 1.05em); line-height: 1.6; color: rgba(241, 245, 249, 0.9);");

    const progressLabel = document.createElement("span");
    progressLabel.setAttribute("style", "font-size: clamp(0.9em, 1vw + 0.35em, 1.05em); color: rgba(241, 245, 249, 0.88);");
    progressLabel.textContent = "Syncing progress...";

    const barShell = document.createElement("div");
    barShell.setAttribute("style", "width: 100%; height: 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.3); overflow: hidden;");

    const barFill = document.createElement("div");
    barFill.setAttribute(
      "style",
      "width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(135deg, #22c55e, #14b8a6); transition: width 0.3s ease;"
    );
    barShell.appendChild(barFill);

    const status = document.createElement("span");
    status.setAttribute("style", "font-size: clamp(0.85em, 1vw + 0.3em, 1em); color: rgba(241, 245, 249, 0.78);");
    status.textContent = "Stay focused a little longer to unlock breaks.";

    const actions = document.createElement("div");
    actions.setAttribute("style", "display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;");

    const continueButton = document.createElement("button");
    continueButton.textContent = "Visit site anyway";
    continueButton.setAttribute(
      "style",
      `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #f9fafb; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
    );
    continueButton.onmouseenter = () =>
      continueButton.setAttribute(
        "style",
        `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(56,189,248,0.7); background: rgba(56,189,248,0.15); color: #e0f2fe; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
      );
    continueButton.onmouseleave = () =>
      continueButton.setAttribute(
        "style",
        `padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #f9fafb; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`
      );

    const button = document.createElement("button");
    button.textContent = "Return to learning";
    button.setAttribute(
      "style",
      `padding: 10px 16px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; border-radius: 999px; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(37, 99, 235, 0.28);`
    );

    actions.appendChild(continueButton);
    actions.appendChild(button);

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(progressLabel);
    card.appendChild(barShell);
    card.appendChild(status);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let blockerSessionGoal = 0;
    const update = (msg) => {
      if (!msg) return;

      const controlledGoal =
        typeof msg.controlledLearningGoal === "number" ? Math.max(0, msg.controlledLearningGoal) : 0;
      const controlledRemaining =
        typeof msg.controlledLearningRemaining === "number"
          ? Math.max(0, msg.controlledLearningRemaining)
          : 0;
      const controlledElapsed =
        typeof msg.controlledLearningElapsed === "number"
          ? Math.max(0, msg.controlledLearningElapsed)
          : 0;
      const controlledCompleted = msg.controlledLearningCompleted === true;

      let goal = 0;
      let remaining = 0;
      let progress = 0;
      let completed = false;

      if (controlledGoal > 0 || msg.controlledState === "learning") {
        goal = controlledGoal;
        remaining = controlledRemaining;
        progress = goal > 0 ? Math.max(0, goal - remaining) : controlledElapsed;
        completed = controlledCompleted || (goal > 0 && remaining === 0);
      } else {
        remaining =
          typeof msg.learningTimeRemaining === "number" ? Math.max(0, msg.learningTimeRemaining) : 0;
        const elapsed =
          typeof msg.sessionElapsed === "number" ? Math.max(0, msg.sessionElapsed) : 0;
        const computedGoal = elapsed + remaining;
        if (computedGoal > 0) {
          blockerSessionGoal = Math.max(blockerSessionGoal, computedGoal);
        }
        goal = computedGoal > 0 ? computedGoal : blockerSessionGoal;
        progress = goal > 0 ? Math.max(0, goal - remaining) : elapsed;
        completed = goal > 0 && remaining === 0;
      }

      const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

      barFill.style.width = `${percent}%`;
      progressLabel.textContent =
        goal > 0 ? `${formatDuration(progress)} / ${formatDuration(goal)}` : "Syncing session...";

      if (completed) {
        status.textContent = "Session complete! Claim your reward.";
      } else if (goal > 0) {
        status.textContent = `Keep going for ${formatDuration(remaining)} more.`;
      } else {
        status.textContent = "Session starting...";
      }
    };

    // Use shared timer port utility
    const timerPort = createTimerPort(update);

    let cleanupCalled = false;
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      timerPort.cleanup();
      try { overlay.remove(); } catch (_) { }
    };

    overlay.cleanup = cleanup;

    continueButton.addEventListener("click", async () => {
      try { await browser.runtime.sendMessage({ type: "blocker:release" }); } catch (_) { }
      cleanup();
    });

    button.addEventListener("click", async () => {
      try {
        const result = await browser.storage.local.get("learningUri");
        const uri = result && typeof result.learningUri === "string" ? result.learningUri.trim() : "";
        if (uri) {
          location.href = uri;
          return;
        }
      } catch (_) { }

      try {
        if (timerPort.port) {
          timerPort.port.postMessage("goto: originTab");
        } else {
          const keepAlive = browser.runtime.connect({ name: "Content Communication" });
          keepAlive.postMessage("goto: originTab");
          setTimeout(() => { try { keepAlive.disconnect(); } catch (_) { } }, 150);
        }
      } catch (_) { }
    });
  }

  return renderContentBlocker;
}

export { createBlockerOverlay };
