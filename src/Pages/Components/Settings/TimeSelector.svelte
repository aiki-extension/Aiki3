<!-- 
  Session duration and reward time settings.
  Both variants show session duration and reward time settings.
  Daily goal is now in DailyGoal.svelte
  Session duration is capped to daily goal.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { saveUserPreferences, logEvent } from "../../../util/logger";

  let minuteOptions = Array.from({ length: 61 }, (_, i) => i); // 0 - 60 minutes

  export let update;
  export let user;

  // Daily goal (loaded for validation)
  let dailyGoalMin = 30;
  let dailyGoalSec = 0;

  // Session duration (per learning session) - must be <= daily goal
  let sessionMin = 5;
  
  // Reward time (procrastination time after session)
  let rewardMin = 2;

  // Computed: max session in seconds
  $: dailyGoalTotalSec = dailyGoalMin * 60 + dailyGoalSec;
  
  // Filter minute options to not exceed daily goal
  $: allowedSessionMinutes = minuteOptions.filter(m => m * 60 <= dailyGoalTotalSec);

  onMount(async () => {
    // Load daily goal for validation
    const dailyGoal = await storage.timeSettings.dailyGoal.get();
    dailyGoalMin = dailyGoal.min;
    dailyGoalSec = 0;
    
    // Load session duration
    const sessionDuration = await storage.timeSettings.sessionDuration.get();
    sessionMin = sessionDuration.min;

    
    // Load reward time from controlledTimerSettings (unified for both variants)
    rewardMin = await storage.controlledTimerSettings.rewardMinutes.get();
  });

  function parseNumberToTime(number) {
    return number < 10 ? `0${number}` : number;
  }
  

  async function setSessionDuration() {
    const duration = { min: sessionMin, sec: 0 };
    await storage.timeSettings.sessionDuration.set(duration);
    
    const totalMinutes = sessionMin;
    try {
      const participantId = user || (await storage.uid.get());
      await saveUserPreferences({
        participantId,
        learning_time_minutes: totalMinutes,
      });
      await logEvent({
        participantId,
        eventType: "audit:setting_change:session_duration",
        eventData: JSON.stringify({ min: sessionMin, sec: 0 }),
      });
    } catch (e) {
      console.warn("Failed to sync session duration preference", e);
    }
    update();
  }

  async function setRewardTime() {
    await storage.controlledTimerSettings.rewardMinutes.set(rewardMin);
    await storage.controlledTimerSettings.rewardSeconds.set(0);
    
    const totalMinutes = rewardMin;
    try {
      const participantId = user || (await storage.uid.get());
      await saveUserPreferences({
        participantId,
        procrastination_reward_minutes: totalMinutes,
      });
      await logEvent({
        participantId,
        eventType: "audit:setting_change:reward_time",
        eventData: JSON.stringify({ min: rewardMin, sec: 0 }),
      });
    } catch (e) {
      console.warn("Failed to sync reward time preference", e);
    }
    update();
  }
</script>

<!-- Session Duration -->
<div class="row">
  <div class="col-sm">
    <p>Minimum Productive Period:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={sessionMin}
        on:change={setSessionDuration}
        class="custom-select custom-select-sm inline"
      >
        {#each allowedSessionMinutes.slice(1) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>{"Min"}</small></p>
    </div>
  </div>
</div>

<!-- Reward Time -->
<div class="row" style="margin-top: 1rem;">
  <div class="col-sm">
    <p>Reward time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={rewardMin}
        on:change={setRewardTime}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p><small>{"Min"}</small></p>
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
