<!-- 
  Daily learning goal setting component.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { saveUserPreferences, logEvent } from "../../../util/logger";

  let minuteOptions = Array.from({ length: 121 }, (_, i) => i); // 0 - 120 minutes

  export let update = undefined;
  export let user;

  let goalMin = 30;
  const goalSec = 0;

  onMount(async () => {
    const dailyGoal = await storage.timeSettings.dailyGoal.get();
    goalMin = dailyGoal.min;
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
    update?.();
  }
</script>

<div class="goal-row">
  <div class="goal-copy">
    <p class="goal-title"><strong>Daily Productive Goal:</strong></p>
    <p class="goal-description">
      Set the number of minutes you want to spend on your activity before distractions are no longer intercepted
    </p>
  </div>
  <div class="goal-control">
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
      <p class="unit-label"><small>{"Min"}</small></p>
    </div>
  </div>
</div>

<style>
  .goal-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .goal-copy {
    flex: 1;
    min-width: 0;
  }

  .goal-control {
    flex: 0 0 auto;
  }

  .goal-title,
  .goal-description,
  .unit-label {
    padding: 0;
    margin: 0;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  .goal-title {
    margin-bottom: 10px;
  }

  .goal-description {
    margin-right: 8px;
  }

  .unit-label {
    margin: 0px 5px 20px 0px;
    white-space: nowrap;
  }

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

  @media (max-width: 768px) {
    .goal-row {
      flex-direction: column;
      gap: 12px;
    }

    .goal-control {
      align-self: flex-start;
    }
  }

  select,
  option {
    font-family: var(--fontContent);
    font-size: 0.875rem;
    color: #212121;
  }
</style>
