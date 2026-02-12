<!-- This component is rendered as a block on the settings 
  page for users to input their UID for logging purposes.
  Used in / Parent components: /src/Pages/Settings.svelte
-->
<script>
  import Container from "./Container.svelte";
  import storage from "../../../util/storage";
  import { logAuditEvent, resetParticipantCache } from "../../../util/logger";
  import Fa from "svelte-fa";
  import { faUserSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";

  export let user = "";
  export let userIsRegistered;
  export let port;
  let toastCoords = { y: "id-input-field", x: "user-settings" };
  let previousUser = "";
  let emailTouched = false;
  let emailError = "";
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function normalizeUser(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isValidEmail(value) {
    return basicEmailRegex.test(value);
  }

  function validateEmail({ requireValue = true } = {}) {
    const normalizedUser = normalizeUser(user);
    if (!normalizedUser) {
      emailError = requireValue ? "Please enter your email before submitting." : "";
      return false;
    }

    if (!isValidEmail(normalizedUser)) {
      emailError =
        "Please enter a valid email address (for example: name@mail.com).";
      return false;
    }

    emailError = "";
    return true;
  }

  function handleEmailInput() {
    if (!emailTouched) return;
    emailTouched = false;
    emailError = "";
  }

  async function setup() {
    user = normalizeUser(await storage.uid.get());
    userIsRegistered = user !== "" ? true : false;
    previousUser = user || "";
  }

  async function confirmUid() {
    emailTouched = false;
    emailError = "";

    const normalizedUser = normalizeUser(user);
    user = normalizedUser;

    if (!validateEmail()) {
      emailTouched = true;
      toast.push(emailError || "Please enter a valid email address.", {
        theme: themes.warningTheme(toastCoords),
      });
      return;
    }

    const confirmation = confirm(
      "Are you certain the provided email is correct?"
    );
    if (confirmation) {
      const oldValue = previousUser || "";
      await resetParticipantCache();
      await storage.uid.set(normalizedUser);
      previousUser = normalizedUser;
      await logAuditEvent({
        participantId: normalizedUser,
        action: "register_participant",
        settingName: "participant_id",
        oldValue,
        newValue: normalizedUser,
        participantUpdates: { is_extension_active: true },
      });
      userIsRegistered = true;
      emailError = "";
      port.postMessage(`Update: user`);
      setTimeout(() => {
        toast.push("User registered!", {
          theme: themes.successTheme(toastCoords),
        });
      }, 500);
    }
  }

  async function resetUid() {
    const confirmation = confirm(
      "Are you certain you want to reset your email?"
    );
    if (confirmation) {
      const oldValue = previousUser || user;
      await logAuditEvent({
        participantId: user,
        action: "reset_participant",
        settingName: "participant_id",
        oldValue,
        newValue: "",
        participantUpdates: { is_extension_active: false },
      });
      await resetParticipantCache();
      await storage.uid.set("");
      userIsRegistered = false;
      user = "";
      previousUser = "";
      emailTouched = false;
      emailError = "";
      port.postMessage(`Update: user`);
    }
  }

  setup();
</script>

<Container id="user-settings" headline="Register Email">
  {#if userIsRegistered}
    <h5>Registered Email:</h5>
    <input
      id="id-input-field"
      class="form-control"
      type="text"
      placeholder={user}
      readonly
    />
    <button
      class="btn btn-danger"
      on:click={resetUid}
      data-tooltip="Removes your email. 
      WARNING: Aiki cannot log your activity if you do not provide it with an email."
      ><Fa icon={faUserSlash} /> Remove Email</button
    >
  {:else}
    <h5>Add your email here so we can log your activity:</h5>
    <hr />
    <p>
      <strong>Note:</strong> Please use the same email you used when signing up for this study.
    </p>
    <p>
      Secondly, please note that you may be asked to re-enter your email if you
      clear your cache or browser history, in order for us to resume logging.
    </p>
    <p>
      If you have any questions or problems, contact <a
        href="mailto:wabe@itu.dk">wabe@itu.dk</a
      >
      for assistance.
    </p>

    <hr />
    <!-- Bootstrap Input field. -->
    <!-- https://getbootstrap.com/docs/4.0/components/input-group/ -->
    <div class="input-group mb-3">
      <input
        id="id-input-field"
        bind:value={user}
        type="email"
        class="form-control"
        class:is-invalid={emailTouched && !!emailError}
        placeholder="Enter your email here..."
        autocomplete="email"
        required
        aria-label=""
        aria-describedby="basic-addon2"
        aria-invalid={emailTouched && !!emailError}
        on:input={handleEmailInput}
      />
      <div class="input-group-append">
        <button on:click={confirmUid} class="btn btn-primary" type="button"
          ><Fa icon={faUserPlus} /> Submit</button
        >
      </div>
    </div>
    {#if emailTouched && emailError}
      <div class="invalid-feedback d-block">{emailError}</div>
    {/if}
  {/if}
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
</style>
