<script>
  import { fade, fly } from 'svelte/transition';
  import { alertStore } from '../../../services/alertService';

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
  in:fly={{ x: -40, y: 0, duration: 600 }} 
  out:fade
>
  <span class="icon">{icons[alert.type]}</span>
  <p>{alert.message}</p>
  {#if alert.dismissible}
    <button class="close" on:click={() => alertStore.remove(alert.id)}>X</button>
  {/if}
</div>

<style>
  /* Base styles for all alerts */
  .alert { 
    padding: 1rem; 
    border-radius: 8px; 
    display: flex; 
    gap: 10px; 
  }

  .alert p {
    margin: 0;
    transform: translateY(2px); /* subtle downward nudge */
  }

  /* Type-specific styles */
  .alert-success { background: #F0EEE9; border: 1px solid #28a745; }
  .alert-error { background: #F0EEE9; border: 1px solid #dc3545; }
  .alert-info { background: #F0EEE9; border: 1px solid rgb(96, 81, 82); }
  .alert-warning { background: #F0EEE9; border: 1px solid #cb911d; }

  .close {
    position: absolute;
    top: 4px;
    right: 8px;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
</style>