<!-- 
  This popup is displayed when the user clicks on the extension icon on the toolbar.
  Used in / Parent components: /src/App.svelte
 -->
<script>
  /* Functional and module imports */
  import browser from "webextension-polyfill";

  /* Components import */
  import Header from "./Components/Popup/Header.svelte";
  import SettingsButton from "./Components/Popup/SettingsButton.svelte";
  import ToggleRedirection from "./Components/Popup/ToggleRedirection.svelte";
  import LearningTimeLeft from "./Components/Popup/LearningTimeLeft.svelte";

  const port = browser.runtime.connect({
  name: "Popup Communication",
  });

  
  // Ignore linter warning for this. Extension window breaks without this promise 
  let timeValues = new Promise((resolve) => {}); // eslint-disable-line

  function sync(res) {
    timeValues = new Promise((resolve) => {
      resolve(res);
    });
  }
  port.onMessage.addListener(function (msg) {
    sync(msg);
  });
  try {
    port.postMessage("get: timer");
  } catch (error) {
    console.error(error);
  }

  setInterval(() => {
    try {
      port.postMessage("get: timer");
    } catch (error) {
      console.error(error);
    }
  }, 1000);


</script>

<main>
  <Header />
  <SettingsButton />
  <hr />
  <ToggleRedirection {port} />
  <hr />
  {#await timeValues}
    LOADING
  {:then values}
    <LearningTimeLeft
      learningTimeRemaining={values.learningTimeRemaining}
      dailyGoal={values.dailyGoal}
      dailyProgress={values.dailyProgress}
      controlledState={values.controlledState || "idle"}
      controlledLearningRemaining={values.controlledLearningRemaining || 0}
      controlledLearningGoal={values.controlledLearningGoal || 0}
      controlledLearningElapsed={values.controlledLearningElapsed || 0}
      controlledLearningCompleted={values.controlledLearningCompleted || false}
      controlledRewardRemaining={values.controlledRewardRemaining || 0}
      controlledRewardGoal={values.controlledRewardGoal || 0}
    />
    <hr />
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
