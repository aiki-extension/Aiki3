import browser from 'webextension-polyfill';
import {
  removeOverlay,
  createCollapseButton,
  watchFullscreen,
  applyCollapsedStyle,
  wireCollapseButton,
} from '../shared/overlayHelpers';
import { makeDraggable } from '../shared/makeDraggable';
import { createTimerPort } from '../shared/timerPort';
import { formatDuration, formatDurationShort } from '../shared/formatters';
import {
  debounceEnsure,
  installPersistenceGuards,
} from '../bootstrap/persistenceGuards';

let learningGuardsInstalled = false;

const ensureLearningOverlay = debounceEnsure(() => {
  if (!document.getElementById('aiki-overlay')) {
    renderLearningContent().catch(() => {});
  }
});

function installLearningOverlayPersistence() {
  if (learningGuardsInstalled) return;
  learningGuardsInstalled = true;
  installPersistenceGuards(ensureLearningOverlay, {
    wrapperFlag: '_aikiLearningWrapped',
  });
}

/**
 * Render the floating, draggable learning-session panel. Shows progress
 * toward the session goal, transitions through reward / completion / daily
 * goal-reached states, and offers a Claim Reward button when the session
 * completes without daily goal yet reached.
 *
 * The panel persists collapsed/expanded state in localStorage and re-snaps
 * to the nearest screen corner on collapse-toggle, drag-end, and resize.
 *
 * @returns {Promise<{ action: 'end injection' }>}
 */
