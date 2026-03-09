<!-- 
  Time settings for Daily learning goals.
 -->
<script>
  import storage from "../../../util/storage";

  // Minimum learning time in minutes to ensure users set a reasonable goal. This is enforced both in the UI and in the logic.
  const MIN_LEARNING_MINUTES = 2;
  export let settings;
  export let update;

  let { min: learnMin, sec: learnSec } = settings.learningTime;

  // Ensures that the learning time meets the minimum threshold. If the user tries to set a value below the minimum, it will automatically adjust it to the minimum allowed value. This function is called before saving the settings to ensure data integrity.
  function ensureMinThreshold() {
    if (learnMin < MIN_LEARNING_MINUTES) {
      learnMin = MIN_LEARNING_MINUTES;
      learnSec = 0;
    }
  }
  // This function saves the learning time settings to storage and attempts to sync the preference with the server.
  async function setLearningTime() {
    ensureMinThreshold();
    const learningTime = { min: learnMin, sec: learnSec };
    storage.timeSettings.learningTime.set(learningTime);
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

