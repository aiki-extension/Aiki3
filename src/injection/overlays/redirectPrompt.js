import { STYLES, applyButtonHoverStyles } from '../shared/styles';
import { removeOverlay } from '../shared/overlayHelpers';

/**
 * Render the modal redirect prompt asking the user whether to continue on the
 * current page or be redirected to the configured learning site.
 *
 * @param {string} originUrl - URL the navigation originated from. Used as a
 *   fallback for the host label if `window.location` is not yet available.
 * @returns {Promise<{ action: 'continue' | 'redirect' }>}
 */
export function renderRedirectPrompt(originUrl) {
  return new Promise((resolve) => {
    let done = false;
    try {
      removeOverlay();
    } catch {}

    const overlay = document.createElement('div');
    overlay.id = 'aiki-overlay';
    overlay.className = 'aiki-overlay';
    overlay.setAttribute(
      'style',
      `${STYLES.overlayBlocking} ${STYLES.fontBase}`,
    );

    const card = document.createElement('div');
    card.setAttribute(
      'style',
      `${STYLES.cardLight} width: min(320px, 92vw); padding: clamp(16px, 3vw, 24px); gap: 18px; text-align: left; ${STYLES.fontBase}`,
    );

    const title = document.createElement('h2');
    title.textContent = 'Redirect to learning?';
    title.setAttribute(
      'style',
      'margin: 0; font-size: clamp(1em, 2vw, 1.35em); font-weight: 700; color: #020617; line-height: 1.3;',
    );

    const getHostFromString = (value) => {
      if (!value || typeof value !== 'string') return '';
      try {
        return new URL(value).hostname || '';
      } catch {
        return '';
      }
    };

    const getCurrentHost = () => {
      try {
        return globalThis.window.location.hostname || '';
      } catch {
        return '';
      }
    };

    let host = getCurrentHost() || getHostFromString(originUrl);

    const description = document.createElement('p');
    const formatDomain = (h) => h.replace(/^www\./, '');
    const updateDescription = (h) => {
      description.innerHTML = '';
      description.appendChild(document.createTextNode("You're visiting "));
      const strong = document.createElement('strong');
      strong.textContent = formatDomain(h);
      description.appendChild(strong);
      description.appendChild(
        document.createTextNode(' Redirect to your learning platform?'),
      );
    };

    updateDescription(host);
    description.setAttribute(
      'style',
      'margin: 0; font-size: clamp(0.95em, 1.5vw, 1.1em); line-height: 1.6; color: #1e293b;',
    );

    const actions = document.createElement('div');
    actions.setAttribute(
      'style',
      'display: flex; gap: 12px; justify-content: flex-end;',
    );

    const buttonLayoutSuffix = `display: flex; justify-content: center; align-items: center; text-align: center;`;

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Stay here';
    applyButtonHoverStyles(
      continueButton,
      `flex: 1; ${STYLES.btnSecondary} ${buttonLayoutSuffix}`,
      `flex: 1; ${STYLES.btnSecondaryHover} ${buttonLayoutSuffix}`,
    );

    const redirectButton = document.createElement('button');
    redirectButton.textContent = 'Redirect';
    applyButtonHoverStyles(
      redirectButton,
      `flex: 1; ${STYLES.btnPrimary} ${buttonLayoutSuffix}`,
      `flex: 1; ${STYLES.btnPrimaryHover} ${buttonLayoutSuffix}`,
    );

    const finalize = (action) => {
      if (done) return;
      done = true;
      if (action !== 'redirect') {
        try {
          removeOverlay();
        } catch {}
      }
      resolve({ action });
    };

    const onPromptKeyDown = (e) => {
      if (done) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        finalize('continue');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        finalize('redirect');
      }
    };

    continueButton.addEventListener('click', () => finalize('continue'));
    redirectButton.addEventListener('click', () => finalize('redirect'));
    document.addEventListener('keydown', onPromptKeyDown, true);

    // Keep host label in sync if the user navigates while the prompt is open.
    let hostWatchInterval = null;
    try {
      hostWatchInterval = setInterval(() => {
        const currentHost = getCurrentHost() || getHostFromString(originUrl);
        if (currentHost && currentHost !== host) {
          host = currentHost;
          updateDescription(host);
        }
      }, 400);
    } catch {}

    actions.appendChild(continueButton);
    actions.appendChild(redirectButton);

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(actions);
    overlay.appendChild(card);

    document.body.appendChild(overlay);
    overlay.cleanup = () => {
      if (done) return;
      done = true;
      if (hostWatchInterval) {
        clearInterval(hostWatchInterval);
        hostWatchInterval = null;
      }
    };
  });
}
