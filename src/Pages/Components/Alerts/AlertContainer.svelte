<script>
  import { alertStore } from '../../../services/alertService';
  import Alert from './AlertMessage.svelte';
</script>

<div class="alert-portal">
  {#each $alertStore as alert (alert.id)}
    <Alert {alert} />
  {/each}
</div>

<style>
  .alert-portal {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 9999; /* Keeps it on top of everything */
    display: flex;
    flex-direction: column;
    gap: 0.5rem; /* Space between stacked alerts */
    pointer-events: none; /* Lets you click the page behind empty space */
  }

  /* Reactivate clicks just for the alerts themselves */
  .alert-portal > :global(*) {
    pointer-events: auto;
  }
</style>