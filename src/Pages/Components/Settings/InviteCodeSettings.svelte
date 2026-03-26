<script>
  import { onMount } from "svelte";
  import storage from "../../../util/storage";
  import { alertStore } from "../../../services/alertService";
  import { MESSAGE_API_UPDATE_INVITE_CODE } from "../../../values/messageTypeValues";

  let inviteCode = "";
  let savedInviteCode = "";

  onMount(async () => {
    inviteCode = (await storage.inviteCode.get()) ?? "";
    savedInviteCode = inviteCode;
  });

  async function saveInviteCode() {
    try {
      const result = await browser.runtime.sendMessage({
        type: MESSAGE_API_UPDATE_INVITE_CODE,
        inviteCode,
      });
      const ok = result?.ok;

      if (ok) {
        storage.inviteCode.set(inviteCode);
        savedInviteCode = inviteCode; // update the saved value on success
      } else {
        inviteCode = savedInviteCode; // revert the input
      }

      alertStore.add({
        type: ok ? "success" : "error",
        message: ok
          ? "Invite code updated successfully."
          : `${result?.message || "Failed to update to the server. Please try again."}`,
      });
    } catch (error) {
      console.error("Error updating invite code:", error);
      inviteCode = savedInviteCode; // revert the input on error too
      alertStore.add({
        type: "warning",
        message: "Failed to update to the server. Please try again.",
      });
    }
  }
</script>

<h5>Invite Code:</h5>

<div class="row">
  <div class="col-sm">
    <p>Enter your invite code:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <input
      type="text"
      bind:value={inviteCode}
      on:blur={saveInviteCode}
      on:keypress={(e) => {
        if (e.key === "Enter") e.target.blur();
      }}
      class="form-control form-control-sm"
      placeholder="Enter invite code"
    />
  </div>
</div>

<style>
  p {
    padding: 0;
    margin-bottom: 1.5rem;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  h5 {
    font-family: var(--fontHeaders);
  }
</style>