<!-- 
  TODO: Description goes here
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
  import Container from "./Container.svelte";
  import storage from "../../../util/storage";
  import { saveUserPreferences } from "../../../util/logger";
  import { parseUrl } from "../../../util/utilities";
  import Fa from "svelte-fa";
  import {
    faTrashAlt,
    faGlobe,
    faKeyboard,
    faTimes,
    faPlusCircle
  } from "@fortawesome/free-solid-svg-icons";
  import { toast } from "@zerodevx/svelte-toast";
  import * as themes from "./util/toastThemes";
  

  export let user = "";
  export let port;
  $: list = [];

  let toastCoords = { y: "add-button", x: "site-input-container" };
  let syncingPrefs = false;

  async function setup() {
    const storedList = (await storage.list.get()) || [];
    let hasUpdates = false;
    const normalizedList = storedList.map((item) => {
      if (!item || !item.host) {
        return item;
      }

      const parsed = parseUrl(item.host);
      const updatedItem = {
        ...item,
        host: parsed.host || item.host,
        name: parsed.name || item.name,
      };

      if (updatedItem.host !== item.host || updatedItem.name !== item.name) {
        hasUpdates = true;
      }

      return updatedItem;
    });

    list = normalizedList;

    if (hasUpdates) {
      storage.list.set(normalizedList);
    }
  }
  setup();
  let addItemValue = "";

  async function removeItem(index) {
    let newList = [...list];
    newList.splice(index, 1);
    list = newList;
    await storage.list.set(list);
    await syncPreferences();
    try { port?.postMessage(`Update: list`); } catch (_) {}
    toast.pop();
    toast.push("Website removed!", {
      theme: themes.successTheme(toastCoords),
    });
  }

  async function addItem() {
    if (addItemValue === "") {
      return;
    }
    let site = parseUrl(addItemValue);
    if (list.find((item) => item.name == site.name)) {
      toast.pop();
      toast.push("Website already in list.", {
        theme: themes.infoTheme(toastCoords),
      });
      return;
    }
    let status = await pingSite(site.host);
    if (status) {
      let newList = [...list];
      newList.push(site);
      list = newList;
      await storage.list.set(list);
      await syncPreferences();
      try { port?.postMessage(`Update: list`); } catch (_) {}
      addItemValue = "";
      toast.pop();
      toast.push("New Website Added!", {
        theme: themes.successTheme(toastCoords),
      });
    }
  }

  async function pingSite(site) {
    try {
      
      await fetch(`https://${site}/`, { 
        mode: 'no-cors',
        method: 'HEAD'
      });
      return true;
    } catch (error) {

      const confirmation = confirm(
        `We could not reach https://${site}/. This may mean the website does not exist.\n\n` +
        `Please check the spelling or copy-paste the website address.\n\n` +
        `If you are certain it is correct, click "OK" to add it anyway.`
      );
      return confirmation;
    }
  }

  async function syncPreferences() {
    if (syncingPrefs) return;
    syncingPrefs = true;
    try {
      const participantId = user || (await storage.uid.get());
      const procrastinationSites = Array.isArray(list)
        ? list.map((item) => item?.host).filter(Boolean)
        : [];
      await saveUserPreferences({
        participantId,
        procrastination_sites: procrastinationSites,
      });
    } catch (_) {
    } finally {
      syncingPrefs = false;
    }
  }

  function firstLetterUppercase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
</script>

<Container id="site-input-container" headline="Set Time Wasting Sites">
  <hr />
  <p>
    Type in pages you feel like you spend a little too much time on here (e.g:
    www.facebook.com, www.reddit.com, 9gag.com).
  </p>
 

  <form on:submit|preventDefault={addItem}>
    <div data-tooltip="Add to your list of procrastination sites">
      <div class="input-group mb-3">
        <input
          bind:value={addItemValue}
          id="addItem"
          type="text"
          class="form-control"
          placeholder="Enter a time wasting site here..."
          aria-label=""
          aria-describedby="basic-addon2"
        />
        <div class="input-group-append">
          <button id="add-button" class="btn btn-primary" type="submit"
            ><Fa icon={faPlusCircle} /> Add Site</button
          >
        </div>
      </div>
    </div>
  </form>

  {#if list.length > 0}
    <table>
      <thead>
        <tr>
          <th scope="col"><Fa icon={faKeyboard} /> Page Name</th>
          <th scope="col"><Fa icon={faGlobe} /> Page URL</th>
          <th scope="col" style="text-align: center"
            ><Fa icon={faTrashAlt} /> Remove Site</th
          >
        </tr>
      </thead>
      <tbody>
        {#each list as item, index}
          <tr>
            <th scope="row"
              ><img
                class="webFavicon"
                src={`https://${item.host}/favicon.ico`}
                alt="Favicon"
                on:error={(event) => event.target.remove()}
              />
              {firstLetterUppercase(item.name)}
            </th>
            <td class="hostName">
              {item.host}
            </td>
            <td style="text-align: center">
              <button
                type="button"
                class="remove-site-button"
                aria-label={`Remove ${item.host} from the list`}
                data-tooltip="Remove this site from the list."
                on:click={() => removeItem(index)}
              >
                <Fa icon={faTimes} primaryColor="red" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <!-- Add pagination for more than 10 sites? -->
</Container>

<style>
  table {
    width: 100%;
  }

  thead {
    padding: 20px;
    color: var(--textColor);
    background-color: var(--theadBackgroundColor);
  }

  th {
    color: var(--textColor);
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
    border-bottom: 1px solid var(--hrColor);
    border-top: 1px solid var(--hrColor);
    padding: 15px;
  }

  td {
    font-size: var(--fontSizeSettings);
    color: var(--textColor);
    border-bottom: 1px solid var(--hrColor);
    font-family: var(--fontContent);
    padding: 15px;
  }

  td.hostName {
    font-family: "Lucida Console", "Courier New", monospace;
  }

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

  .webFavicon {
    width: 1.2em;
    height: 1.2em;
    margin-right: 10px;
  }

  .remove-site-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
</style>
