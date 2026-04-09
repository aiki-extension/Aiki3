<!-- 
  Contains settings for redirection duration, as well as other misc settings such as changing theme.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  // Functional and module imports
  import storage from "../../../util/storage";
  import { onMount, tick } from "svelte";
  import { parseUrl, normalizeUrl } from "../../../util/utilities";
  import { alertStore } from '../../../services/alertService';
  import browser from "webextension-polyfill";
  import { MESSAGE_API_UPDATE_LEARNING_URI } from '../../../values/messageTypeValues';

  // Component imports
  import Container from "./Container.svelte";
  import ThemeSelector from "./ThemeSelector.svelte";
  import OperatingHoursSettings from "./OperatingHoursSettings.svelte";
  import InviteCodeSettings from "./InviteCodeSettings.svelte";
  import TimeSettings from "./TimeSettings.svelte";

  export let user = "";

  let learningUri = "";
  let previousUri = "";
  let isEditing = true;
  let hasSaved = false;
  let urlInputRef;

  // Check if the user is a guest.
  $: isGuestUser =
    user === "guest" ||
    user?.isGuest === true;

  onMount(async () => {
    try {
      learningUri = await storage.learningUri.get();
    } catch (e) {
      learningUri = "";
    }
    hasSaved = !!learningUri;
    isEditing = !hasSaved;
  });

  async function saveUri() {
    if (!isEditing) return;

    const wwwHost = normalizeUrl(learningUri);

    if (!wwwHost) {
      if (!learningUri.trim()){
        await storage.learningUri.set("");
        hasSaved = false;
        isEditing = true;
        alertStore.add({ type: 'success', message: 'Learning platform cleared.' });
      } else {
        alertStore.add({ type: 'warning', message: 'Invalid URL.' });
      }
      return;
    }

    const timeWasteList = (await storage.list.get()) || [];
    if (timeWasteList.some(item => item.host === wwwHost)) {
      alertStore.add({
        type: 'warning',
        message: 'Your learning site cant be the same as a time wasting site',
      })
      return;    
    }

    await storage.learningUri.set(wwwHost);
    learningUri = wwwHost; // Used to display it correctly in the settings page

    hasSaved = true;
    isEditing = false;

    alertStore.add({
        type: 'success',
        message: 'Learning platform saved!',
      })
    
    // API Call at the end, to ensure it doesn't block for local storage (focused on guest mode especially)
    const backendResult = await browser.runtime.sendMessage({
      type: MESSAGE_API_UPDATE_LEARNING_URI,
      learningUri: wwwHost,
    });
  }

  async function enableEditing() {
    if (isEditing) return;
    previousUri = learningUri;
    isEditing = true;
    await tick();
    urlInputRef && urlInputRef.focus();
  }

  function cancelEdit() {
    learningUri = previousUri;
    isEditing = false;

    alertStore.add({
      type: 'info',
      message: 'Changes cancelled.',
    })
  }

</script>

<Container headline="Redirection Settings">
  <h5>Your Redirection Platform:</h5>
  <div class="container">
    <form class="full" id="learning-url-container" on:submit|preventDefault={saveUri}>
      <input
        class="form-control form-control-lg url-input"
        type="text"
        placeholder="www.example.com"
        bind:value={learningUri}
        bind:this={urlInputRef}
        readonly={!isEditing}
        class:saved-state={!isEditing && hasSaved}
        id="learning-url-input"
      />
      <div class="actions">
        {#if isEditing}
          <button
            type="submit"
            class="btn btn-success"
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
    </form>
  </div>
  <hr />
  <TimeSettings {user} />
  <hr />
  <OperatingHoursSettings {user} />
  {#if user && !isGuestUser}
    <hr />
    <InviteCodeSettings />
  {/if}
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
