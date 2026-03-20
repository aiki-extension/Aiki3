import browser from "webextension-polyfill";
import storage from "../util/storage";

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
    const result = await browser.runtime.sendMessage({ type: "api:getUserSettings" });
    if (!result.ok) return { ok: false, message: result.message };

    await syncDBSettingsToLocalStorage(result.data);
    console.log("[Settings] Synced DB settings to local storage:", result.data);
    return { ok: true };
}

// Fetches and syncs if there is a difference between local storage and DB (it always picks DB in this case)
export async function fetchAndSyncIfChanged() {
    const result = await browser.runtime.sendMessage({ type: "api:getUserSettings" });
    if (!result.ok) return { ok: false, message: result.message };

    const db = result.data;
    const [localSessionMinutes, localRewardMinutes, localLearningTime, localFrom, localTo] = 
    await Promise.all([
        storage.timeSettings.sessionMinutes.get(),
        storage.timeSettings.rewardMinutes.get(),
        storage.timeSettings.learningTime.get(),
        storage.operatingHours.from.get(),
        storage.operatingHours.to.get(),
    ]);

    const hasChanged =
        localSessionMinutes !== db.sessionDurationMinutes ||
        localRewardMinutes !== db.rewardTimeMinutes ||
        localLearningTime.min !== db.dailyLearningGoalMinutes ||
        localFrom.hrs !== Math.floor(db.operatingStartMinutes / 60) ||
        localFrom.min !== db.operatingStartMinutes % 60 ||
        localTo.hrs !== Math.floor(db.operatingEndMinutes / 60) ||
        localTo.min !== db.operatingEndMinutes % 60;

    if (hasChanged) {
        await syncDBSettingsToLocalStorage(db);
        console.log("[Settings] Settings changed, updated local storage with:", db);
        return { ok: true, changed: true };
    } else {
        console.log("[Settings] Settings unchanged, no update needed");
    }
    return { ok: true, changed: false };
    
}