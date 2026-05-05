<!-- 
  Loads operating hours from storage and renders OperatingHoursSelector. Re-reads storage after
  each update to keep local state in sync.
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

<h5>Set Operating Hours:</h5>

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


  h5 {
    font-family: var(--fontHeaders);
  }
</style>
