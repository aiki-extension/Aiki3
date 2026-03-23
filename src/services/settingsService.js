import browser from "webextension-polyfill";
import storage from "../util/storage";
import MESSAGE_API_GET_USER_SETTINGS from "../values/messageTypeValues";

async function syncDBSettingsToLocalStorage(db) {
    await Promise.all([
        storage.timeSettings.sessionMinutes.set(db.sessionDurationMinutes),
        storage.timeSettings.rewardMinutes.set(db.rewardTimeMinutes),
        storage.timeSettings.learningTime.set({ min: db.dailyLearningGoalMinutes, sec: 0}),
        storage.operatingHours.from.set({ hrs: Math.floor(db.operatingStartMinutes / 60), min: db.operatingStartMinutes % 60 }),
        storage.operatingHours.to.set({ hrs: Math.floor(db.operatingEndMinutes / 60), min: db.operatingEndMinutes % 60 }),
    ])
}

// Fetches and syncs without checking (used when logging in)
export async function fetchAndSyncSettings() {
    const result = await browser.runtime.sendMessage({ type: MESSAGE_API_GET_USER_SETTINGS });
    if (!result.ok) return { ok: false, message: result.message };

    await syncDBSettingsToLocalStorage(result.data);
    console.log("[Settings] Synced DB settings to local storage:", result.data);
    return { ok: true };
}