import browser from 'webextension-polyfill';
import { installationSetup, setup } from './services/setupService';
import { handleMessage } from './handlers/messageHandler';
import { handlePortConnect } from './handlers/portHandler';

// Manifest V3: No DOM access, no stray variables

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    installationSetup();
  }
});

browser.runtime.onMessage.addListener(handleMessage);
// Manifest V3: Use runtime.onConnect for port messaging
browser.runtime.onConnect.addListener(handlePortConnect);

// Run setup on service worker start
setup();
