import browser from 'webextension-polyfill';
import storage from '../util/storage';
import { buildTimeWastingUrlFilters } from './shared/siteFilter';

/**
 * Builds the `{url: [{hostSuffix}]}` filter object for
 * `webNavigation.onBeforeNavigate`. Returns null when the list is empty so
 * the caller can skip listener registration.
 */
async function createFilter() {
  const timeWasteList = await storage.list.get();
  const url = buildTimeWastingUrlFilters(timeWasteList || []);
  if (!url.length) return null;
  return { url };
}

/**
 * Owns the navigation/tab/window listener lifecycle — add, remove, and restart
 * wrappers around NavigationGuards. Keeps these thin pass-throughs in one
 * place so the orchestrator (redirection.js) doesn't host eight near-identical
 * wrappers.
 *
 * @param {object} deps
 * @param {object} deps.navigationGuards
 * @param {(details: object, immediate?: boolean) => Promise<void>} deps.redirect
 * @param {(event: {tabId: number}) => Promise<void>} deps.checkTabById
 */
export function createListeners({ navigationGuards, redirect, checkTabById }) {
  async function addNavigationListener() {
    navigationGuards.install();
    await navigationGuards.startNavigationListener(createFilter, redirect);
  }

  async function removeNavigationListener() {
    await navigationGuards.stopNavigationListener();
  }

  async function restartNavigationListener() {
    await navigationGuards.restartNavigationListener();
  }

  function addTabChangeListener() {
    navigationGuards.install();
    browser.tabs.onActivated.addListener(checkTabById);
  }

  function removeTabChangeListener() {
    browser.tabs.onActivated.removeListener(checkTabById);
  }

  function addWindowChangeListener() {
    navigationGuards.install();
  }

  function removeWindowChangeListener() {}

  async function restartWindowChangeListener() {
    navigationGuards.install();
  }

  async function restartTabChangeListener() {
    navigationGuards.install();
  }

  return {
    addNavigationListener,
    removeNavigationListener,
    restartNavigationListener,
    addTabChangeListener,
    removeTabChangeListener,
    restartTabChangeListener,
    addWindowChangeListener,
    removeWindowChangeListener,
    restartWindowChangeListener,
  };
}
