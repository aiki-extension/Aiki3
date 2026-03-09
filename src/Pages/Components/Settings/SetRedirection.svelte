<!-- 
  Contains settings for redirection duration, as well as other misc settings such as changing theme.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Functional and module imports
  import storage from "../../../util/storage";
  import { onMount, tick } from "svelte";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";
  import { parseUrl } from "../../../util/utilities";

  // Component imports
  import Container from "./Container.svelte";
  import ThemeSelector from "./ThemeSelector.svelte";
  import OperatingHoursSettings from "./OperatingHoursSettings.svelte";
  import TimeSettings from "./TimeSettings.svelte";

  export let user = "";

  let learningUri = "";
  let previousUri = "";
  let isEditing = true;
  let hasSaved = false;
  let urlInputRef;

  const toastCoords = {
    x: "learning-url-container",
    y: "learning-url-save",
  };

  onMount(async () => {
    try {
      learningUri = await storage.learningUri.get();
    } catch (e) {
      learningUri = "";
    }
    hasSaved = !!learningUri;
    isEditing = !hasSaved;
  });

  function normalize(url) {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  async function saveUri() {
    if (!isEditing) return;

    const uri = normalize(learningUri);

    const hostToCompare = parseUrl(uri).host; // Get just the domain (e.g., "example.com")

    const timeWasteList = (await storage.list.get()) || [];
    if (timeWasteList.some(item => item.host === hostToCompare)) {
      console.log("Already exists in time wasting list");
      toast.pop();
      toast.push("Your learning site cant be the same as a time wasting site", {
        theme: themes.infoTheme(toastCoords),
      });
      return;    }

    if (!uri) {
      learningUri = "";
      await storage.learningUri.set("");
      hasSaved = false;
      isEditing = true;
      toast.pop();
      toast.push("Learning platform cleared.", {
        theme: themes.infoTheme(toastCoords),
      });
      return;
    }

    learningUri = uri;
    await storage.learningUri.set(uri);

    hasSaved = true;
    isEditing = false;
    toast.pop();
    toast.push("Learning platform saved!", {
      theme: themes.successTheme(toastCoords),
    });
  }

  async function enableEditing() {
    if (isEditing) return;
    previousUri = learningUri;
    isEditing = true;
    await tick();
    urlInputRef && urlInputRef.focus();
    toast.pop();
  }

  function cancelEdit() {
    learningUri = previousUri;
    isEditing = false;
    toast.pop();
    toast.push("Changes cancelled.", {
      theme: themes.infoTheme(toastCoords),
    });
  }

</script>

<Container headline="Redirection Settings">
  <h5>Your Redirection Platform:</h5>
  <div class="container">
    <div class="full" id="learning-url-container">
      <input
        class="form-control form-control-lg url-input"
        type="text"
        placeholder="https://example.com"
        bind:value={learningUri}
        bind:this={urlInputRef}
        readonly={!isEditing}
        class:saved-state={!isEditing && hasSaved}
        id="learning-url-input"
      />
      <div class="actions">
        {#if isEditing}
          <button
            type="button"
            class="btn btn-success"
            on:click={saveUri}
            id="learning-url-save"
          >
            Save
          </button>
          {#if hasSaved}
            <button
              type="button"
              class="btn btn-secondary"
              on:click={cancelEdit}
            >
              Cancel
            </button>
          {/if}
        {:else}
          <button
            type="button"
            class="btn btn-theme-primary"
            on:click={enableEditing}
            data-tooltip="Change your learning platform"
          >
            Change
          </button>
        {/if}
      </div>
    </div>
  </div>
  <hr />
  <TimeSettings {user} />
  <hr />
  <OperatingHoursSettings {user} />

  <hr />
  <h5>Other Settings:</h5>
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
    transition: border-color 150ms ease, box-shadow 150ms ease,
      background-color 150ms ease;
  }

  .url-input.saved-state {
    background-color: var(--backgroundColorSecondary);
    color: var(--textColor);
    border: 2px solid var(--bannerBackgroundColor);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

  .url-input.saved-state::placeholder {
    color: var(--textColor);
    opacity: 0.6;
  }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
    margin-top: 12px;
  }

  .btn-theme-primary {
    background-color: var(--bannerBackgroundColor);
    border-color: var(--bannerBackgroundColor);
    color: var(--bannerTextColor);
  }

  .btn-theme-primary:hover {
    filter: brightness(1.05);
  }

  .status-row {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

  .center {
    display: flex;
    justify-content: center;
  }

  h5 {
    font-family: var(--fontHeaders);
  }

  hr {
    background-color: var(--hrColor);
  }
</style>
