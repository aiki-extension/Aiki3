import { loginUser, registerUser, getUserSettings } from "../services/apiService";
import { fetchAndSyncSettings } from "../services/settingsService";

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
      try {
        const syncResult = await fetchAndSyncSettings();
        if (!syncResult.ok) {
          console.warn("[Settings] Could not sync settings on login:", syncResult.message);
        }
      } catch (e) {
        console.warn("[Settings] fetchAndSyncSettings crashed: ", e);
      }
    }
    return validated;
  }

  if (message.type === "api:register") {
    const result = await registerUser({ email: message.email, password: message.password });
    return toTokenResult(result);
  }

  if (message.type === "api:getUserSettings") {
        const result = await getUserSettings();
        if (!result.ok) {
          return { ok: false, message: result.message, data: null};
        }
        return { ok: true, data: result};
    }
}