<!-- 
  Time settings for Daily learning goals.
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { SESSION_DURATION_OPTIONS } from '../../../values/defaultSettingValues';
  import browser from "webextension-polyfill";
  import { alertStore } from "../../../services/alertService";

  export let settings;
  export let update;

  let { min: learnMin, sec: learnSec } = settings.learningTime;
  let sessionMinutes;
  let rewardMinutes;
  let minLearningMinutes;

  // Load session and reward settings from storage on mount
  onMount(async () => {
    sessionMinutes = await storage.timeSettings.sessionMinutes.get();
    rewardMinutes = await storage.timeSettings.rewardMinutes.get();
    minLearningMinutes = await storage.timeSettings.learningTime.get();
  });

  // Ensures that the learning time meets the minimum threshold. If the user tries to set a value below the minimum, it will automatically adjust it to the minimum allowed value. This function is called before saving the settings to ensure data integrity.
  function ensureMinThreshold() {
    // Enforce 5-minute minimum for learning time
    if (learnMin < minLearningMinutes) {
      learnMin = minLearningMinutes;
      learnSec = 0;
    }
  }

  // This function saves the learning time settings to storage
  async function setLearningTime() {
    ensureMinThreshold();
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);

    try {
      const result = await browser.runtime.sendMessage({ type: "api:updateLearningTime", learningTimeMinutes: learnMin});
      alertStore.add({
        type: 'success',
        message: "Daily learning goal updated.",
      });
    } catch {
      alertStore.add({ type: 'warning', message: "Could not reach the server, so your change has not been saved in the cloud ☁️." });
    }

    update();
  }

  // Save session duration to storage and backend
  async function setSessionTime() {
    await storage.timeSettings.sessionMinutes.set(sessionMinutes);
    await storage.timeSettings.sessionSeconds.set(0); 

    // Calls API to send the updated session duration to the backend
    try {
      const result = await browser.runtime.sendMessage({ type: "api:updateSessionDuration", sessionDurationMinutes: sessionMinutes});
      alertStore.add({
        type: result?.ok ? 'success' : 'error',
        message: result?.ok ? "Session duration updated." : "Failed to update session duration.",
      });
    } catch {
      alertStore.add({ type: 'warning', message: "Could not reach the server."});
    }
    update();
  }

  // Save reward time to storage and backend
  async function setRewardMinutes() {
    await storage.timeSettings.rewardMinutes.set(rewardMinutes);
    await storage.timeSettings.rewardSeconds.set(0); 

    try {
      const result = await browser.runtime.sendMessage({ type: "api:updateRewardTime", rewardTimeMinutes: rewardMinutes });
      alertStore.add({
        type: result?.ok ? 'success' : 'error',
        message: result?.ok ? "Reward time updated." : "Failed to update reward time.",
      })
    } catch {
      alertStore.add({ type: 'warning', message: "Could not reach the server." });
    }
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
      >
        {#each SESSION_DURATION_OPTIONS as value}
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
          setRewardMinutes();
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

