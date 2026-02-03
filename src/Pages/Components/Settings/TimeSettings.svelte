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

<h5>Set Learning Time:</h5>
<p>
  Set your daily learning goal. Aiki will intervene during your selected operating hours until this goal is completed.
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

  hr {
    background-color: var(--hrColor);
  }
  h5 {
    font-family: var(--fontHeaders);
  }
</style>
