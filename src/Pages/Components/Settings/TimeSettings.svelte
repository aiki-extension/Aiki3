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
  Set a daily learning goal so Aiki knows how long to keep you on your
  learning platform before letting a time wasting sites through.
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
