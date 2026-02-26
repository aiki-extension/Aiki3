<!-- 
  Statistics display component.
  Used in / Parent components: /src/Pages/Components/Settings/Statistics.svelte
-->
<script>
  export let type = "today";

  let loading = false;
  let error = "Statistics unavailable.";
  let stats = null;
  let noStats = false;
</script>

{#if loading}
  <div class="loading-state">
    <p>Loading statistics...</p>
  </div>
{:else if error}
  <div class="error-state">
    <p>{error}</p>
  </div>
{:else if noStats}
  <div class="empty-state">
    <h5>No stats for {windowLabel.toLowerCase()} yet.</h5>
    <p>Come back after a browsing session to see your progress.</p>
  </div>
{:else}
  <div class="stats-grid">
    <div class="stat-card learning">
      <span class="stat-label">Total Learning Time</span>
      <span class="stat-value">{formatDuration(stats.learningSeconds)}</span>
      <span class="stat-helper">{stats.learningSessionCount} session{stats.learningSessionCount !== 1 ? 's' : ''} {windowLabel.toLowerCase()}</span>
    </div>

    <div class="stat-card procrastination">
      <span class="stat-label">Total Procrastination Time</span>
      <span class="stat-value">{formatDuration(stats.procrastinationSeconds)}</span>
      <span class="stat-helper">{stats.procrastinationSessionCount} session{stats.procrastinationSessionCount !== 1 ? 's' : ''} {windowLabel.toLowerCase()}</span>
    </div>

    <div class="stat-card average">
      <span class="stat-label">Avg Learning Session</span>
      <span class="stat-value">{formatDuration(stats.avgLearningSessionSeconds)}</span>
      <span class="stat-helper">Average duration per session</span>
    </div>

    <div class="stat-card average-proc">
      <span class="stat-label">Avg Procrastination Session</span>
      <span class="stat-value">{formatDuration(stats.avgProcrastinationSessionSeconds)}</span>
      <span class="stat-helper">Average duration per session</span>
    </div>
  </div>
{/if}

<style>
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 0;
    color: var(--textColor);
  }

  .empty-state h5,
  .error-state p {
    margin: 0;
    font-size: 1rem;
  }

  .empty-state p,
  .loading-state p {
    margin: 0;
    font-family: var(--fontContent);
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .stat-card {
    background: var(--backgroundColorSecondary);
    border: 1px solid var(--hrColor);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 120px;
  }

  .stat-card.learning {
    border-left: 4px solid #22c55e;
  }

  .stat-card.procrastination {
    border-left: 4px solid #ef4444;
  }

  .stat-card.average {
    border-left: 4px solid #3b82f6;
  }

  .stat-card.average-proc {
    border-left: 4px solid #f97316;
  }

  .stat-label {
    font-size: 0.8rem;
    font-family: var(--fontContent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
    color: var(--textColor);
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: 700;
    font-family: var(--fontHeaders);
    color: var(--textColor);
  }

  .stat-helper {
    font-size: 0.85rem;
    opacity: 0.6;
    font-family: var(--fontContent);
    color: var(--textColor);
  }
</style>
