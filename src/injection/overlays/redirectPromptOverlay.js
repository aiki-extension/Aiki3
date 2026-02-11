import browser from "webextension-polyfill";

function createRedirectPromptOverlay({
  STYLES,
  removeOverlay,
  renderProcrastinationRewardOverlay,
  }) {
  function renderRedirectPrompt(originUrl) {
    return new Promise((resolve) => {
      let isResolved = false;
      let isCleanedUp = false;
      let hostWatchInterval = null;
      const STAY_RENDER_RETRY_MS = 120;
      const STAY_RENDER_MAX_ATTEMPTS = 20;
      try {
        removeOverlay();
      } catch (_) { }

      const overlay = document.createElement("div");
      overlay.id = "aiki-overlay";
      overlay.className = "aiki-overlay";
      overlay.setAttribute(
        "style",
        `${STYLES.overlayBlocking} ${STYLES.fontBase}`
      );

      const card = document.createElement("div");
      card.setAttribute(
        "style",
        `${STYLES.cardLight} width: min(320px, 92vw); padding: clamp(16px, 3vw, 24px); gap: 18px; text-align: left; ${STYLES.fontBase}`
      );

      const title = document.createElement("h2");
      title.textContent = "Redirect to learning?";
      title.setAttribute("style", "margin: 0; font-size: clamp(1em, 2vw, 1.35em); font-weight: 700; color: #020617; line-height: 1.3;");

      const getHostFromString = (value) => {
        if (!value || typeof value !== "string") return "";
        try {
          return new URL(value).hostname || "";
        } catch (_) {
          return "";
        }
      };

      const getCurrentHost = () => {
        try {
          return window.location.hostname || "";
        } catch (_) {
          return "";
        }
      };

      let host = getCurrentHost() || getHostFromString(originUrl);

      const description = document.createElement("p");
      const formatDomain = (h) => h.replace(/^www\./, "");
      const updateDescription = (h) => {
        description.innerHTML = "";
        if (h) {
          description.appendChild(document.createTextNode("You're visiting "));
          const strong = document.createElement("strong");
          strong.textContent = formatDomain(h);
          description.appendChild(strong);
          description.appendChild(document.createTextNode(". Switch to your learning platform?"));
        } else {
          description.textContent = "You've reached a focus site. Do you want to jump to your learning platform?";
        }
      };

      updateDescription(host);
      description.setAttribute(
        "style",
        "margin: 0; font-size: clamp(0.95em, 1.5vw, 1.1em); line-height: 1.6; color: #1e293b;"
      );

      const actions = document.createElement("div");
      actions.setAttribute(
        "style",
        "display: flex; gap: 12px; justify-content: flex-end;"
      );

      const continueButton = document.createElement("button");
      continueButton.textContent = "Stay here";
      const btnSecStyle = `flex: 1; ${STYLES.btnSecondary} display: flex; justify-content: center; align-items: center; text-align: center;`;
      const btnSecHoverStyle = `flex: 1; ${STYLES.btnSecondaryHover} display: flex; justify-content: center; align-items: center; text-align: center;`;
      continueButton.setAttribute("style", btnSecStyle);
      continueButton.onmouseenter = () => continueButton.setAttribute("style", btnSecHoverStyle);
      continueButton.onmouseleave = () => continueButton.setAttribute("style", btnSecStyle);

      const redirectButton = document.createElement("button");
      redirectButton.textContent = "Redirect";
      const btnPriStyle = `flex: 1; ${STYLES.btnPrimary} display: flex; justify-content: center; align-items: center; text-align: center;`;
      const btnPriHoverStyle = `flex: 1; ${STYLES.btnPrimaryHover} display: flex; justify-content: center; align-items: center; text-align: center;`;
      redirectButton.setAttribute("style", btnPriStyle);
      redirectButton.onmouseenter = () => redirectButton.setAttribute("style", btnPriHoverStyle);
      redirectButton.onmouseleave = () => redirectButton.setAttribute("style", btnPriStyle);

      const resolveOnce = (action) => {
        if (isResolved) return;
        isResolved = true;
        resolve({ action });
      };

      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        if (hostWatchInterval) {
          clearInterval(hostWatchInterval);
          hostWatchInterval = null;
        }
      };

      const finalize = (action) => {
        cleanup();
        if (action !== "redirect") {
          try {
            removeOverlay();
          } catch (_) { }
        }
        resolveOnce(action);
      };

      const forceRenderRewardOverlay = (attempt = 0) => {
        if (document.getElementById("aiki-reward-overlay")) return;

        browser.runtime
          .sendMessage({ type: "timer:get" })
          .then((timerData) => {
            const now = Date.now();
            const controlledRewardGoal =
              typeof timerData?.controlledRewardGoal === "number"
                ? timerData.controlledRewardGoal
                : 0;
            const controlledRewardRemaining =
              typeof timerData?.controlledRewardRemaining === "number"
                ? timerData.controlledRewardRemaining
                : 0;
            const rewardUnlockAt =
              typeof timerData?.rewardUnlockAt === "number" ? timerData.rewardUnlockAt : 0;
            const rewardTimeRemaining =
              typeof timerData?.rewardTimeRemaining === "number" ? timerData.rewardTimeRemaining : 0;

            const hasControlledReward =
              controlledRewardGoal > 0 &&
              (controlledRewardRemaining > 0 || rewardUnlockAt > now);
            const hasExperimentalReward = rewardUnlockAt > now || rewardTimeRemaining > 0;

            if (hasControlledReward || hasExperimentalReward) {
              renderProcrastinationRewardOverlay();
              // Re-check quickly in case host page rendering wipes initial mount.
              setTimeout(() => {
                if (!document.getElementById("aiki-reward-overlay")) {
                  renderProcrastinationRewardOverlay();
                }
              }, STAY_RENDER_RETRY_MS);
              return;
            }

            if (attempt < STAY_RENDER_MAX_ATTEMPTS) {
              setTimeout(() => forceRenderRewardOverlay(attempt + 1), STAY_RENDER_RETRY_MS);
            }
          })
          .catch(() => {
            if (attempt < STAY_RENDER_MAX_ATTEMPTS) {
              setTimeout(() => forceRenderRewardOverlay(attempt + 1), STAY_RENDER_RETRY_MS);
            }
          });
      };

      const handleStayHere = () => {
        finalize("continue");
        forceRenderRewardOverlay();
      };

      continueButton.addEventListener("click", handleStayHere);
      redirectButton.addEventListener("click", () => finalize("redirect"));

      // Keep host label in sync if the user navigates while the prompt is open.
      try {
        hostWatchInterval = setInterval(() => {
          const currentHost = getCurrentHost() || getHostFromString(originUrl);
          if (currentHost && currentHost !== host) {
            host = currentHost;
            updateDescription(host);
          }
        }, 400);
      } catch (_) { }

      actions.appendChild(continueButton);
      actions.appendChild(redirectButton);

      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(actions);
      overlay.appendChild(card);

      document.body.appendChild(overlay);
      overlay.cleanup = () => {
        cleanup();
        resolveOnce("continue");
      };
    });
  }

  return renderRedirectPrompt;
}

export { createRedirectPromptOverlay };
