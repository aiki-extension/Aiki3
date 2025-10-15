<!-- 
  Button used in the Popup to skip past a learning session to the origin site.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  import Fa from "svelte-fa";
  import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

  export let gotoOrigin;

  function handleClick() {
    gotoOrigin("skip");
  }
</script>

<button
  on:click={handleClick}
  type="default"
  class="btn btn-success item"
  data-tooltip="Head back to your original tab"
  ><Fa icon={faArrowRight} /> Continue</button
>

<style>
  button {
    font-size: var(--fontSizePopup);
  }

  .item {
    margin: auto auto;
  }
</style>
