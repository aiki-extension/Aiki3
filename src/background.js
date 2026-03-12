import setup from "./services/setupService";
import { handleMessage } from "./handlers/messageHandler";
import { handlePortConnect } from "./handlers/portHandler";
// All logic must be contained within functions or event listeners.

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    setup.installationSetup();
  }
});

browser.runtime.onMessage.addListener(handleMessage);
browser.runtime.onConnect.addListener(handlePortConnect);

setup.setup();
