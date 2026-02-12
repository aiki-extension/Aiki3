<!-- 
  Daily learning goal setting component.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { saveUserPreferences, logEvent } from "../../../util/logger";

  let minuteOptions = Array.from({ length: 121 }, (_, i) => i); // 0 - 120 minutes
  let secondsOptions = [0, 15, 30, 45]; // 15-second intervals

  export let update;
  export let user;

  let goalMin = 30;
  let goalSec = 0;

  onMount(async () => {
    const dailyGoal = await storage.timeSettings.dailyGoal.get();
    goalMin = dailyGoal.min;
    goalSec = dailyGoal.sec;
  });

  function parseNumberToTime(number) {
    return number < 10 ? `0${number}` : number;
  }

  async function setDailyGoal() {
    const dailyGoal = { min: goalMin, sec: goalSec };
    await storage.timeSettings.dailyGoal.set(dailyGoal);
    
    // Cap session duration if it exceeds the new daily goal
    const session = await storage.timeSettings.sessionDuration.get();
    const goalTotalSec = goalMin * 60 + goalSec;
    const sessionTotalSec = session.min * 60 + session.sec;
    if (sessionTotalSec > goalTotalSec) {
      // Cap session to daily goal
      await storage.timeSettings.sessionDuration.set({ min: goalMin, sec: goalSec });
    }
    
    const totalMinutes = goalMin + goalSec / 60;
    try {
      const participantId = user || (await storage.uid.get());
      await saveUserPreferences({
        participantId,
        daily_goal_minutes: totalMinutes,
      });
      await logEvent({
        participantId,
        eventType: "audit:setting_change:daily_goal",
        eventData: JSON.stringify({ min: goalMin, sec: goalSec }),
      });
    } catch (e) {
      console.warn("Failed to sync daily goal preference", e);
    }
    update();
  }
</script>

<div class="row">
  <div class="col-sm">
    <p>Daily learning goal:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={goalMin}
        on:change={setDailyGoal}
        class="custom-select custom-select-sm inline"
      >
        {#each minuteOptions.slice(1) as value}
          <option {value}>{parseNumberToTime(value)}</option>
        {/each}
      </select>
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        bind:value={goalSec}
        on:change={setDailyGoal}
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
