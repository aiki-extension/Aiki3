<!-- 
  Button used in the Popup to continue to origin site after successfully completing a learning session.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  /* Functional and module imports */
  // Old code that might be removed.
  // import storage from "../../../util/storage";
  // import Fa from "svelte-fa";
  // import { faArrowAltCircleRight } from "@fortawesome/free-solid-svg-icons";
  //<Fa icon={faArrowAltCircleRight} />

  //export let siteName;
  export let gotoOrigin;

  function handleClick() {
    gotoOrigin("continue");
  }
</script>

<button
  type="default"
  on:click={handleClick}
  class="btn btn-success item"
  data-tooltip="Takes you back to your original time wasting site!"
  >Continue
</button>

<style>
  button {
    font-size: var(--fontSizePopup);
  }

  .item {
    margin: auto auto;
  }
</style>
