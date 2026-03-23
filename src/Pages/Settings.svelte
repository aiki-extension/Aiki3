<!-- This component is used by extension when user opens settings page in extension menu.
  It is also opened by a button in extension popup component.
  This gathers all the settings components and displays them for the user to change the behaviour
  of the application.
  Used in / Parent components: /src/App.svelte
-->
<script>
  /*Functional and module imports*/
  import browser from "webextension-polyfill";

  /*Components import*/
  import Footer from "./Components/Settings/Footer.svelte";
  import Header from "./Components/Settings/Header.svelte";
  import Privacy from "./Components/Settings/Privacy.svelte";
  import SetUser from "./Components/Settings/SetUser.svelte";
  import SetWebsites from "./Components/Settings/SetTimeWastingSites.svelte";
  import Statistics from "./Components/Settings/Statistics.svelte";
  import SetRedirection from "./Components/Settings/SetRedirection.svelte";
  import AikiDescription from "./Components/Settings/AikiDescription.svelte";
  import Alerts from "./Components/Alerts/AlertContainer.svelte";

  // Data Sync related imports
  import { onMount } from "svelte";
  import { fetchAndSyncSettings } from "../services/settingsService";
  import { alertStore } from "../services/alertService";
  import storage from "../util/storage";

  let user = "";
  let userIsRegistered = false;
  let settingsKey = 0;

  const port = browser.runtime.connect({
  name: "Settings Communication"
  });

  // Triggered by SetUser.svelte after a successfull login or a register
  // Fetches latest settings from DB and syncs to local storage
  async function handleAuthenticated() {
    const result = await fetchAndSyncSettings();
    if (!result.ok) {
      alertStore.add({
        type: 'warning',
        message: "Could not fetch latest settings from server. Using local settings.",
      });
    } else {
      settingsKey++; // settingsKey++ forces SetRedirection and its children to remount (thus refreshing values shown on the page)
      alertStore.add({
        type: 'success',
        message: "Settings updated from server.",
      });
    }
  }

  onMount(async () => {
    // Token is used to check if the user is not logged or is in guest mode
    // Either way the user should not try to fetch data from API. Only if they are logged in
    const token = await storage.jwt.get();
    if (token) {
      await handleAuthenticated();
    }
  });
</script>

<div class="settings">
  <Alerts />
  <Header />
  <main>
    {#if !userIsRegistered}
      <div class="container">
        <Privacy />
      </div>
    {/if}
    <div class="container">
      <!-- Listens for the "authenticated" event in SetUser.svelte. Thus triggering the function to trigger, to refresh values on the page-->
      <SetUser bind:user bind:userIsRegistered {port} on:authenticated={handleAuthenticated} />
    </div>
    {#if userIsRegistered}
      <div class="container">
        <AikiDescription {user} {port} />
      </div>
      <div class="container">
        <SetWebsites {user} {port} />
      </div>
      {#key settingsKey} <!-- increments after a successful sync. Forcing this block to remount to re-read local storage values (thus showing correct values on the page)-->
        <div class="container">
          <SetRedirection {user} />
        </div>
      {/key}
      <div class="container">
        <Statistics />
      </div>
    {/if}
  </main>
  <Footer />
</div>

<style>
  .settings {
    background-color: var(--backgroundColorPrimary);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: 100%;
  }

  .container {
    margin: auto;
    padding: 30px 30px 10px;
  }

  main {
    background-color: var(--backgroundColorPrimary);
    flex-grow: 1;
    flex-shrink: 0;
    margin-top: 4em;
  }
</style>
