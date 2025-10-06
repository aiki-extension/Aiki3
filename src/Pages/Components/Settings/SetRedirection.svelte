<!-- 
  Contains settings for redirection duration, as well as other misc settings such as changing theme.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Functional and module imports
  import storage from "../../../util/storage";
  import { onMount } from "svelte";

  // Component imports
  import Container from "./Container.svelte";
  import ThemeSelector from "./ThemeSelector.svelte";
  import OperatingHoursSettings from "./OperatingHoursSettings.svelte";
  import TimeSettings from "./TimeSettings.svelte";

  export let user = "";

  let learningUri = "";

  onMount(async () => {
    try {
      learningUri = await storage.learningUri.get();
    } catch (e) {
      learningUri = "";
    }
  });

  function normalize(url) {
    if (!url) return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  async function saveUri() {
    const uri = normalize(learningUri);
    if (!uri) {
      await storage.learningUri.set("");
      return;
    }
    learningUri = uri;
    await storage.learningUri.set(uri);
  }

</script>

<Container headline="Redirection Settings">
  <h5>Your Learning Platform:</h5>
  <hr />
  <div class="container">
    <div class="full">
      <input
        class="form-control form-control-lg url-input"
        type="text"
        placeholder="https://example.com"
        bind:value={learningUri}
      />
      <div class="actions">
        <button type="button" class="btn btn-theme-primary" on:click={saveUri}>
          Save
        </button>
        <a target="_blank" rel="noopener noreferrer" href={normalize(learningUri)}>
          <button
            type="button"
            class="btn btn-theme-secondary visit"
            data-tooltip="Go to your learning platform!"
          >
            Visit
          </button>
        </a>
      </div>
    </div>
  </div>
  <hr />
  <TimeSettings {user} />
  <hr />
  <OperatingHoursSettings {user} />

  <hr />
  <h5>Other Settings:</h5>
  <hr />
  <div>
    <div class="row">
      <div class="col-sm">Pick a theme:</div>
      <div class="col-sm" />
      <div class="col-sm center">
        <ThemeSelector />
      </div>
    </div>
  </div>
</Container>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
  }

  .full {
    width: 100%;
    max-width: 640px;
  }

  .url-input {
    width: 100%;
  }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
    margin-top: 12px;
  }

  /* Theme-aware buttons */
  .btn-theme-primary {
    background-color: var(--bannerBackgroundColor);
    border-color: var(--bannerBackgroundColor);
    color: var(--bannerTextColor);
  }

  .btn-theme-primary:hover {
    filter: brightness(1.05);
  }

  .btn-theme-secondary {
    background-color: transparent;
    color: var(--textColor);
    border: 1px solid var(--textColor);
  }

  .btn-theme-secondary:hover {
    background-color: var(--backgroundColorSecondary);
    filter: brightness(1.1);
  }

  .center{
    display: flex;
    justify-content: center;
  }

  .btn-dark {
    display: flex;
  }

  h5 {
    font-family: var(--fontHeaders);
  }

  hr {
    background-color: var(--hrColor);
  }
</style>
