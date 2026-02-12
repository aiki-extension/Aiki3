<!-- This acts as a default container for all blocks in our settings page. 
Other components are placed into the <slot> element of this component 
Used in / Parent components: /src/Pages/Settings.svelte	
-->
<script>
  export let headline;
  export let id = "";
</script>

<h4>{headline}</h4>
<div {id} class="container">
  <slot />
</div>

<style>
  h4 {
    font-family: var(--fontHeaders);
    color: var(--textColor);
  }

  .container {
    background-color: var(--backgroundColorSecondary);
    color: var(--textColor);
    border: var(--borderColor);
    border-radius: 10px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
    margin: 0 0 1em 0;
    padding: 1.5em;
    width: 100%;
  }
</style>
