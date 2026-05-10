import NavigationGuards from './services/NavigationGuards';
import { createPromptControl } from './redirection/promptControl';
import { createLearningResource } from './redirection/learningResource';
import { createOriginTracking } from './redirection/originTracking';
import { createRestoreFlow } from './redirection/restoreFlow';
import { createRedirectFlow } from './redirection/redirectFlow';
import { createActiveTabCheck } from './redirection/activeTabCheck';
import { createListeners } from './redirection/listeners';

const navigationGuards = new NavigationGuards();
const promptControl = createPromptControl({ navigationGuards });

const learningResource = createLearningResource({
  navigationGuards,
  gotoOrigin: (event, context) => gotoOrigin(event, context),
});
const {
  addLearningSiteLoadedListener,
  removeLearningSiteLoadedListener,
  triggerLearningOverlay,
} = learningResource;

const originTracking = createOriginTracking({
  promptControl,
  triggerLearningOverlay,
});
const {
  addOriginUpdatedListener,
  removeOriginUpdatedListener,
  addOriginTabCloseListener,
  removeOriginTabCloseListener,
} = originTracking;

const restoreFlow = createRestoreFlow({
  promptControl,
  removeOriginUpdatedListener,
  getCheckActiveTab: () => checkActiveTab,
});
const { gotoOrigin } = restoreFlow;

const redirectFlow = createRedirectFlow({
  navigationGuards,
  promptControl,
  addLearningSiteLoadedListener,
  addOriginUpdatedListener,
  triggerLearningOverlay,
  getCheckActiveTab: () => checkActiveTab,
});
const { redirect, dispatchPrompt } = redirectFlow;

const { checkActiveTab, checkTabById } = createActiveTabCheck({ redirect });

const {
  addNavigationListener,
  removeNavigationListener,
  restartNavigationListener,
  addTabChangeListener,
  removeTabChangeListener,
  restartTabChangeListener,
  addWindowChangeListener,
  removeWindowChangeListener,
  restartWindowChangeListener,
} = createListeners({ navigationGuards, redirect, checkTabById });

const finalizeAllActiveSessions = (reason = 'window_blur') =>
  navigationGuards.finalizeAllActiveSessions(reason);

export default {
  start: async () => {
    navigationGuards.install();
    await addNavigationListener();
    addTabChangeListener();
    addWindowChangeListener();
    addOriginTabCloseListener();
  },
  stop: async () => {
    await removeNavigationListener();
    navigationGuards.teardown();
    removeTabChangeListener();
    removeOriginTabCloseListener();
    removeLearningSiteLoadedListener();
    await promptControl.removeAllContentBlockers();
  },
  restart: async () => {
    await Promise.allSettled([
      removeNavigationListener(),
      promptControl.removeAllContentBlockers(),
    ]);
    navigationGuards.teardown();
    removeTabChangeListener();
    removeOriginTabCloseListener();
    removeLearningSiteLoadedListener();
    await addNavigationListener();
    addTabChangeListener();
    addWindowChangeListener();
    addOriginTabCloseListener();
  },
  navigationListener: {
    start: addNavigationListener,
    stop: removeNavigationListener,
    restart: restartNavigationListener,
  },
  tabChangeListener: {
    start: addTabChangeListener,
    stop: removeTabChangeListener,
    restart: restartTabChangeListener,
  },
  windowChangeListener: {
    start: addWindowChangeListener,
    stop: removeWindowChangeListener,
    restart: restartWindowChangeListener,
  },
  gotoOrigin,
  addOriginTabCloseListener,
  removeLearningSiteLoadedListener,
  checkActiveTab,
  finalizeAllActiveSessions,
  onContentScriptReady: promptControl.onContentScriptReady,
  dispatchPrompt,
};
