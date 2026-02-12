function createOverlayPersistence() {
  let persistenceInstalled = false;
  const persistenceCallbacks = new Set();

  const invokePersistenceCallbacks = () => {
    for (const cb of persistenceCallbacks) {
      try { cb(); } catch (_) { }
    }
  };

  const installUnifiedPersistence = () => {
    if (persistenceInstalled) return;
    persistenceInstalled = true;

    // Wrap history methods once for all overlays
    const wrapHistory = (method) => {
      try {
        const original = history[method];
        if (typeof original !== "function" || original._aikiWrapped) return;
        const wrapped = function (...args) {
          const result = original.apply(this, args);
          invokePersistenceCallbacks();
          return result;
        };
        wrapped._aikiWrapped = true;
        history[method] = wrapped;
      } catch (_) { }
    };

    wrapHistory("pushState");
    wrapHistory("replaceState");

    // Single set of event listeners for all overlays
    window.addEventListener("popstate", invokePersistenceCallbacks);
    window.addEventListener("hashchange", invokePersistenceCallbacks);
    window.addEventListener("focus", invokePersistenceCallbacks);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) invokePersistenceCallbacks();
    });
  };

  const registerPersistenceCallback = (callback) => {
    if (typeof callback !== "function") return;
    persistenceCallbacks.add(callback);
    installUnifiedPersistence();
  };

  return {
    registerPersistenceCallback,
    invokePersistenceCallbacks,
  };
}

export { createOverlayPersistence };
