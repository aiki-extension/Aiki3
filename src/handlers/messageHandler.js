import storage from "../util/storage";
import timer from "../services/TimerManager";
import api from "../services/apiService";
/*
This module handles incoming messages from content scripts and other parts of the extension. 
It processes different message types, such as timer requests, learning session management, and blocker release commands. 
The handler ensures that messages are valid and performs the appropriate actions based on the message type.
*/

export async function handleMessage(message, sender) {

if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "timer:get") {
    try {
    await timer.sync();
    } catch (_) {
        console.warn("[Background] Failed to sync timer on timer:get:", _);
     }
      const timeData = timer.getTime();
      return { ...timeData, isControlledVariant: false };
    };

  if (message.type === "learning:autoStart") {
    try {
    if (!timer.isLearningSessionActive()) {
        await timer.startLearningSession();
    }
    } catch (_) {
        console.warn("[Background] Failed to start learning session on learning:autoStart:", _);
    }
      return true;
    };

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    storage.blockedTabs.remove(sender.tab.id);
    storage.blockedOrigins.remove(sender.tab.id);
  }

  if (message.type === "api:getUserData") {
    try {
      const userData = await api.getUserData();
      return userData;
    } catch (error) {
      console.error("Failed to get user data:", error);
      return { error: "Failed to fetch user data" };
    }
  }
}
