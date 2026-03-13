<script>
  import { fade, fly } from 'svelte/transition';
  import { alertStore } from './alertService';

  export let alert; // { id, type: 'success' | 'error' | 'warning' | 'info', message, dismissible, time }

  // Map types to specific icons or styles
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
</script>

<div 
  class="alert alert-{alert.type}" 
  in:fly={{ y: -20, duration: alert.time }} 
  out:fade
>
  <span class="icon">{icons[alert.type]}</span>
  <p>{alert.message}</p>
  <if alert.dismissible>
    <button on:click={() => alertStore.remove(alert.id)}>Close</button>
  </if>
</div>

<style>
  /* Base styles for all alerts */
  .alert { padding: 1rem; border-radius: 8px; display: flex; gap: 10px; }
  
  /* Type-specific styles */
  .alert-success { background: #F0EEE9; border: 1px solid #28a745; }
  .alert-error { background: #F0EEE9; border: 1px solid #dc3545; }
  .alert-info { background: #F0EEE9; border: 1px solid rgb(96, 81, 82); }
  .alert-warning { background: #F0EEE9; border: 1px solid #cb911d; }
</style>