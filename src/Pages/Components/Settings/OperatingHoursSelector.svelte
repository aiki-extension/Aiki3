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

  // reactive normalization
  $: {
    const fromTotal = hrsFrom * 60 + minFrom;
    let toTotal = hrsTo * 60 + minTo;

    if (toTotal <= fromTotal) {
      toTotal = fromTotal + 1; 
      hrsTo = Math.floor(toTotal / 60) % 24;
      minTo = toTotal % 60;
    }
  }

  async function setActiveTo() {
    normalizeToTime();
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

  async function setActiveFrom() {
    normalizeToTime();
    if (hrsTo < hrsFrom) {
      hrsTo = hrsFrom === 24 ? hrsFrom : hrsFrom + 1;

      storage.operatingHours.from.set({ hrs: hrsTo, min: minTo });
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

<!-- ActiveFrom -->
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
          on:change={() => {
            hrsFrom = Math.max(0, Math.min(23, parseInt(hrsFrom) || 0));
            normalizeToTime();
            setActiveFrom();
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
          on:change={() => {
            minFrom = Math.max(0, Math.min(59, parseInt(minFrom) || 0));
            normalizeToTime();
            setActiveFrom();
          }}
          class="form-control form-control-sm inline"
        />
      <p><small>{"Hrs/Min"}</small></p>
    </div>
  </div>
</div>

<!-- ActiveTo -->
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
          on:change={() => {
            hrsTo = Math.max(0, Math.min(23, parseInt(hrsTo) || 0));
            setActiveTo();
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
          on:change={() => {
            minTo = Math.max(0, Math.min(59, parseInt(minTo) || 0));
            setActiveTo();
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
