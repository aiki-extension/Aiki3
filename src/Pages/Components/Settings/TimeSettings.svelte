<!-- 
  Time settings container showing DailyGoal, SessionDuration, and RewardTime.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import DailyGoal from "./DailyGoal.svelte";
  import TimeSelector from "./TimeSelector.svelte";
  
  let timeSettings = storage.timeSettings.getAll();
  function update() {
    timeSettings = storage.timeSettings.getAll();
  }

  export let user;
</script>

<h5>Learning Settings:</h5>
<p>
  Configure your daily goal, session duration, and reward time.
</p>
{#await timeSettings}
  LOADING...
{:then settings}
  <DailyGoal {update} {user} />
  <TimeSelector {update} {user} />
{/await}

<style>
  p {
    padding: 0;
    margin-bottom: 1.5rem;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  hr {
    background-color: var(--hrColor);
  }
  h5 {
    font-family: var(--fontHeaders);
  }
</style>
