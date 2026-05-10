import browser from 'webextension-polyfill';
import { checkCurrentPageIsTimeWastingSite } from '../shared/hostMatch';
import { makeDraggable } from '../shared/makeDraggable';
import {
  removeOverlay,
  createCollapseButton,
  watchFullscreen,
  applyCollapsedStyle,
  wireCollapseButton,
} from '../shared/overlayHelpers';
import { createTimerPort } from '../shared/timerPort';
import { formatDuration } from '../shared/formatters';
import {
  debounceEnsure,
  installPersistenceGuards,
} from '../bootstrap/persistenceGuards';

let rewardGuardsInstalled = false;

const ensureRewardOverlay = debounceEnsure(async () => {
  let data = null;
  try {
    data = await browser.runtime.sendMessage({ type: 'timer:get' });
  } catch {}
  if (!data || !(data.sessionRewardGoal > 0)) return;
  if (document.getElementById('aiki-reward-overlay')) return;
  if (!(await checkCurrentPageIsTimeWastingSite())) return;
  renderTimeWastingRewardOverlay();
});

function installRewardOverlayPersistence() {
  if (rewardGuardsInstalled) return;
  rewardGuardsInstalled = true;
  installPersistenceGuards(ensureRewardOverlay, {
    wrapperFlag: '_aikiRewardWrapped',
  });
}

/**
 * Render a non-blocking reward-time overlay shown on time-wasting sites
 * during the reward window. Counts down until learning resumes; transitions
 * to a red warning state in the final 5 seconds and a "returning..." state
 * once the timer hits zero.
 *
 * Idempotent: if an overlay with the same id already exists, this returns
 * without rendering a second one.
 */
