<!-- Entry component rendered into body of index.html. 
    Imports both Pages and Popup components.
    Uses a switch to set selected component based on search parameters in the window.location.
    svelte:component is used to dynamically paint selected component.
    // TODO: More documentation in this file
-->
<script>
import Popup from './Pages/Popup.svelte'
import Options from './Pages/Settings.svelte'
import Alerts from './Pages/Components/Alerts/AlertContainer.svelte'

let selected = Popup;

switch (new URL(window.location).searchParams.get("page")) {
    case "settings":
        selected = Options;
        break;
    default:
        selected = Popup;
        break;
}
</script>

<svelte:component this={selected} />

<!-- Root level container, able to access *store anywhere -->
<Alerts/>