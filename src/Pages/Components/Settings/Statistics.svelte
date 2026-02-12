<!-- 
  The main container for the statistics panel in the settings window.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Component imports
  import Container from "./Container.svelte";
  import ChartWrapper from "./ChartWrapper.svelte";

  let type = "today";

  function changeTab(newType) {
    type = newType;
  }
</script>

<Container headline="Statistics">
  <h5>Your Statistics:</h5>
  <hr />
  <p>Your browsing activity from the database.</p>
  <ChartWrapper {type} />
  <div class="buttons">
    <button
      type="button"
      class="btn btn-secondary"
      class:active={type === "today"}
      on:click={() => changeTab("today")}>Today</button
    >
    <button
      type="button"
      class="btn btn-secondary"
      class:active={type === "weekly"}
      on:click={() => changeTab("weekly")}>Weekly</button
    >
    <button
      type="button"
      class="btn btn-secondary"
      class:active={type === "allTime"}
      on:click={() => changeTab("allTime")}>All Time</button
    >
  </div>
</Container>

<style>
  h5 {
    font-family: var(--fontHeaders);
  }

  p {
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  hr {
    background-color: var(--hrColor);
  }

  .btn {
    margin: 10px;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .btn.active {
    background-color: var(--bannerBackgroundColor);
    border-color: var(--bannerBackgroundColor);
    color: var(--bannerTextColor);
  }

  .buttons {
    display: flex;
    width: 100%;
    justify-content: center;
  }
</style>