export function renderLearningContent() {
  return new Promise((resolve) => {
    try {
      removeOverlay();
    } catch {}

    const overlay = document.createElement('div');
    overlay.id = 'aiki-overlay';
    overlay.className = 'aiki-overlay';
    overlay.setAttribute(
      'style',
      `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483645; display: flex; justify-content: flex-end; align-items: flex-end; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`,
    );

    const panel = document.createElement('div');
    const isCollapsedKey = 'aiki-learning-collapsed';
    let isCollapsed = localStorage.getItem(isCollapsedKey) === 'true';

    const getPanelStyle = (collapsed) =>
      `pointer-events: auto; padding: ${collapsed ? '10px 14px' : 'clamp(16px, 3vw, 22px)'}; min-width: ${collapsed ? '140px' : '260px'}; max-width: ${collapsed ? '180px' : '320px'}; margin: 8px; background: rgba(15, 23, 42, 0.96); color: #f8fafc; border-radius: ${collapsed ? '12px' : '18px'}; box-shadow: 0 24px 45px rgba(15, 23, 42, 0.45); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? '6px' : '12px'}; cursor: grab; position: relative; font-size: 14px; transition: all 0.3s ease;`;

    const stopWatchingFullscreen = watchFullscreen(overlay, panel);

    panel.setAttribute('style', getPanelStyle(isCollapsed));

    const collapseBtn = createCollapseButton(isCollapsed, {
      top: '4px',
      right: '6px',
    });

    const heading = document.createElement('strong');
    heading.textContent = '📚 Learning Session';
    heading.setAttribute(
      'style',
      `font-size: 1em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? 'none' : 'block'};`,
    );

    const progressLabel = document.createElement('span');
    progressLabel.setAttribute(
      'style',
      `font-size: ${isCollapsed ? '0.95em' : '0.9em'}; color: rgba(248, 250, 252, 0.92); font-weight: ${isCollapsed ? '600' : '400'};`,
    );
    progressLabel.textContent = 'Getting things ready...';

    const barShell = document.createElement('div');
    barShell.setAttribute(
      'style',
      `width: 100%; height: ${isCollapsed ? '6px' : '10px'}; border-radius: 999px; background: rgba(148, 163, 184, 0.35); overflow: hidden; transition: height 0.3s ease;`,
    );

    const barFill = document.createElement('div');
    barFill.setAttribute(
      'style',
      'width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(135deg, #22c55e, #14b8a6); transition: width 0.4s ease;',
    );
    barShell.appendChild(barFill);

    const status = document.createElement('span');
    status.setAttribute(
      'style',
      `font-size: 0.88em; color: rgba(248, 250, 252, 0.78); display: ${isCollapsed ? 'none' : 'block'};`,
    );
    status.textContent = 'Stay focused here to earn your time.';

    const claimRewardBtn = document.createElement('button');
    claimRewardBtn.textContent = 'Claim Reward';
    claimRewardBtn.setAttribute(
      'style',
      'display: none; margin-top: 8px; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; border: none; border-radius: 10px; font-size: 0.95em; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center;',
    );
    claimRewardBtn.addEventListener('mouseenter', () => {
      claimRewardBtn.style.transform = 'scale(1.02)';
      claimRewardBtn.style.boxShadow = '0 8px 20px rgba(249, 115, 22, 0.4)';
    });
    claimRewardBtn.addEventListener('mouseleave', () => {
      claimRewardBtn.style.transform = 'scale(1)';
      claimRewardBtn.style.boxShadow = 'none';
    });
    claimRewardBtn.addEventListener('click', async () => {
      try {
        await browser.runtime.sendMessage({ type: 'session:claimReward' });
      } catch (e) {
        console.log('[Aiki] Failed to claim reward:', e);
      }
    });

    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      localStorage.setItem(isCollapsedKey, isCollapsed.toString());
      collapseBtn.textContent = isCollapsed ? '▼' : '▲';

      applyCollapsedStyle(
        panel,
        () => panel.setAttribute('style', getPanelStyle(isCollapsed)),
        dragHandle,
      );

      heading.style.display = isCollapsed ? 'none' : 'block';
      status.style.display = isCollapsed ? 'none' : 'block';
      barShell.style.height = isCollapsed ? '6px' : '10px';
      progressLabel.style.fontSize = isCollapsed ? '0.95em' : '0.9em';
      progressLabel.style.fontWeight = isCollapsed ? '600' : '400';
    };
    wireCollapseButton(collapseBtn, toggleCollapse);

    panel.append(
      collapseBtn,
      heading,
      progressLabel,
      barShell,
      status,
      claimRewardBtn,
    );
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    installLearningOverlayPersistence();

    const dragHandle = makeDraggable(panel);

    const update = (msg) => {
      if (!msg) return;

      const defaultBg = 'rgba(15, 23, 42, 0.96)';

      const sessionRewardGoal =
        typeof msg.sessionRewardGoal === 'number' ? msg.sessionRewardGoal : 0;
      const sessionRewardRemaining =
        typeof msg.sessionRewardRemaining === 'number'
          ? msg.sessionRewardRemaining
          : 0;
      const sessionGoal =
        typeof msg.sessionGoal === 'number' ? msg.sessionGoal : 0;
      const sessionRemaining =
        typeof msg.sessionRemaining === 'number' ? msg.sessionRemaining : 0;
      const sessionCompleted = msg.sessionCompleted || false;

      if (sessionRewardGoal > 0) {
        const progress = Math.max(
          0,
          sessionRewardGoal - sessionRewardRemaining,
        );
        const percent =
          sessionRewardGoal > 0
            ? Math.min(100, (progress / sessionRewardGoal) * 100)
            : 0;

        barFill.style.width = `${percent}%`;
        barFill.style.background =
          'linear-gradient(135deg, #ffffffff, #32CD32)';
        progressLabel.textContent = `${formatDuration(progress)} / ${formatDurationShort(sessionRewardGoal)}`;

        heading.textContent = '🎉 Reward Time';
        status.textContent = `Enjoy! ${formatDuration(sessionRewardRemaining)} remaining.`;
        panel.style.background = 'linear-gradient(135deg, #ADD8E6, #32CD32)';

        claimRewardBtn.style.display = 'none';
      } else if (sessionGoal > 0) {
        const progress = Math.max(0, sessionGoal - sessionRemaining);
        const percent =
          sessionGoal > 0 ? Math.min(100, (progress / sessionGoal) * 100) : 0;

        barFill.style.width = `${percent}%`;
        barFill.style.background = 'linear-gradient(135deg, #22c55e, #14b8a6)';
        heading.textContent = '📚 Learning Session';
        panel.style.background = defaultBg;

        if (sessionRemaining <= 0 || sessionCompleted) {
          progressLabel.textContent = `${formatDuration(sessionGoal)} / ${formatDurationShort(sessionGoal)}`;
          const dailyGoal =
            typeof msg.dailyGoal === 'number' ? msg.dailyGoal : 0;
          const dailyProgress =
            typeof msg.dailyProgress === 'number' ? msg.dailyProgress : 0;

          if (dailyGoal > 0 && dailyProgress >= dailyGoal) {
            heading.textContent = '🎉 Daily Goal Reached!';
            status.textContent =
              'Great work today! Come back tomorrow for more.';
            panel.style.background =
              'linear-gradient(135deg, #22c55e, #0ea5e9)';
            claimRewardBtn.style.display = 'none';
          } else {
            status.textContent = 'Session complete! Claim your reward.';
            panel.style.background =
              'linear-gradient(135deg, #22c55e, #0ea5e9)';
            claimRewardBtn.style.display = 'block';
          }
        } else {
          progressLabel.textContent = `${formatDuration(progress)} / ${formatDurationShort(sessionGoal)}`;
          status.textContent = `Keep going for ${formatDuration(sessionRemaining)} more.`;
          claimRewardBtn.style.display = 'none';
        }
      } else {
        if (msg.dailyGoal > 0 && msg.dailyProgress >= msg.dailyGoal) {
          heading.textContent = '🎉 Daily Goal Reached!';
          progressLabel.textContent = `${formatDuration(msg.dailyProgress)} completed`;
          barFill.style.width = '100%';
          barFill.style.background =
            'linear-gradient(135deg, #22c55e, #14b8a6)';
          status.textContent = 'Great work today! Come back tomorrow for more.';
          panel.style.background = 'linear-gradient(135deg, #22c55e, #0ea5e9)';
        } else {
          heading.textContent = '📚 Aiki Learning';
          progressLabel.textContent = 'Ready to learn';
          barFill.style.width = '0%';
          barFill.style.background =
            'linear-gradient(135deg, #22c55e, #14b8a6)';
          status.textContent = 'Visit a learning site to start a session.';
          panel.style.background = defaultBg;
          claimRewardBtn.style.display = 'none';
        }
      }
    };

    const timerPort = createTimerPort(update);

    let cleanupCalled = false;
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      dragHandle.cleanup();
      timerPort.cleanup();
      try {
        removeOverlay();
      } catch {}
      stopWatchingFullscreen();
    };

    overlay.cleanup = cleanup;
    window.addEventListener('beforeunload', cleanup, { once: true });
    update(null);

    resolve({ action: 'end injection' });
  });
}
