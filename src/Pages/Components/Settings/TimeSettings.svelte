<!-- 
  Time settings container showing SessionDuration and RewardTime.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import TimeSelector from "./TimeSelector.svelte";
  
  let timeSettings = storage.timeSettings.getAll();
  function update() {
    timeSettings = storage.timeSettings.getAll();
  }

  export let user;
</script>

<p>
	Each time you’re intercepted, you’re redirected to a productive site for a minimum study period. Once completed, this unlocks a reward period on your time-wasting site.
</p>
{#await timeSettings}
  LOADING...
{:then settings}
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
