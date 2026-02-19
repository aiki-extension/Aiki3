<!-- 
  TODO: Description goes here
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import storage from "../../../util/storage";
  import { saveUserPreferences } from "../../../util/logger";

  export let settings;
  export let update;
  export let user;

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
    storage.operatingHours.to.set(setting);
    try {
      const participantId = user || (await storage.uid.get());
      const startMinutes = hrsFrom * 60 + minFrom;
      const endMinutes = hrsTo * 60 + minTo;
      await saveUserPreferences({
        participantId,
        operating_hours_start: startMinutes,
        operating_hours_end: endMinutes,
      });
    } catch (e) {
      console.warn("Failed to sync operating hours preference", e);
    }
    update();
  }

  // This function updates the "from" time in storage and attempts to sync the preference with the server.
  async function setActiveFrom() {
    // If "from" time is after "to" time, auto-advance "to" time by 1 minute
    const fromTotal = hrsFrom * 60 + minFrom;
    let toTotal = hrsTo * 60 + minTo;

    if (toTotal <= fromTotal) {
      toTotal = fromTotal + 1; 
      hrsTo = Math.floor(toTotal / 60) % 24;
      minTo = toTotal % 60;
      storage.operatingHours.to.set({ hrs: hrsTo, min: minTo });
    }

    const setting = { hrs: hrsFrom, min: minFrom };
    storage.operatingHours.from.set(setting);
    try {
      const participantId = user || (await storage.uid.get());
      const startMinutes = hrsFrom * 60 + minFrom;
      const endMinutes = hrsTo * 60 + minTo;
      await saveUserPreferences({
        participantId,
        operating_hours_start: startMinutes,
        operating_hours_end: endMinutes,
      });
    } catch (e) {
      console.warn("Failed to sync operating hours preference", e);
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

  select,
  option {
    font-family: var(--fontContent);
    font-size: 0.875rem;
    color: #212121;
  }

  option:disabled {
    background-color: whitesmoke;
    color: lightgray;
  }
</style>
