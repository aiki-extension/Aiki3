import browser from 'webextension-polyfill';

/**
 * Open a long-lived port to the background for timer state, plus a 1s polling
 * fallback in case the port message is dropped. Calls `updateCallback` for
 * every state push (port messages, polling responses, and the initial fetch).
 *
 * @param {(msg: any) => void} updateCallback
 * @returns {{ port: any, intervalRef: number, cleanup: () => void }}
 */
export const createTimerPort = (updateCallback) => {
  let port = null;
  let intervalRef = null;
  let cleanupCalled = false;

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    try {
      if (port) port.disconnect();
    } catch {}
    try {
      if (intervalRef) clearInterval(intervalRef);
    } catch {}
  };

  try {
    port = browser.runtime.connect({ name: 'Content Communication' });
    port.onDisconnect.addListener(cleanup);
    port.onMessage.addListener(updateCallback);

    browser.runtime
      .sendMessage({ type: 'timer:get' })
      .then(updateCallback)
      .catch(() => {});

    intervalRef = setInterval(() => {
      try {
        port.postMessage('get: timer');
      } catch {}
    }, 1000);

    try {
      port.postMessage('get: timer');
    } catch {}
  } catch {}

  return { port, intervalRef, cleanup };
};
