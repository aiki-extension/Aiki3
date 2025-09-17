// Controls themes for the application. This is achieved by switching out global CSS variables in global.css
// Currently offers four themes.

// TODO: Put storage functions in storage
import browser from "webextension-polyfill";
const storage = browser.storage.local;

// Lazily resolve the document root style; no-op in service worker.
let root;
function getRoot() {
  if (root) return root;
  if (typeof document === "undefined") return null;
  const el = document.querySelector(":root");
  root = el ? el.style : null;
  return root;
}

/**
 * @function
 * @returns {string} Theme
 * @description  Returns the name of the theme stored in localstorage. */
export async function getTheme() {
  const result = await storage.get("theme");
  return result.theme;
}

/**
 * @function
 * @param {string} theme
 * @description  Sets the theme stored in local storage to the provided theme. */
export function setTheme(theme) {
  storage.set({ theme: theme });
}

/**
 * @function
 * @description  Checks the theme stored in local storage and calls the
 * function required to draw said theme. */
export async function drawTheme() {
  const theme = await getTheme();
  switch (theme) {
    case "dark":
      drawDarkMode();
      break;
    case "light":
      drawLightMode();
      break;
    case "blue":
      drawBlueMode();
      break;
    case "zeeguu":
      drawZeeguuMode();
      break;
    default:
      drawLightMode();
  }
}

/**
 * @function
 * @description  Switches out the global css variables stored in global.css
 * to change the theme of the application to 'Dark'*/
export function drawDarkMode() {
  const r = getRoot();
  if (!r) return;
  r.setProperty("--textColor", "#FFFFFF");
  r.setProperty("--backgroundColorPrimary", "#1F2933");
  r.setProperty("--backgroundColorSecondary", "#323F4B");
  r.setProperty("--borderColor", "#12171D");
  r.setProperty("--bannerTextColor", "#FFFFFF");
  r.setProperty("--bannerBackgroundColor", "#3E4C59");
  r.setProperty("--hrColor", "#616E7C");
  r.setProperty("--footerBackgroundColor", "#3E4C59");
  r.setProperty("--theadBackgroundColor", "#3E4C59");
}

/**
 * @function
 * @description  Switches out the global css variables stored in global.css
 * to change the theme of the application to 'Light'*/
export function drawLightMode() {
  const r = getRoot();
  if (!r) return;
  r.setProperty("--textColor", "#444444");
  r.setProperty("--backgroundColorPrimary", "#f0f2f5");
  r.setProperty("--backgroundColorSecondary", "#FFFFFF");
  r.setProperty("--borderColor", "#AAAAAA");
  r.setProperty("--bannerTextColor", "#FFFFFF");
  r.setProperty("--bannerBackgroundColor", "#282C34");
  r.setProperty("--hrColor", "#D3D3D3");
  r.setProperty("--footerBackgroundColor", "#E8ECF3");
  r.setProperty("--theadBackgroundColor", "#D3D3D3");
}

/**
 * @function
 * @description  Switches out the global css variables stored in global.css
 * to change the theme of the application to 'Blue'*/
export function drawBlueMode() {
  const r = getRoot();
  if (!r) return;
  r.setProperty("--textColor", "#212121");
  r.setProperty("--backgroundColorPrimary", "#F5F6FB");
  r.setProperty("--backgroundColorSecondary", "#FFFFFF");
  r.setProperty("--borderColor", "#EDEDED");
  r.setProperty("--bannerTextColor", "#FFFFFF");
  r.setProperty("--bannerBackgroundColor", "#3366FF");
  r.setProperty("--hrColor", "#EAEAEA");
  r.setProperty("--footerBackgroundColor", "#99B2FF");
  r.setProperty("--theadBackgroundColor", "#EAEAEA");
}

/**
 * @function
 * @description  Switches out the global css variables stored in global.css
 * to change the theme of the application to 'Zeeguu'*/
export function drawZeeguuMode() {
  const r = getRoot();
  if (!r) return;
  r.setProperty("--textColor", "#263238");
  r.setProperty("--backgroundColorPrimary", "#F7F7F7");
  r.setProperty("--backgroundColorSecondary", "#FFFFFF");
  r.setProperty("--borderColor", "#EFEFEF");
  r.setProperty("--bannerTextColor", "#FFFFFF");
  r.setProperty("--bannerBackgroundColor", "#FEBF00");
  r.setProperty("--hrColor", "#EFEFEF");
  r.setProperty("--footerBackgroundColor", "#F2C76B");
  r.setProperty("--theadBackgroundColor", "#F7F7F7");
}
