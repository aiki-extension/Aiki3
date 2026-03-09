<!-- This component is rendered as a block on the settings 
  page for users to input their UID for logging purposes.
  Used in / Parent components: /src/Pages/Settings.svelte
-->
<script>
  import Container from "./Container.svelte";
  import storage from "../../../util/storage";
  import Fa from "svelte-fa";
  import { faUserSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";

  export let user = "";
  export let userIsRegistered;
  export let port;
  let toastCoords = { y: "id-input-field", x: "user-settings" };
  let previousUser = "";

  async function setup() {
    user = await storage.uid.get();
    userIsRegistered = user !== "" ? true : false;
    previousUser = user || "";
  }

  async function confirmUid() {
    const confirmation = confirm(
      "Are you certain the provided email is correct?"
    );
    if (confirmation) {
      storage.uid.set(user);
      previousUser = user;
      userIsRegistered = true;
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
      storage.uid.set("");
      userIsRegistered = false;
      user = "";
      previousUser = "";
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
        bind:value={user}
        type="text"
        class="form-control"
        placeholder="Enter your email here..."
        aria-label=""
        aria-describedby="basic-addon2"
      />
      <div class="input-group-append">
        <button on:click={confirmUid} class="btn btn-primary" type="button"
          ><Fa icon={faUserPlus} /> Submit</button
        >
      </div>
    </div>
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
