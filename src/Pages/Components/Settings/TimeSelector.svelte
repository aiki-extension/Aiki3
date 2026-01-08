<!-- 
  Time settings for learning goals.
  For controlled variant, shows session-based learning and reward time.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { saveUserPreferences, logEvent } from "../../../util/logger";
  import { AIKI_VARIANT } from "../../../util/variant";

  let minuteOptions = Array.from({ length: 121 }, (_, i) => i); // 0 - 120 minutes
  let secondsOptions = [0, 15, 30, 45];
  export let settings;
  export let update;
  export let user;

  let { min: learnMin, sec: learnSec } = settings.learningTime;
  
  // Controlled variant detection using imported config
  const isControlledVariant = AIKI_VARIANT === "controlled";
  let controlledLearningMinutes = 5;
  let controlledRewardMinutes = 2;

  onMount(async () => {
    if (isControlledVariant) {
      controlledLearningMinutes = await storage.controlledTimerSettings.learningMinutes.get();
      controlledRewardMinutes = await storage.controlledTimerSettings.rewardMinutes.get();
    }
  });

  function parseNumberToTime(number) {
    return number < 10 ? `0${number}` : number;
  }

  function ensureMinThreshold() {
    if (learnMin === 0 && learnSec < 30) {
      learnSec = 30;
    }
  }

  async function setLearningTime() {
    ensureMinThreshold();
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);
    const totalMinutes = learningTime.min + learningTime.sec / 60;
    try {
      const participantId = user || (await storage.uid.get());
      await saveUserPreferences({
        participantId,
        learning_time_minutes: totalMinutes,
      });
    } catch (e) {
      console.warn("Failed to sync learning time preference", e);
    }
    update();
  }
  
  async function setControlledLearningMinutes() {
    const oldValue = await storage.controlledTimerSettings.learningMinutes.get();
    await storage.controlledTimerSettings.learningMinutes.set(controlledLearningMinutes);
    
    // Save to UserPreferences and log the change
    try {
      const participantId = user || (await storage.uid.get());
      
      // Save to UserPreferences table
      await saveUserPreferences({
        participantId,
        learning_time_minutes: controlledLearningMinutes,
      });
      
      // Log the change event (without redundant timestamp)
      await logEvent({
        participantId,
        eventType: "audit:setting_change:controlled_learning_minutes",
        eventData: JSON.stringify({
          old: oldValue,
          new: controlledLearningMinutes,
        }),
      });
    } catch (e) {
      console.warn("Failed to log controlled learning minutes change", e);
    }
    update();
  }
  
  async function setControlledRewardMinutes() {
    const oldValue = await storage.controlledTimerSettings.rewardMinutes.get();
    await storage.controlledTimerSettings.rewardMinutes.set(controlledRewardMinutes);
    
    // Save to UserPreferences and log the change
    try {
      const participantId = user || (await storage.uid.get());
      
      // Save to UserPreferences table
      await saveUserPreferences({
        participantId,
        procrastination_reward_minutes: controlledRewardMinutes,
      });
      
      // Log the change event (without redundant timestamp)
      await logEvent({
        participantId,
        eventType: "audit:setting_change:controlled_reward_minutes",
        eventData: JSON.stringify({
          old: oldValue,
          new: controlledRewardMinutes,
        }),
      });
    } catch (e) {
      console.warn("Failed to log controlled reward minutes change", e);
    }
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
      <select
        selected={learnMin}
        id="hrs"
        on:change={(e) => {
          learnMin = parseInt(e.target.value);
          setLearningTime();
        }}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions as value}
          <option selected={value === learnMin} {value}
            >{parseNumberToTime(value)}</option
          >
        {/each}
      </select>
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        selected={learnSec}
        id="min"
        on:change={(e) => {
          learnSec = parseInt(e.target.value);
          ensureMinThreshold();
          setLearningTime();
        }}
        class="custom-select custom-select-sm inline"
      >
        {#each secondsOptions as value}
          <option selected={value === learnSec} {value}
            >{parseNumberToTime(value)}</option
          >
        {/each}
      </select>
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
        on:change={setControlledLearningMinutes}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1, 61) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>minutes</small></p>
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
        on:change={setControlledRewardMinutes}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1, 61) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>minutes</small></p>
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

