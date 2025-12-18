<!-- 
  Button used in the Popup to toggle the redirection functionality on and off.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  /* Functional and module imports */
  import Fa from "svelte-fa";
  import { faPowerOff } from "@fortawesome/free-solid-svg-icons";
  import storage from "../../../util/storage";

  export let port;
  let toggled = storage.redirection.get();

  async function toggleRedirection() {
    const wasOn = await storage.redirection.get();
    storage.redirection.toggle();
    const isNowOn = !wasOn;
    toggled = Promise.resolve(isNowOn);
    try {
      if (isNowOn) {
        port.postMessage("goto: on");
        location.reload();
      } else {
        port.postMessage("goto: off");
        location.reload();
      }
    } catch (error) {
      console.error(error);
    }
  }
</script>

<div class="container">
  <h6 class="item">Aiki is:</h6>
  {#await toggled}
    <button type="default" class="btn item">...</button>
  {:then value}
    <button
      type="default"
      class="btn {value ? 'btn-success' : 'btn-danger'} item"
      data-tooltip="Turn Aiki ON or OFF"
      on:click={toggleRedirection}
      ><Fa icon={faPowerOff} /> {value ? "On" : "Off"}</button
    >
  {/await}
</div>

<style>
  button {
    font-size: var(--fontSizePopup);
  }

  h6 {
    font-size: var(--fontSizePopup);
    color: var(--textColor);
  }

  .container {
    display: flex;
    justify-content: center;
    align-content: center;
    flex-direction: row;
  }

  .item {
    margin: auto auto;
  }
</style>
