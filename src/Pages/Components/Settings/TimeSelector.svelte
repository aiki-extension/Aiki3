<!-- 
  TODO: Description goes here
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import { logAuditEvent } from "../../../util/logger";

  let minuteOptions = Array.from({ length: 121 }, (_, i) => i); // 0 - 120 minutes
  let secondsOptions = [0, 15, 30, 45];
  export let settings;
  export let update;
  export let user;

  let { min: learnMin, sec: learnSec } = settings.learningTime;

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
    const previous = { ...settings.learningTime };
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);
    const totalSeconds = learningTime.min * 60 + learningTime.sec;
    const totalMinutes = learningTime.min + learningTime.sec / 60;
    await logAuditEvent({
      participantId: user,
      action: "update_learning_time",
      settingName: "learning_time",
      oldValue: previous,
      newValue: learningTime,
      participantUpdates: {
        current_daily_goal_min: totalMinutes,
        current_timer_duration_sec: totalSeconds,
      },
    });
    update();
  }
</script>

<!-- ActiveFrom -->
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
