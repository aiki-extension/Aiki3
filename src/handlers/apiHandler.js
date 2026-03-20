import { loginUser, registerUser, updateOperatingHoursStart, updateUserSettings } from "../services/apiService";

function toTokenResult(result) {
  if (!result.ok) {
    return { ok: false, message: result.message, token: null };
  }
  return { ok: true, message: "", token: result.token ?? null };
}

export async function handleApiMessage(message) {
  if (message.type === "api:login") {
    const result = await loginUser({ email: message.email, password: message.password });
    return toTokenResult(result);
  }

  if (message.type === "api:register") {
    const result = await registerUser({ email: message.email, password: message.password });
    return toTokenResult(result);
  }

  if (message.type === "api:updateOperatingHoursStart") {
    const operatingStartMinutes = message.from.hrs * 60 + message.from.min;
    const result = await updateUserSettings({ operatingStartMinutes });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === "api:updateOperatingHoursEnd") {
    const operatingEndMinutes = message.to.hrs * 60 + message.to.min;
    const result = await updateUserSettings( { operatingEndMinutes });
    return { ok: result.ok, message: result.message };
  }
}