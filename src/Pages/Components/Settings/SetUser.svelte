<!-- This component is rendered as a block on the settings 
  page for users to register or log in with their email.
  Used in / Parent components: /src/Pages/Settings.svelte
-->
<script>
  import { onMount } from "svelte";
  import Container from "./Container.svelte";
  import storage from "../../../util/storage";
  import Fa from "svelte-fa";
  import { faUserSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";

  export let user = "";
  export let userIsRegistered;
  export let port;
  const toastCoords = { y: "id-input-field", x: "user-settings" };
  let authMode = "login";
  let password = "";
  let confirmPassword = "";
  let isSubmitting = false;
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  }
  
  function isValidEmail(value) {
    return basicEmailRegex.test(value);
  }

  function notifyWarning(message) {
    toast.push(message, {
      theme: themes.warningTheme(toastCoords),
    });
  }

  function notifySuccess(message) {
    toast.push(message, {
      theme: themes.successTheme(toastCoords),
    });
  }

  function persistSessionLocally(nextUser, token) {
    storage.uid.set(nextUser);
    // TODO(api): Save the JWT returned from the backend in storage, fx: storage.token.set(token);
    
    void token; // Temporary: keep `token` referenced until backend JWT storage is implemented.
    
    user = nextUser;
    userIsRegistered = true;
    port?.postMessage("Update: user");
  }

  function clearSessionLocally() {
    storage.uid.set("");
    user = "";
    userIsRegistered = false;
    port?.postMessage("Update: user");
  }

  async function authenticateWithBackend({ mode, email, plainTextPassword }) {
    // TODO(api): Use a real auth call when backend integration has been set up.
    // If auth mode is login:
    if (authMode === "login") {
      // call login function with login endpoint
    } else if (authMode === "register") {
      // call register function with register endpoint
    }
    
    
    // Temporary: these placeholders prevent unused-parameter warnings until
    // login/register backend requests are implemented.
    void email;
    void plainTextPassword;
    void mode;
    return { ok: true, message: "", token: null };
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

  function setup() {
    user = normalizeUser(storage.uid.get());
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
      });

      if (!authResult?.ok) {
        notifyWarning(authResult?.message || "Authentication failed. Please try again.");
        return;
      }

      persistSessionLocally(normalizedUser, authResult.token);
      resetFormFields({ keepUser: true });
      notifySuccess(authMode === "register" ? "Registration successful!" : "Login successful!");
    } finally {
      isSubmitting = false;
    }
  }

  function resetUid() {
    if (!confirm("Are you sure you want to sign out?")) {
      return;
    }

    // Sign-out is local-only. Clear the stored session (uid + JWT).
    // TODO(api): Also clear JWT when token is implemented.
    clearSessionLocally();
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
