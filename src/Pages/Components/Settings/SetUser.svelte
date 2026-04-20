<!-- This component is rendered as a block on the settings 
  page for users to register or log in with their email.
  Used in / Parent components: /src/Pages/Settings.svelte
-->
<script>
  import { onMount } from "svelte";
  import Container from "./Container.svelte";
  import storage from "../../../util/storage";
  import { setTheme } from "../../../util/themes";
  import Fa from "svelte-fa";
  import { faUserSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
  import { alertStore } from "../../../services/alertService";
  import browser from "webextension-polyfill";
  import {createEventDispatcher } from "svelte";
  import {
    ACTIVE_TIME_TO_HOURS,
    ACTIVE_TIME_TO_MINUTES,
    ACTIVE_TIME_FROM_HOURS,
    ACTIVE_TIME_FROM_MINUTES,
    MIN_LEARNING_MINUTES,
    REWARD_TIME_MINUTES,
    SESSION_TIME_MINUTES,
  } from "../../../values/defaultSettingValues";
  import {
    MESSAGE_API_LOGIN,
    MESSAGE_API_REGISTER
  } from "../../../values/messageTypeValues";

  export let user = "";
  export let userIsRegistered;
  let authMode = "login";
  let password = "";
  let confirmPassword = "";
  let inviteCode = "";
  let isSubmitting = false;
  let isResearchParticipant = false;
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const dispatch = createEventDispatcher();

  // Trimming whitespace and converting to lowercase.
  function normalizeUser(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }
  
  function resetFormFields({ keepUser = false } = {}) {
    if (!keepUser) {
      user = "";
    }
    password = "";
    confirmPassword = "";
    inviteCode = "";
  }
  
  function isValidEmail(value) {
    return basicEmailRegex.test(value);
  }

  function notifyWarning(alertMessage) {
    alertStore.add({
      type: 'error',
      message: alertMessage,
    });
  }

  function notifySuccess(alertMessage) {
    alertStore.add({
      type: 'success',
      message: alertMessage,
    });
  }

  async function persistSessionLocally(nextUser, token) {
    await storage.uid.set(nextUser);
    await storage.jwt.set(token ?? "");
    user = nextUser;
    userIsRegistered = true;
  }

  async function loadDefaultSettingsLocally() {
    await storage.operatingHours.from.set({
      hrs: ACTIVE_TIME_FROM_HOURS,
      min: ACTIVE_TIME_FROM_MINUTES,
    });
    await storage.operatingHours.to.set({
      hrs: ACTIVE_TIME_TO_HOURS,
      min: ACTIVE_TIME_TO_MINUTES,
    });
    await storage.timeSettings.learningTime.set({ min: MIN_LEARNING_MINUTES, sec: 0 });
    await storage.timeSettings.sessionMinutes.set(SESSION_TIME_MINUTES);
    await storage.timeSettings.sessionSeconds.set(0);
    await storage.timeSettings.rewardMinutes.set(REWARD_TIME_MINUTES);
    await storage.timeSettings.rewardSeconds.set(0);
  }

  async function clearSessionLocally({ loadDefaults = false } = {}) {
    await storage.clearStorage();
    await setTheme("dark");
    if (loadDefaults) {
      await loadDefaultSettingsLocally();
      await storage.shouldRedirect.set(true);
      await storage.redirection.toggle();
    }
    user = "";
    userIsRegistered = false;
  }

  async function authenticateWithBackend({ mode, email, plainTextPassword, inviteCode, isResearchParticipant }) {
   const type = mode === "register" ? MESSAGE_API_REGISTER : MESSAGE_API_LOGIN;
   try {
     const result = await browser.runtime.sendMessage({
        type,
        email,
        password: plainTextPassword,
        ...(mode === "register" && inviteCode ? { inviteCode } : {}), // Only include inviteCode if we're in register mode and it's provided
        isResearchParticipant: isResearchParticipant,
      });
     if (!result || !result.ok) {
       return { ok: false, message: result?.message || "Server error. Please try again.", token: null };
     }
     return result;
    } catch {
      return { ok: false, message: "Could not reach the server.", token: null };
    }
  }

  function isAuthFormValid() {
    const normalizedUser = normalizeUser(user);
    user = normalizedUser;

    if (!normalizedUser) {
      notifyWarning("Please enter your email before submitting.");
      return false;
    }

    if (!isValidEmail(normalizedUser)) {
      notifyWarning("Please enter a valid email address.");
      return false;
    }

    if (!password.trim()) {
      notifyWarning("Please enter your password before submitting.");
      return false;
    }

    if (authMode === "register") {
      if (!confirmPassword.trim()) {
        notifyWarning("Please re-enter your password to confirm it.");
        return false;
      }

      if (password !== confirmPassword) {
        notifyWarning("The passwords do not match.");
        return false;
      }
    }

    return true;
  }

  async function setup() {
    const storedUid = await storage.uid.get();
    user = typeof storedUid === "string" ? storedUid.trim() : "";
    userIsRegistered = user !== "";
  }

  async function submitAuth() {
    if (isSubmitting || !isAuthFormValid()) {
      return;
    }

    isSubmitting = true;
    const normalizedUser = normalizeUser(user);
    user = normalizedUser;

    try {
      const authResult = await authenticateWithBackend({
        mode: authMode,
        email: normalizedUser,
        plainTextPassword: password,
        inviteCode,
        isResearchParticipant,
      });

      if (!authResult?.ok) {
        notifyWarning(authResult?.message || "Authentication failed. Please try again.");
        return;
      }

      await persistSessionLocally(normalizedUser, authResult.token);
      await storage.shouldRedirect.set(true);
      const redirectionEnabled = await storage.redirection.get();
      if (redirectionEnabled !== true) {
        await storage.redirection.toggle();
      }

      // After successful login/register, notify parent (Settings.svelte) 
      // so it can sync DB settings to local storage and re-render child components
      dispatch("authenticated");
      resetFormFields({ keepUser: true });
      notifySuccess(authMode === "register" ? "Registration successful!" : "Login successful!");
    } finally {
      isSubmitting = false;
    }
  }

  async function resetUid() {
    if (!confirm("Are you sure you want to sign out?")) return;
    await clearSessionLocally({ loadDefaults: false });
    resetFormFields();
    authMode = "login";
    notifySuccess("You have been signed out.");
  }

  onMount(setup);
</script>

{#if userIsRegistered}
  <div class="auth-card">
    <img src="/images/AikiLogo.svg" alt="Aiki logo" class="auth-card-icon" />
    <h2 class="auth-card-title">Account:</h2>

    <div class="auth-field-wrap" style="text-align: center;">
      <label class="auth-label" for="id-input-field">Signed in as <span class="highlighted-text">{user}</span></label>
    </div>

    <button class="btn btn-danger sign-out-btn" on:click={resetUid}>
      <Fa icon={faUserSlash} /> Sign Out
    </button>
  </div>

{:else}
  <div class="auth-card">
    <img src="/images/AikiLogo.svg" alt="Aiki logo" class="auth-card-icon" />

    <h2 class="auth-card-title">
      {authMode === "register" ? "Create Account" : "Sign In"}
    </h2>

    <form class="auth-form" on:submit|preventDefault={submitAuth}>

      {#if authMode === "register"}
        <div class="auth-field-wrap">
          <label class="auth-label" for="id-input-field">Email</label>
          <input
            id="id-input-field"
            bind:value={user}
            type="email"
            class="form-control auth-input"
            placeholder="example@email.com"
            autocomplete="email"
            required
            on:blur={() => { user = normalizeUser(user); }}
          />
        </div>

        <div class="auth-field-wrap">
          <label class="auth-label" for="password-field">Password</label>
          <input
            id="password-field"
            type="password"
            bind:value={password}
            class="form-control auth-input"
            placeholder="Enter password"
            autocomplete="new-password"
            required
          />
          <span class="auth-helper-text">Must contain at least 4 characters</span>
        </div>

        <div class="auth-field-wrap">
          <label class="auth-label" for="confirm-password-field">
            Confirm Password <span class="required-star">*</span>
          </label>
          <input
            id="confirm-password-field"
            bind:value={confirmPassword}
            type="password"
            class="form-control auth-input"
            placeholder="Re-enter password"
            autocomplete="new-password"
            required
          />
        </div>

        <div class="auth-field-wrap">
          <label class="auth-label" for="confirm-password-field">
            Invite code (optional)
          </label>
          <input
            bind:value={inviteCode}
            type="text"
            class="form-control auth-input"
            placeholder="Invite code (optional)"
          />
        </div>

        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            id="research-participant-checkbox"
            bind:checked={isResearchParticipant}
            required
          />
          <label class="privacy-notice" for="research-participant-checkbox">
            By checking this box you agree to our
            <span class="auth-switch-link">Privacy Notice</span>
          </label>
        </div>

      {:else}
        <!-- LOGIN MODE -->
        <div class="auth-field-wrap">
          <label class="auth-label" for="id-input-field">Email</label>
          <input
            id="id-input-field"
            bind:value={user}
            type="email"
            class="form-control auth-input"
            placeholder="example@email.com"
            autocomplete="email"
            on:blur={() => { user = normalizeUser(user); }}
          />
        </div>

        <div class="auth-field-wrap">
          <label class="auth-label" for="password-field">Password</label>
          <input
            id="password-field"
            type="password"
            bind:value={password}
            class="form-control auth-input"
            placeholder="Enter password"
            autocomplete="current-password"
          />
        </div>
      {/if}

      <button class="btn btn-primary submit-button" type="submit" disabled={isSubmitting}>
        <Fa icon={faUserPlus} />
        {isSubmitting ? "Please wait..." : authMode === "register" ? "Create Account" : "Login"}
      </button>

      <div class="auth-switch-copy">
        {#if authMode === "register"}
          <span>Already have an account?
            <a href="#login" class="auth-switch-link"
              on:click|preventDefault={() => { authMode = "login"; resetFormFields({ keepUser: true }); }}>
              Log In
            </a>
          </span>
        {:else}
          <span>Don't have an account?
            <a href="#register" class="auth-switch-link"
              on:click|preventDefault={() => { authMode = "register"; resetFormFields({ keepUser: true }); }}>
              Sign up here
            </a>
          </span>
        {/if}

        <span>Or continue as a
          <a href="#guest" class="auth-switch-link"
            on:click|preventDefault={async () => {
              await clearSessionLocally({ loadDefaults: true });
              await persistSessionLocally("guest", null);
              notifySuccess("You are now signed in as a guest.");
            }}>
            guest
          </a>
        </span>
      </div>

    </form>
  </div>
{/if}

<style>
  /* Card shell */
  .auth-card {
    background-color: var(--backgroundColorSecondary);
    color: var(--textColor);
    border-radius: 16px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
    padding: 2rem 2rem 1.75rem;
    width: 100%;
    max-width: 26rem;          
    margin: 0 auto;            /* center it in the settings column */
    display: flex;
    flex-direction: column;
    align-items: center;       /* all children centered */
    gap: 0;
  }

  /* Logo icon at the top */
  .auth-card-icon {
    width: 3rem;
    height: 3rem;
    margin-bottom: 0.5rem;
  }

  .auth-card-title {
    font-family: var(--fontHeaders), serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--textColor);
    margin: 0 0 1.25rem 0;
    text-align: center;
  }

  /* Form fills the card width */
  .auth-form {
    display: flex;
    flex-direction: column;
    align-items: stretch;      /* fields stretch to card width */
    gap: 0.75rem;
    width: 100%;
  }

  /* Each label+input pair */
  .auth-field-wrap {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .auth-label {
    font-family: var(--fontContent), serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--textColor);
  }

  .required-star {
    color: var(--buttonPrimary, #f97316);
  }

  .auth-input,
  .signed-in-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  /* Helper text below a field (e.g. "Must contain at least 4 characters") */
  .auth-helper-text {
    font-size: 0.75rem;
    color: var(--textColorSecondary, rgba(255,255,255,0.6));
    margin-top: 0.1rem;
  }

  /* Submit button spans the full card width */
  .submit-button {
    width: 100%;
    margin-top: 0.5rem;
    border-radius: 999px;      /* pill shape matching the screenshot */
    font-weight: 700;
    padding: 0.65rem 0;
  }

  .sign-out-btn {
    margin-top: 0.75rem;
  }

  /* Footer links, centered */
  .auth-switch-copy {
    display: flex;
    flex-direction: column;
    align-items: center;       /* centered, not left-aligned */
    gap: 0.2rem;
    margin-top: 0.75rem;
    font-size: 0.85rem;
    text-align: center;
  }

  .auth-switch-link {
    color: var(--buttonPrimary, #007bff);
    cursor: pointer;
    text-decoration: underline;
  }

  /* Privacy checkbox row */
  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-wrapper label {
    cursor: pointer;
  }

  .privacy-notice {
    font-size: 0.85rem;
  }

  .highlighted-text {
    color: #3378b4;
    font-weight: 600;
  }
</style>