export function renderTimeWastingRewardOverlay() {
  installRewardOverlayPersistence();

  if (document.getElementById('aiki-reward-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'aiki-reward-overlay';
  overlay.setAttribute(
    'style',
    `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; z-index: 2147483644; display: flex; justify-content: flex-end; align-items: flex-start; font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`,
  );

  const panel = document.createElement('div');
  const isCollapsedKey = 'aiki-reward-collapsed';
  let isCollapsed = localStorage.getItem(isCollapsedKey) === 'true';

  const getPanelStyle = (
    collapsed,
    bg = 'linear-gradient(135deg, #ADD8E6, #32CD32)',
  ) =>
    `pointer-events: auto; margin: 24px; padding: ${collapsed ? '8px 12px' : 'clamp(14px, 2.5vw, 18px)'}; min-width: ${collapsed ? '120px' : '220px'}; max-width: ${collapsed ? '160px' : '280px'}; background: ${bg}; color: #ffffff; border-radius: ${collapsed ? '10px' : '16px'}; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); font-family: 'Inter', 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: ${collapsed ? '4px' : '10px'}; cursor: grab; position: relative; font-size: 13px; transition: all 0.3s ease;`;

  let currentBg = 'linear-gradient(135deg, #ADD8E6, #32CD32)';
  panel.setAttribute('style', getPanelStyle(isCollapsed, currentBg));

  const stopWatchingFullscreen = watchFullscreen(overlay, panel);

  const collapseBtn = createCollapseButton(isCollapsed, {
    color: 'rgba(248, 250, 252, 0.6)',
    hoverColor: 'rgba(248, 250, 252, 0.95)',
  });

  const heading = document.createElement('strong');
  heading.textContent = '🎉 Reward time';
  heading.setAttribute(
    'style',
    `font-size: 0.95em; letter-spacing: 0.01em; font-weight: 600; display: ${isCollapsed ? 'none' : 'block'};`,
  );

  const progressLabel = document.createElement('span');
  progressLabel.setAttribute(
    'style',
    `font-size: ${isCollapsed ? '0.9em' : '0.85em'}; color: rgba(255, 255, 255, 0.95); font-weight: ${isCollapsed ? '600' : '400'};`,
  );
  progressLabel.textContent = 'Syncing...';

  const barShell = document.createElement('div');
  barShell.setAttribute(
    'style',
    `width: 100%; height: ${isCollapsed ? '5px' : '8px'}; border-radius: 999px; background: rgba(255, 255, 255, 0.3); overflow: hidden; transition: height 0.3s ease;`,
  );

  const barFill = document.createElement('div');
  barFill.setAttribute(
    'style',
    'width: 0%; height: 100%; border-radius: inherit; background: #ffffff; transition: width 0.4s ease;',
  );
  barShell.appendChild(barFill);

  const status = document.createElement('span');
  status.setAttribute(
    'style',
    `font-size: 0.82em; color: rgba(255, 255, 255, 0.85); display: ${isCollapsed ? 'none' : 'block'};`,
  );
  status.textContent = 'Enjoy your break!';

  const toggleCollapse = () => {
    isCollapsed = !isCollapsed;
    localStorage.setItem(isCollapsedKey, isCollapsed.toString());
    collapseBtn.textContent = isCollapsed ? '▼' : '▲';

    applyCollapsedStyle(
      panel,
      () => panel.setAttribute('style', getPanelStyle(isCollapsed, currentBg)),
      dragHandle,
    );

    heading.style.display = isCollapsed ? 'none' : 'block';
    status.style.display = isCollapsed ? 'none' : 'block';
    barShell.style.height = isCollapsed ? '5px' : '8px';
    progressLabel.style.fontSize = isCollapsed ? '0.9em' : '0.85em';
    progressLabel.style.fontWeight = isCollapsed ? '600' : '400';
  };
  wireCollapseButton(collapseBtn, toggleCollapse);

  panel.append(collapseBtn, heading, progressLabel, barShell, status);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const dragHandle = makeDraggable(panel);

  let cleanupCalled = false;
  let warningShown = false;

  const update = (msg) => {
    if (!msg) return;
    const goal =
      typeof msg.sessionRewardGoal === 'number' ? msg.sessionRewardGoal : 0;
    const remaining =
      typeof msg.sessionRewardRemaining === 'number'
        ? msg.sessionRewardRemaining
        : 0;

    if (goal <= 0) {
      cleanup();
      return;
    }

    if (!document.getElementById('aiki-reward-overlay')) {
      console.log('[Aiki] Reward overlay missing from DOM, re-rendering...');
      cleanup();
      renderTimeWastingRewardOverlay();
      return;
    }

    const progress = Math.max(0, goal - remaining);
    const percent = goal > 0 ? Math.min(100, (progress / goal) * 100) : 0;

    barFill.style.width = `${percent}%`;
    progressLabel.textContent = `${formatDuration(remaining)} remaining`;

    if (remaining <= 5000 && remaining > 0) {
      if (!warningShown) {
        warningShown = true;
        panel.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        heading.textContent = "⚠️ Time's almost up!";
      }
      status.textContent = `Returning to learning in ${Math.ceil(remaining / 1000)} seconds...`;
    } else if (remaining <= 0) {
      status.textContent = 'Reward time over! Returning to learning...';
      panel.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
      cleanup();
    } else if (remaining < 30000) {
      status.textContent = 'Almost time to learn again!';
      if (remaining > 5000) {
        warningShown = false;
        heading.textContent = '🎉 Reward time';
        panel.style.background = 'linear-gradient(135deg, #ADD8E6, #32CD32)';
      }
    } else {
      status.textContent = 'Enjoy your break!';
      warningShown = false;
      heading.textContent = '🎉 Reward time';
      panel.style.background = 'linear-gradient(135deg, #ADD8E6, #32CD32)';
    }
  };

  const timerPort = createTimerPort(update);

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    dragHandle.cleanup();
    timerPort.cleanup();
    stopWatchingFullscreen();
    try {
      overlay.remove();
    } catch {}
  };

  overlay.cleanup = cleanup;
  window.addEventListener('beforeunload', cleanup, { once: true });
}
