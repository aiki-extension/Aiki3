<!-- 
  Display used in the Popup to show bonus learning time during a learning session.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  import { formatDuration } from "../../../util/utilities";
  export let bonusTime;
</script>

<div
  class="container"
  data-tooltip="Extra time you have spent learning this session"
>
  <h6 class="item">Extra Learning Time:</h6>
  {#if bonusTime > 0}
    <p class="item">{formatDuration(bonusTime, { longForm: true })}</p>
  {:else}
    <p class="item">Done</p>
  {/if}
</div>

<style>
  .container {
    display: block;
    justify-content: center;
    align-content: center;
    flex-direction: row;
  }

  .item {
    margin: auto auto;
  }

  h6 {
    font-size: var(--fontSizePopup);
    color: var(--textColor);
    padding-top: 5px;
  }

  p {
    font-size: var(--fontSizePopup);
    font-weight: 700;
    padding: 10px 0px 0px;
    justify-content: center;
    align-items: center;
    color: #007bff;
  }
</style>
