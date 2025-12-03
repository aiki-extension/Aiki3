<!-- 
  Contains settings for redirection duration, as well as other misc settings such as changing theme.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Functional and module imports
  import storage from "../../../util/storage";
  import { onMount, tick } from "svelte";
  import { saveUserPreferences } from "../../../util/logger";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";

  // Component imports
  import Container from "./Container.svelte";
  import ThemeSelector from "./ThemeSelector.svelte";
  import OperatingHoursSettings from "./OperatingHoursSettings.svelte";
  import TimeSettings from "./TimeSettings.svelte";

  export let user = "";

  let learningUri = "";
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
    
    // Sync to backend
    try {
      const participantId = user || (await storage.uid.get());
      await saveUserPreferences({
        participantId,
        learning_sites: [uri],
      });
    } catch (e) {
      console.warn("Failed to sync learning site preference", e);
    }

    hasSaved = true;
    isEditing = false;
    toast.pop();
    toast.push("Learning platform saved!", {
      theme: themes.successTheme(toastCoords),
    });
  }

  async function enableEditing() {
    if (isEditing) return;
    isEditing = true;
    await tick();
    urlInputRef && urlInputRef.focus();
    toast.pop();
  }

</script>

<Container headline="Redirection Settings">
  <h5>Your Learning Platform:</h5>
  <hr />
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
        <button
          type="button"
          class="btn btn-theme-primary"
          on:click={saveUri}
          disabled={!isEditing}
          id="learning-url-save"
        >
          {hasSaved && !isEditing ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          class="btn btn-theme-secondary edit"
          class:active-edit={isEditing}
          on:click={enableEditing}
          disabled={isEditing}
          data-tooltip="Unlock to update your learning platform"
        >
          Edit
        </button>
      </div>
      <div class="status-row">
        {#if hasSaved}
          <span class:saved={!isEditing} class="status-badge">
            {#if isEditing}
              Editing in progress
            {:else}
              Saved for redirection
            {/if}
          </span>
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
    transition: filter 150ms ease, background-color 150ms ease,
      color 150ms ease, border-color 150ms ease;
  }

  .btn-theme-secondary.edit {
    min-width: 96px;
    background-color: var(--bannerBackgroundColor);
    border-color: var(--bannerBackgroundColor);
    color: var(--bannerTextColor);
  }

  .btn-theme-secondary.edit:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .btn-theme-secondary.edit:disabled {
    background-color: var(--backgroundColorSecondary);
    border-color: var(--hrColor);
    color: var(--textColor);
    opacity: 0.85;
    cursor: not-allowed;
  }

  .btn-theme-secondary.edit.active-edit {
    background-color: transparent;
    border-color: var(--textColor);
    color: var(--textColor);
  }

  .btn-theme-secondary.edit.active-edit:hover {
    filter: brightness(1.05);
  }

  .btn-theme-secondary:hover {
    background-color: var(--backgroundColorSecondary);
    filter: brightness(1.1);
  }

  .status-row {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

  .status-badge {
    font-size: 0.85rem;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--hrColor);
    color: var(--textColor);
    background-color: var(--backgroundColorSecondary);
  }

  .status-badge.saved {
    border-color: var(--bannerBackgroundColor);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08),
      rgba(0, 0, 0, 0.08)
    ),
    var(--bannerBackgroundColor);
    color: var(--bannerTextColor);
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
