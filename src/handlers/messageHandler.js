import storage from "./util/storage";
import timer from "./services/TimerManager";
//import api from "./services/apiService";
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
    return (async () => {
      try {
        await timer.sync();
      } catch (_) { }
      const timeData = timer.getTime();
      return { ...timeData, isControlledVariant: false };
    })();
  }


  if (message.type === "learning:autoStart") {
    return (async () => {
      try {
        if (!timer.isLearningSessionActive()) {
          await timer.startLearningSession();
        }
      } catch (_) { }
      return true;
    })();
  }

  if (message.type === "blocker:release" && sender && sender.tab && sender.tab.id !== undefined) {
    storage.blockedTabs.remove(sender.tab.id);
    storage.blockedOrigins.remove(sender.tab.id);
  }


}