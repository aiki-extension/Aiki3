<!-- This component is used by extension when user opens settings page in extension menu.
  It is also opened by a button in extension popup component.
  This gathers all the settings components and displays them for the user to change the behaviour
  of the application.
  Used in / Entry: /src/main.js
-->
<script>
  /*Functional and module imports*/
  import browser from "webextension-polyfill";
  import { SvelteToast } from "@zerodevx/svelte-toast";

  /*Components import*/
  import Footer from "./Components/Settings/Footer.svelte";
  import Header from "./Components/Settings/Header.svelte";
  import Privacy from "./Components/Settings/Privacy.svelte";
  import SetUser from "./Components/Settings/SetUser.svelte";
  import SetWebsites from "./Components/Settings/SetTimeWastingSites.svelte";
  import Statistics from "./Components/Settings/Statistics.svelte";
  import SetRedirection from "./Components/Settings/SetRedirection.svelte";
  import AikiDescription from "./Components/Settings/AikiDescription.svelte";

  $: user = "";
  $: userIsRegistered = false;

  const port = browser.runtime.connect({
  name: "Settings Communication"
  });
</script>

<div class="settings">
  <Header />
  <main>
    {#if !userIsRegistered}
      <div class="container">
        <Privacy />
      </div>
    {/if}
    <div class="container">
      <SetUser bind:user bind:userIsRegistered {port} />
    </div>
    {#if userIsRegistered}
      <div class="container">
      <AikiDescription/>

      </div>
    
      <div class="container">
        <SetWebsites {user} {port} />
      </div>
      <div class="container">
        <SetRedirection {user} />
      </div>
      <div class="container">
        <Statistics />
      </div>
    {/if}
  </main>
  <Footer />
</div>
<SvelteToast options={{ reversed: true, intro: { x: 192 } }} />

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
