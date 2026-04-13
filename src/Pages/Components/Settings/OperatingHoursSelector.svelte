<!-- 
  TODO: Description goes here
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import { alertStore } from "../../../services/alertService";
  import { 
    MESSAGE_API_UPDATE_OPERATING_HOURS_START,
    MESSAGE_API_UPDATE_OPERATING_HOURS_END
  } from "../../../values/messageTypeValues"

  export let settings;
  export let update;


  let { hrs: hrsFrom, min: minFrom } = settings.activeFrom;
  let { hrs: hrsTo, min: minTo } = settings.activeTo;

  // This function updates the "to" time in storage and attempts to sync the preference with the server.
  async function setActiveTo() {
    // Ensure "to" time is always after "from" time
    const fromTotal = hrsFrom * 60 + minFrom;
    let toTotal = hrsTo * 60 + minTo;
    if (toTotal <= fromTotal) {
      toTotal = fromTotal + 1;
      hrsTo = Math.floor(toTotal / 60) % 24;
      minTo = toTotal % 60;
    }

    const setting = { hrs: hrsTo, min: minTo };
    
    // Update "to" time in local storage
    storage.operatingHours.to.set(setting);

    // Update "to" time on the backend
    try {
      const result = await browser.runtime.sendMessage({ type: MESSAGE_API_UPDATE_OPERATING_HOURS_END, to: setting });
      const ok = result?.ok;
      alertStore.add({
        type: ok ? 'success' : 'error',
        message: ok
          ? "Operating hours updated successfully."
          : "Failed to update to the server. Please try again.",
      });
    } catch {
      alertStore.add({
        type: 'warning',
        message: "Failed to update to the server. Please try again.",
      });
    }
    update();
  }

  // This function updates the "from" time in storage and attempts to sync the preference with the server.
  async function setActiveFrom() {
    // If "from" time is after "to" time, auto-advance "to" time by 1 minute
    const fromTotal = hrsFrom * 60 + minFrom;
    let toTotal = hrsTo * 60 + minTo;

    // Auto-advance "to" if it would no longer be after "from"
    if (toTotal <= fromTotal) {
      toTotal = fromTotal + 1;
      hrsTo = Math.floor(toTotal / 60) % 24;
      minTo = toTotal % 60;
      storage.operatingHours.to.set({ hrs: hrsTo, min: minTo });
    }

    const setting = { hrs: hrsFrom, min: minFrom };

    // Update "from" time in local storage
    storage.operatingHours.from.set(setting);

    // Update "from" time on the backend
    try {
      const result = await browser.runtime.sendMessage({ type: MESSAGE_API_UPDATE_OPERATING_HOURS_START, from: setting });
      const ok = result?.ok;
      alertStore.add({
        type: ok ? 'success' : 'error',
        message: ok
          ? "Operating hours updated successfully."
          : "Failed to update to the server. Please try again.",
      });
    } catch {
      alertStore.add({
        type: 'warning',
        message: "Failed to update to the server. Please try again.",
      });
    }

    update();
  }


</script>

<!-- This is the button from when Aiki should start, it can start from midnight to 11:59 o'clock-->
<div class="row">
  <div class="col-sm">
    <p>Aiki will turn <strong>ON</strong> at this time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <div class="wrapper">
      <!-- svelte-ignore a11y-no-onchange -->
      <input
          type="number"
          min="0"
          max="23"
          title="Enter a value between 0 and 23"
          bind:value={hrsFrom}
          on:blur={() => {
            hrsFrom = Math.max(0, Math.min(23, parseInt(hrsFrom) || 0));
            setActiveFrom();
          }}
          on:keypress={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
            }
          }}
          class="form-control form-control-sm inline"
        />
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
      <input
          type="number"
          min="0"
          max="59"
          title="Enter a value between 0 and 59"
          bind:value={minFrom}
          on:blur={() => {
            minFrom = Math.max(0, Math.min(59, parseInt(minFrom) || 0));
            setActiveFrom();
          }}
          on:keypress={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
            }
          }}
          class="form-control form-control-sm inline"
        />
      <p><small>{"Hrs/Min"}</small></p>
    </div>
  </div>
</div>

<!-- This is the button For when Aiki should turn OFF the turn off time, cant be below the start time -->
<div class="row">
  <div class="col-sm">
    <p class="header-p">Aiki will turn <strong>OFF</strong> at this time:</p>
  </div>
  <div class="col-sm" />
  <div class="col-sm">
    <!-- svelte-ignore a11y-no-onchange -->
    <div class="wrapper">
       <input
          type="number"
          min="0"
          max="23"
          title="Enter a value between 0 and 23"
          bind:value={hrsTo}
          on:blur={() => {
            hrsTo = Math.max(0, Math.min(23, parseInt(hrsTo) || 0));
            setActiveTo();
          }}
          on:keypress={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
            }
          }}
          class="form-control form-control-sm inline"
        />
      <p>:</p>
      <!-- svelte-ignore a11y-no-onchange -->
        <input
          type="number"
          min="0"
          max="59"
          title="Enter a value between 0 and 59"
          bind:value={minTo}
          on:blur={() => {
            minTo = Math.max(0, Math.min(59, parseInt(minTo) || 0));
            setActiveTo();
          }}
          on:keypress={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
            }
          }}
          class="form-control form-control-sm inline"
        />

      <p><small>{"Hrs/Min"}</small></p>
    </div>
  </div>
</div>

<style>
  .inline {
    display: inline !important;
    width: 25%;
    min-width: 55px;
    margin: 0px 5px 20px 0px;
  }

  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  p {
    display: inline;
    padding: 0;
    margin: 0px 5px 20px 0px;
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

</style>
