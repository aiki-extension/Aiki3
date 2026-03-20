import { getUserSettings } from "./apiService";
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

export async function fetchAndSyncIfChanged() {
    const result = await getUserSettings();
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

    if (hasChanged) await syncDBSettingsToLocalStorage(db);
    return { ok: true };
    
}