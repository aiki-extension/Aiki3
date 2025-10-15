<!-- 
  The main container for the statistics panel in the settings window.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Functional and module imports
  import storage from "../../../util/storage";

  // Component imports
  import Container from "./Container.svelte";
  import ChartWrapper from "./ChartWrapper.svelte";

  let type = "today";

  let statistics = storage.stats.getAll();

  function changeChart(newType) {
    type = newType;
    statistics = storage.stats.getAll();
  }
</script>

<Container headline="Statistics">
  <h5>Your Statistics:</h5>
  <hr />
  <p>A quick look at where your focus time goes (updates every 5 minutes).</p>
  {#await statistics}
    <h1>Loading...</h1>
  {:then data}
    <ChartWrapper {type} {data} />
    <div class="buttons">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => changeChart("today")}>Today</button
      >
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => changeChart("yesterday")}>Yesterday</button
      >
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => changeChart("history")}>All Time</button
      >
    </div>
  {/await}
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
  }

  .buttons {
    display: flex;
    widows: 100%;
    justify-content: center;
  }
</style>
