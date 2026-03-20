import { loginUser, registerUser, getUserSettings } from "../services/apiService";
import storage from "../util/storage";

function toTokenResult(result) {
  if (!result.ok) {
    return { ok: false, message: result.message, token: null };
  }
  return { ok: true, message: "", token: result.token ?? null };
}

export async function handleApiMessage(message) {
  if (message.type === "api:login") {
    const result = await loginUser({ email: message.email, password: message.password });
    const validated = toTokenResult(result);
    
          if (validated.ok) {
            // Fetch user settings from DB after login
            const userSettings = await getUserSettings();
            if (userSettings.ok) {
              const db = userSettings.data;
              // Does the writing in parallel instead of sequentally
              await Promise.all([
                storage.timeSettings.sessionMinutes.set(db.sessionDurationMinutes),
                storage.timeSettings.rewardMinutes.set(db.rewardTimeMinutes),
                storage.timeSettings.learningTime.set({ min: db.dailyLearningGoalMinutes, sec: 0}),
                storage.operatingHours.from.set({ hrs: Math.floor(db.operatingStartMinutes / 60), min: db.operatingStartMinutes % 60 }),
                storage.operatingHours.to.set({ hrs: Math.floor(db.operatingEndMinutes / 60), min: db.operatingEndMinutes % 60 }),
              ])
            }
          }
  }

  if (message.type === "api:register") {
    const result = await registerUser({ email: message.email, password: message.password });
    return toTokenResult(result);
  }

  if (message.type === "settings:getUser") {
        const result = await getUserSettings();
        if (!result.ok) {
          return { ok: false, message: result.message, data: null};
        }
        return { ok: true, data: result.data};
    }
}