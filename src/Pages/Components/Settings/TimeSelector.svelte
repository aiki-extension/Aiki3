<!-- 
  Time settings for learning goals.
  For controlled variant, shows session-based learning and reward time.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { AIKI_VARIANT } from "../../../util/variant";

  let minuteOptions = Array.from({ length: 121 }, (_, i) => i); // 0 - 120 minutes
  let secondsOptions = Array.from({ length: 60 }, (_, i) => i); // 
  
  // Minimum learning time for experimental variant: 2 minutes
  const MIN_LEARNING_MINUTES_EXP = 2;
  export let settings;
  export let update;

  let { min: learnMin, sec: learnSec } = settings.learningTime;
  
  // Controlled variant detection using imported config
  const isControlledVariant = AIKI_VARIANT === "controlled";
  let controlledLearningMinutes = 5;
  let controlledLearningSeconds = 0;
  let controlledRewardMinutes = 2;
  let controlledRewardSeconds = 0;

  onMount(async () => {
    if (isControlledVariant) {
      controlledLearningMinutes = await storage.controlledTimerSettings.learningMinutes.get();
      controlledLearningSeconds = await storage.controlledTimerSettings.learningSeconds.get();
      controlledRewardMinutes = await storage.controlledTimerSettings.rewardMinutes.get();
      controlledRewardSeconds = await storage.controlledTimerSettings.rewardSeconds.get();
    }
  });

  function parseNumberToTime(number) {
    return number < 10 ? `0${number}` : number;
  }

  function ensureMinThreshold() {
    // Enforce 2-minute minimum for experimental variant
    if (learnMin < MIN_LEARNING_MINUTES_EXP) {
      learnMin = MIN_LEARNING_MINUTES_EXP;
      learnSec = 0;
    }
  }

  async function setLearningTime() {
    ensureMinThreshold();
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);
    update();
  }
  
  async function setControlledLearningTime() {
    const oldMinutes = await storage.controlledTimerSettings.learningMinutes.get();
    const oldSeconds = await storage.controlledTimerSettings.learningSeconds.get();
    await storage.controlledTimerSettings.learningMinutes.set(controlledLearningMinutes);
    await storage.controlledTimerSettings.learningSeconds.set(controlledLearningSeconds);
    
    update();
  }
  
  async function setControlledRewardTime() {
    const oldMinutes = await storage.controlledTimerSettings.rewardMinutes.get();
    const oldSeconds = await storage.controlledTimerSettings.rewardSeconds.get();
    await storage.controlledTimerSettings.rewardMinutes.set(controlledRewardMinutes);
    await storage.controlledTimerSettings.rewardSeconds.set(controlledRewardSeconds);
    
    update();
  }
</script>

{#if !isControlledVariant}
<!-- Experimental variant: Daily learning goal -->
<div class="row">
  <div class="col-sm">
    <p>Daily learning goal:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <input
        type = "number"
        id="mins"
        min="2"
        max="119"
        title="Enter a value between 2 and 119"
        bind:value={learnMin}
        on:change={() => {
          learnMin = Math.max(2, Math.min(119, parseInt(learnMin) || 2));
          ensureMinThreshold();
          setLearningTime();
        }}
        class="form-control form-control-sm inline"
      />
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <input
        type = "number"
        id="seconds"
        min="0"
        max="59"
        title="Enter a value between 0 and 59"
        bind:value={learnSec}
        on:change={() => {
          learnSec = Math.max(0, Math.min(59, parseInt(learnSec) || 0));
          ensureMinThreshold();
          setLearningTime();
        }}
        class="form-control form-control-sm inline"
      />
        
      
      <p><small>{"Min/Sec"}</small></p>
    </div>
  </div>
</div>
{:else}
<!-- Controlled variant: Session-based timers -->
<div class="row">
  <div class="col-sm">
    <p>Session learning time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={controlledLearningMinutes}
        on:change={setControlledLearningTime}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1, 61) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={controlledLearningSeconds}
        on:change={setControlledLearningTime}
        class="custom-select custom-select-sm inline"
      >
        {#each secondsOptions as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>{"Min/Sec"}</small></p>
    </div>
  </div>
</div>

<div class="row" style="margin-top: 1rem;">
  <div class="col-sm">
    <p>Reward time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={controlledRewardMinutes}
        on:change={setControlledRewardTime}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1, 61) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={controlledRewardSeconds}
        on:change={setControlledRewardTime}
        class="custom-select custom-select-sm inline"
      >
        {#each secondsOptions as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>{"Min/Sec"}</small></p>
    </div>
  </div>
</div>
{/if}

<style>
  .inline {
    display: inline !important;
    width: 25%;
    min-width: 55px;
    margin: 0px 5px 20px 0px;
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

