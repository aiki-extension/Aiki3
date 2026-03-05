<!-- 
  TODO: Description goes here
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

<h5>Redirection Settings:</h5>
<p>
	•	Daily goal (total time you aim to spend on the redirected site each day)<br>
	•	Session duration (time per learning session)<br>
	•	Reward time (time allowed on the procrastination site)<br>
</p>
{#await timeSettings}
  LOADING...
{:then settings}
  <TimeSelector {update} {settings} {user} />
{/await}

<style>
  p {
    padding: 0;
    margin-bottom: 1.5rem;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  h5 {
    font-family: var(--fontHeaders);
  }
</style>
