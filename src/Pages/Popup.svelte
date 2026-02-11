<!-- 
  This popup is displayed when the user clicks on the extension icon on the toolbar.
  Used in / Entry: /src/main.js
 -->
<script>
  /* Functional and module imports */
  import { onDestroy } from "svelte";
  import { parseUrl } from "../util/utilities";
  import storage from "../util/storage";
  import browser from "webextension-polyfill";

  /* Components import */
  import Header from "./Components/Popup/Header.svelte";
  import SettingsButton from "./Components/Popup/SettingsButton.svelte";
  import ToggleRedirection from "./Components/Popup/ToggleRedirection.svelte";
  import ContinueButton from "./Components/Popup/ContinueButton.svelte";
  import LearningTimeLeft from "./Components/Popup/LearningTimeLeft.svelte";

  const port = browser.runtime.connect({
    name: "Popup Communication",
  });
  let timerPollInterval = null;

  let siteName = "";
  let origin = {};

  let timeValues = new Promise((resolve) => {});

  function sync(res) {
    timeValues = new Promise((resolve) => {
      resolve(res);
    });
  }
  const onPortMessage = function (msg) {
    sync(msg);
  };
  port.onMessage.addListener(onPortMessage);

  function requestTimerUpdate() {
    try {
      port.postMessage("get: timer");
    } catch (error) {
      console.error(error);
    }
  }

  requestTimerUpdate();
  timerPollInterval = setInterval(requestTimerUpdate, 1000);

  onDestroy(() => {
    if (timerPollInterval) {
      clearInterval(timerPollInterval);
      timerPollInterval = null;
    }
    try {
      port.onMessage.removeListener(onPortMessage);
    } catch (_) { }
    try {
      port.disconnect();
    } catch (_) { }
  });

  async function setup() {
    origin = await storage.origin.get();
  }

  $: if (origin) {
    if (origin.url) {
      siteName = parseUrl(origin.url).name;
    }
  }

  /**
   * @function
   * @description Sends a message to the background script for intepretation.
   * Background script will initiate a tab update on the tab that triggered a redirection,
   * restoring the origin uri.
   */
  function gotoOrigin(type) {
    try {
      port.postMessage("goto: origin: " + type);
      origin = {};
      // port.postMessage("get: timer");
      location.reload();
    } catch (error) {
      console.error(error);
    }
  }

  setup();
</script>

<main>
  <Header />
  <SettingsButton />
  <hr />
  <ToggleRedirection />
  <hr />
  {#await timeValues}
    LOADING
  {:then values}
    <LearningTimeLeft
      dailyGoal={values.dailyGoal}
      dailyProgress={values.dailyProgress}
    />
    <hr />
    {#if siteName !== "" || (values.controlledState === "learning" && values.controlledProcrastinationUrl)}
      <div class="container">
        <ContinueButton {gotoOrigin} />
      </div>
      <hr />
    {/if}
  {/await}
</main>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
  }

  hr {
    color: var(--hrColor);
    background-color: var(--hrColor);
    height: 1px;
    border-width: 0;
    width: 90%;
    margin: 10px 10px;
  }

  main {
    font-family: var(--fontHeaders);
    background-color: var(--backgroundColorSecondary);
    color: var(--textColor);
    text-align: center;
    height: fit-content;
    width: 220px;
  }
</style>
