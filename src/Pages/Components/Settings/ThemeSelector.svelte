<!--
    Allows the user to choose a theme for the application.
    Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import Fa from "svelte-fa";
  import {
    setTheme,
    getTheme,
    drawDarkMode,
    drawLightMode,
    drawBlueMode,
    drawZeeguuMode,
  } from "../../../util/themes";
  import {
    faMoon,
    faSun,
    faCrow,
    faBookReader,
  } from "@fortawesome/free-solid-svg-icons";

  let isOpen = false;
  let themePromise = getTheme();

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function changeTheme(input) {
    switch (input) {
      case "light":
        drawLightMode();
        setTheme(input);
        break;

      case "dark":
        drawDarkMode();
        setTheme(input);
        break;

      case "blue":
        drawBlueMode();
        setTheme(input);
        break;

      case "zeeguu":
        drawZeeguuMode();
        setTheme(input);
        break;
    }
    themePromise = getTheme();
  }
</script>

<div class="dropdown" class:show={isOpen}>
  <button
    class="btn btn-secondary dropdown-toggle"
    type="button"
    id="dropdownMenu2"
    aria-haspopup="true"
    aria-expanded={isOpen}
    on:click={toggleDropdown}
  >
    Themes
  </button>
  {#if isOpen}
    <div class="dropdown-menu show" aria-labelledby="dropdownMenu2">
      {#await themePromise}
        LOADING...
      {:then theme}
        <button
          type="button"
          class="dropdown-item btn btn-light item"
          disabled={theme === "light"}
          on:click={() => { changeTheme("light"); isOpen = false; }}
        >
          <Fa icon={faSun} /> Light
        </button>
        <button
          type="button"
          class="dropdown-item btn btn-dark item"
          disabled={theme === "dark"}
          on:click={() => { changeTheme("dark"); isOpen = false; }}
        >
          <Fa icon={faMoon} /> Dark
        </button>
        <button
          type="button"
          class="dropdown-item btn btn-info item"
          disabled={theme === "blue"}
          on:click={() => { changeTheme("blue"); isOpen = false; }}
        >
          <Fa icon={faCrow} /> Blue
        </button>
        <button
          type="button"
          class="dropdown-item btn btn-warning item"
          disabled={theme === "zeeguu"}
          on:click={() => { changeTheme("zeeguu"); isOpen = false; }}
        >
          <Fa icon={faBookReader} /> Zeeguu
        </button>
      {/await}
    </div>
  {/if}
</div>

<style>
  .dropdown-menu.show {
    display: block;
  }
</style>
