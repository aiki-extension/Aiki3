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

  async function authenticateWithBackend({ mode, email, plainTextPassword, inviteCode }) {
   const type = mode === "register" ? MESSAGE_API_REGISTER : MESSAGE_API_LOGIN;
   try {
     const result = await browser.runtime.sendMessage({
        type,
        email,
        password: plainTextPassword,
        ...(mode === "register" && inviteCode ? { inviteCode } : {}) // Only include inviteCode if we're in register mode and it's provided
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
        inviteCode
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

<Container id="user-settings" headline="Account Access">
  {#if userIsRegistered}
    <!--
    We will have to rethink showing the mail,
    since it will be encrypted in the database.
    An idea is to make the user input a mail, and
    make a check upon the hashed mail to see if there's a match.    
    -->
    <h5>Signed in email:</h5>
    <div class="auth-field-wrap">
      <input
        id="id-input-field"
        class="form-control signed-in-input"
        type="email"
        value={user}
        readonly
      />
    </div>
    <button
      class="btn btn-danger"
      on:click={resetUid}
      data-tooltip="Signs you out of Aiki. 
      WARNING: Aiki cannot log your activity if you are not signed in."
      ><Fa icon={faUserSlash} /> Sign Out</button
    >
  {:else}
    <h5>
      {#if authMode === "register"}
        Create your account
      {:else}
        Sign in to continue
      {/if}
    </h5>
    <div class="auth-form-wrap">
      <form class="auth-form" on:submit|preventDefault={submitAuth}>
        <input
          id="id-input-field"
          bind:value={user}
          type="email"
          class="form-control auth-input"
          placeholder="Enter your email here..."
          autocomplete="email"
          on:blur={() => {
            user = normalizeUser(user);
          }}
        />
        <input
          type="password"
          bind:value={password}
          class="form-control auth-input"
          placeholder="Enter your password..."
          autocomplete={authMode === "register" ? "new-password" : "current-password"}
        />

        {#if authMode === "register"}
          <input
            bind:value={confirmPassword}
            type="password"
            class="form-control auth-input"
            placeholder="Re-enter your password..."
            autocomplete="new-password"
          />

          <input
            bind:value={inviteCode}
            type="text"
            class="form-control auth-input"
            placeholder="Enter your invite code (optional)..."
          />

        {/if}

        <button class="btn btn-primary submit-button" type="submit" disabled={isSubmitting}>
          <Fa icon={faUserPlus} />
          {isSubmitting ? "Please wait..." : authMode === "register" ? "Register" : "Login"}
        </button>

        <div class="auth-switch-copy">
          {#if authMode === "register"}
            <span>Already have an account?
              <a
                href="#login"
                class="auth-switch-link"
                on:click|preventDefault={() => {
                  authMode = "login";
                  resetFormFields({ keepUser: true });
                }}
              >
                Log in here
              </a>
            </span>
          {:else}
            <span>Don't have an account?
              <a
                href="#register"
                class="auth-switch-link"
                on:click|preventDefault={() => {
                  authMode = "register";
                  resetFormFields({ keepUser: true });
                }}
              >
                Sign up here
              </a>
            </span>
          {/if}
          <!-- Guest login -->
          <span>
            Or continue as a
            <a
              href="#guest"
              class="auth-switch-link"
              on:click|preventDefault={async () => {
                await clearSessionLocally({ loadDefaults: true });
                await persistSessionLocally("guest", null);
                notifySuccess("You are now signed in as a guest.");
              }}
            >
              guest
            </a>
          </span>
        </div>
      </form>
    </div>

    <hr />
    <h5>Note</h5>
    <p>
      Please use the same email you used when signing up for this study.
    </p>
    <p>
      If you clear your cache or browser history, you may need to log in again
      before we can resume logging your activity.
    </p>
    <p>
      If you have any questions or problems, contact <a
        href="mailto:wabe@itu.dk">wabe@itu.dk</a
      >
      for assistance.
    </p>
  {/if}
</Container>

<style>
  h5 {
    font-family: var(--fontHeaders),serif;
  }

  p {
    font-family: var(--fontContent),serif;
    font-size: var(--fontSizeSettings);
  }

  hr {
    background-color: var(--hrColor);
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
  }

  .auth-form-wrap,
  .auth-field-wrap {
    width: min(100%, 20rem);
    max-width: 20rem;
  }

  .auth-input,
  .signed-in-input {
    display: block;
    width: 100% !important;
    max-width: 20rem !important;
    box-sizing: border-box;
    flex: 0 0 auto;
  }

  .submit-button {
    align-self: flex-start;
  }

  .auth-switch-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    margin-top: 0.15rem;
  }

  .auth-switch-link {
    color: var(--buttonPrimary, #007bff);
    cursor: pointer;
    text-decoration: underline;
  }
</style>