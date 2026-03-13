// alertService.js
import { writable } from 'svelte/store';

function createAlertStore() {
  const { subscribe, update } = writable([]);

  return {
    subscribe,
    
    // Add a new alert
    add: (options) => {
        // Defaults in case some parameters aren't passed
        const alert = {
            id: crypto.randomUUID(),
            type: 'info',
            dismissible: true,
            time: 3000, // 3 seconds default
            ...options
        };

        // Push the new alert to the store
        update(alerts => {
            // Ensure that no more than 2 alerts are displayed at once
            if (alerts.length >= 2 ) {
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
    
    // Remove a specific alert by ID
    remove: (id) => {
      update(alerts => alerts.filter(a => a.id !== id));
    }
  };
}

export const alertStore = createAlertStore();