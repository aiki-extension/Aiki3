import { loginUser, registerUser, updateUserSettings, getUserSettings, deleteTimeWastingSite } from "../services/apiService";
import storage from "../util/storage";
import { fetchAndSyncSettings } from "../services/settingsService";
import { REWARD_TIME_MINUTES } from "../values/defaultSettingValues";
import { 
  MESSAGE_API_LOGIN,
  MESSAGE_API_REGISTER,
  MESSAGE_API_GET_USER_SETTINGS,
  MESSAGE_API_UPDATE_OPERATING_HOURS_START,
  MESSAGE_API_UPDATE_OPERATING_HOURS_END,
  MESSAGE_API_UPDATE_SESSION_DURATION,
  MESSAGE_API_UPDATE_REWARD_TIME,
  MESSAGE_API_UPDATE_LEARNING_TIME,
  MESSAGE_API_UPDATE_TIME_WASTING_SITE,
  MESSAGE_API_REMOVE_TIME_WASTING_SITE,
  MESSAGE_API_UPDATE_INVITE_CODE
} from "../values/messageTypeValues";
function toTokenResult(result) {
  if (!result.ok) {
    return { ok: false, message: result.message, token: null };
  }
  return { ok: true, message: "", token: result.token ?? null };
}

export async function handleApiMessage(message) {
  const uid = await storage.uid.get();
  if (uid === "guest") {
    return { ok: true, message: "" };
  }

  if (message.type === MESSAGE_API_LOGIN) {
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

  if (message.type === MESSAGE_API_REGISTER) {
    const result = await registerUser({ email: message.email, password: message.password, inviteCode: message.inviteCode });
    return toTokenResult(result);
  }

  if (message.type === MESSAGE_API_GET_USER_SETTINGS) {
        const result = await getUserSettings();
        if (!result.ok) {
          return { ok: false, message: result.message, data: null};
        }
        return { ok: true, data: result};
  }

  if (message.type === MESSAGE_API_UPDATE_INVITE_CODE) {
    const result = await updateUserSettings({ inviteCode: message.inviteCode });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_OPERATING_HOURS_START) {
    const operatingStartMinutes = message.from.hrs * 60 + message.from.min;
    const result = await updateUserSettings({ operatingStartMinutes });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_OPERATING_HOURS_END) {
    const operatingEndMinutes = message.to.hrs * 60 + message.to.min;
    const result = await updateUserSettings( { operatingEndMinutes });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_SESSION_DURATION) {
  const result = await updateUserSettings({ sessionDurationMinutes: message.sessionDurationMinutes });
  return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_REWARD_TIME) {
    const result = await updateUserSettings({ rewardTimeMinutes: message.rewardTimeMinutes });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_LEARNING_TIME) {
    const result = await updateUserSettings( { dailyLearningGoalMinutes: message.learningTimeMinutes });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_UPDATE_TIME_WASTING_SITE) {
    const result = await updateUserSettings({ timeWastingSite: message.site.host });
    return { ok: result.ok, message: result.message };
  }

  if (message.type === MESSAGE_API_REMOVE_TIME_WASTING_SITE) {
    const result = await deleteTimeWastingSite(message.domain);
    return { ok: result.ok, message: result.message };
  }
}