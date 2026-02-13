<!-- 
  TODO: Description goes here
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import OperatingHoursSelector from "./OperatingHoursSelector.svelte";
  let operatingHours = storage.operatingHours.getAll();
  function update() {
    operatingHours = storage.operatingHours.getAll();
  }

  export let user;
</script>


{#await operatingHours}
  LOADING...
{:then settings}
  <OperatingHoursSelector {update} {settings} {user} />
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
