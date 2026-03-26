import { writable } from 'svelte/store';

function createAlertStore() {
  const { subscribe, update } = writable([]);

  return {
    subscribe,
    
    /**
     * Adds a new alert to the store.
     *
     * The alert is displayed immediately and is automatically removed after `time`
     * milliseconds (unless `time` is `0` or less). The store keeps at most 2
     * alerts visible at the same time.
     *
     * @param {{
     *   message?: string,
     *   type?: 'info' | 'success' | 'warning' | 'error',
     *   dismissible?: boolean,
     *   time?: number,
     *   [key: string]: any
     * }} options Alert configuration.
     * @returns {void}
     */
    add: (options) => {
        // Defaults in case some parameters aren't passed
        const alert = {
            id: crypto.randomUUID(),
            type: 'info',
            dismissible: true,
            time: 5000, // 5 seconds default
            ...options
        };

        // Push the new alert to the store
        update(alerts => {
            // Ensure that no more than 2 alerts are displayed at once
            if (alerts.length >= 5 ) {
                alerts = alerts.slice(1);
            }

            return [...alerts, alert];
        });

        // If time > 0, set a timer to auto-remove it
        if (alert.time > 0) {
            setTimeout(() => {
            alertStore.remove(alert.id);
            }, alert.time);
        }
    },
    
    /**
     * Removes a specific alert from the store by its unique ID.
     *
     * @param {string} id The alert ID to remove.
     * @returns {void}
     */
    remove: (id) => {
      update(alerts => alerts.filter(a => a.id !== id));
    }
  };
}

export const alertStore = createAlertStore();