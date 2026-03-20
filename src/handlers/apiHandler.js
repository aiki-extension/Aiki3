import { loginUser, registerUser, getUserSettings } from "../services/apiService";
import { fetchAndSyncIfChanged, fetchAndSyncSettings } from "../services/settingsService";
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
    
    // Helper function to store settings from DB into local storage on Login (if there is a difference)
    if (validated.ok) {
      await fetchAndSyncIfChanged();
    }

    return validated;
  }

  if (message.type === "api:register") {
    const result = await registerUser({ email: message.email, password: message.password });
    return toTokenResult(result);
  }

  if (message.type === "settings:getUserSettings") {
        const result = await getUserSettings();
        if (!result.ok) {
          return { ok: false, message: result.message, data: null};
        }
        return { ok: true, data: result.data};
    }
}