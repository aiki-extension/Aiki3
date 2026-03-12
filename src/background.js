import setup from "./services/setupService";
import { handleMessage } from "./handlers/messageHandler";
import{ handlePortConnect } from "./handlers/portHandler";
// All logic must be contained within functions or event listeners.


// Manifest V3: No DOM access, no stray variables
// Runs in a service worker context, so we set up event listeners for extension lifecycle and messaging
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    setup.installationSetup();
  }
});

// Manifest V3: Use runtime.onMessage for message handling
// Listen for messages from content scripts and other parts of the extension
browser.runtime.onMessage.addListener(handleMessage);

// Manifest V3: Use runtime.onConnect for port messaging
// Listen for port connections from content scripts and other parts of the extension
browser.runtime.onConnect.addListener(handlePortConnect);

// Run setup on service worker start
setup.setup();
