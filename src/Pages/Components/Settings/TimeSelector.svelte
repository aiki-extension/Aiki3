<!-- 
  Time settings for Daily learning goals.
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";

  // Minimum learning time in minutes to ensure users set a reasonable goal. This is enforced both in the UI and programmatically.
  // SET TO 5 WHEN DONE DEBUGGING!
  const MIN_LEARNING_MINUTES = 1;
  export let settings;
  export let update;

  let { min: learnMin, sec: learnSec } = settings.learningTime;
  let sessionMinutes = 5;
  let rewardMinutes = 2;

  // Load session and reward settings from storage on mount
  onMount(async () => {
    sessionMinutes = await storage.sessionSettings.sessionMinutes.get();
    rewardMinutes = await storage.sessionSettings.rewardMinutes.get();
  });

  // Ensure that the learning time does not go below the minimum threshold of 5 minutes. If the user tries to set it below this, it will automatically adjust back
  function ensureMinThreshold() {
    // Enforce 5-minute minimum for learning time
    if (learnMin < MIN_LEARNING_MINUTES) {
      learnMin = MIN_LEARNING_MINUTES;
      learnSec = 0;
    }
  }
  // This function saves the learning time settings to storage
  async function setLearningTime() {
    ensureMinThreshold();
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);
    update();
  }

  // Save session duration to storage
  async function setSessionTime() {
    await storage.sessionSettings.sessionMinutes.set(sessionMinutes);
    await storage.sessionSettings.sessionSeconds.set(0); 
    update();
  }

  // Save reward time to storage
  async function setRewardTime() {
    await storage.sessionSettings.rewardMinutes.set(rewardMinutes);
    await storage.sessionSettings.rewardSeconds.set(0); 
    update();
  }
</script>


<!-- Daily learning goal -->
<div class="row">
  <div class="col-sm">
    <p>Daily learning goal:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <input class="form-control form-control-sm inline placeholder" disabled />
      <p class="placeholder">:</p>
      <input
        type="number"
        id="mins"
        min="2"
        max="119"
        title="Enter a value between 2 and 119"
        bind:value={learnMin}
        on:change={() => {
          learnMin = Math.max(2, Math.min(119, parseInt(learnMin) || 2));
          learnSec = 0;
          ensureMinThreshold();
          setLearningTime();
        }}
        class="form-control form-control-sm inline"
      />
      <p><small>Min&nbsp;&nbsp;&nbsp;&nbsp;</small></p>
    </div>
  </div>
</div>

<!-- Session duration -->
<div class="row" style="margin-top: 1rem;">
  <div class="col-sm">
    <p>Session duration:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <input class="form-control form-control-sm inline placeholder" disabled />
      <p class="placeholder">:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={sessionMinutes}
        on:change={setSessionTime}
        class="custom-select custom-select-sm inline"
      ><!-- 1 ONLY AN OPTION FOR TESTING PURPOSE-->
        {#each [1, 5, 10, 15, 20, 25, 30] as value}
          <option {value}>{value}</option>
        {/each}
      </select>
      <p><small>Min&nbsp;&nbsp;&nbsp;&nbsp;</small></p>
    </div>
  </div>
</div>

<!-- Reward time -->
<div class="row" style="margin-top: 1rem;">
  <div class="col-sm">
    <p>Reward time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <input class="form-control form-control-sm inline placeholder" disabled />
      <p class="placeholder">:</p>
      <input
        type="number"
        id="reward-mins"
        min="1"
        max="60"
        title="Enter a value between 1 and 60"
        bind:value={rewardMinutes}
        on:change={() => {
          rewardMinutes = Math.max(1, Math.min(60, parseInt(rewardMinutes) || 1));
          setRewardTime();
        }}
        class="form-control form-control-sm inline"
      />
      <p><small>Min&nbsp;&nbsp;&nbsp;&nbsp;</small></p>
    </div>
  </div>
</div>

<style>
  .inline {
    display: inline !important;
    width: 25%;
    min-width: 55px;
    margin: 0px 5px 20px 0px;
  }

  .placeholder {
    visibility: hidden;
  }

  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  p {
    display: inline;
    padding: 0;
    margin: 0px 5px 20px 0px;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  select,
  option {
    font-family: var(--fontContent);
    font-size: 0.875rem;
    color: #212121;
  }
</style>

