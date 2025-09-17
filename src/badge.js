// Functions to control the badge on the extension toolbar icon.

// Prefer Manifest V3 `chrome.action` API, with fallbacks for older namespaces.
const actionApi = (typeof chrome !== 'undefined' && (chrome.action || chrome.browserAction));

function setText(value) {
  if (actionApi && actionApi.setBadgeText) {
    actionApi.setBadgeText({ text: String(value) });
  }
}

function setBusy() {
  if (actionApi && actionApi.setBadgeBackgroundColor) {
    actionApi.setBadgeBackgroundColor({ color: 'limegreen' });
  }
}

function setDone() {
  if (actionApi && actionApi.setBadgeBackgroundColor) {
    actionApi.setBadgeBackgroundColor({ color: 'deepskyblue' });
  }
}

function remove() {
  if (actionApi && actionApi.setBadgeText) {
    actionApi.setBadgeText({ text: '' });
  }
}

export default {
  setText,
  setBusy,
  setDone,
  remove,
}
  
