<!-- This acts as a wrapper for the Chart.svelte
  component, retreiving and processing data before 
  rendering the Chart.
Used in / Parent components: /src/Pages/Settings.svelte	
-->
<script>
  export let data;
  export let type;

  //procTime and learnTime are in seconds. Probably need to refactor this.
  let skips = 0;
  let completed = 0;
  let procTime = 0;
  let learnTime = 0;

  let learnMinutes = 0;
  let procMinutes = 0;
  let noStats = false;
  let focusShare = null;
  let procrastShare = null;
  let summaryCards = [];

  const timeFrames = {
    today: "today",
    yesterday: "yesterday",
    history: "overall",
  };

  let windowLabel = timeFrames[type] || "this period";
  $: windowLabel = timeFrames[type] || "this period";

  function formatMinutes(value) {
    if (!value || value <= 0) return "0m";
    const hrs = Math.floor(value / 60);
    const mins = value % 60;
    const parts = [];
    if (hrs) parts.push(`${hrs}h`);
    if (mins) parts.push(`${mins}m`);
    return parts.join(" ") || "0m";
  }

  function selectRange() {
    switch (type) {
      case "today":
        return {
          skips: data.skipCount,
          completed: data.completedCount,
          procTime: data.sessionData.procrastinationDuration,
          learnTime: data.sessionData.learningDuration,
        };
      case "yesterday":
        return {
          skips: data.yesterday.skipCount,
          completed: data.yesterday.completedCount,
          procTime: data.yesterday.sessionData.procrastinationDuration,
          learnTime: data.yesterday.sessionData.learningDuration,
        };
      case "history":
        return {
          skips: data.history.skipCount,
          completed: data.history.completedCount,
          procTime: data.history.sessionData.procrastinationDuration,
          learnTime: data.history.sessionData.learningDuration,
        };
      default:
        return {
          skips: 0,
          completed: 0,
          procTime: 0,
          learnTime: 0,
        };
    }
  }

  $: {
    const range = selectRange();
    skips = range.skips || 0;
    completed = range.completed || 0;
    procTime = range.procTime || 0;
    learnTime = range.learnTime || 0;

    learnMinutes = Math.round(learnTime / 60);
    procMinutes = Math.round(procTime / 60);

    const totalTracked = learnMinutes + procMinutes;
    focusShare = totalTracked > 0 ? Math.round((learnMinutes / totalTracked) * 100) : null;
    procrastShare = totalTracked > 0 ? 100 - focusShare : null;
    noStats = totalTracked === 0;

    summaryCards = [
      {
        label: "Learning time",
        value: formatMinutes(learnMinutes),
        helper: `Spent on task ${windowLabel}`,
      },
      {
        label: "Break time",
        value: formatMinutes(procMinutes),
        helper: "Tracked on procrastination sites",
      },
      {
        label: "Completed redirects",
        value: completed.toLocaleString(),
        helper: "Times you chose to learn",
      },
      {
        label: "Continue taps",
        value: skips.toLocaleString(),
        helper: "Times you stayed on the original site",
      },
    ];
  }
</script>

{#if noStats}
  <div class="empty-state">
    <h5>No stats for this time period yet.</h5>
    <p>Come back after a learning session to see your progress.</p>
  </div>
{:else}
  <div class="summary-grid">
    {#if focusShare !== null}
      <div class="ratio-card">
        <div class="ratio-value">{focusShare}%</div>
        <span class="ratio-helper">of tracked time on task</span>
        <div class="ratio-divider" />
        <div class="ratio-meta">{procrastShare}% on breaks</div>
      </div>
    {/if}

    {#each summaryCards as card (card.label)}
      <div class="card">
        <span class="card-label">{card.label}</span>
        <span class="card-value">{card.value}</span>
        <span class="card-helper">{card.helper}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 0;
    color: var(--textColor);
  }

  .empty-state h5 {
    margin: 0;
    font-size: 1rem;
  }

  .empty-state p {
    margin: 0;
    font-family: var(--fontContent);
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }

  .card,
  .ratio-card {
    background: var(--backgroundColorSecondary);
    border: 1px solid var(--hrColor);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 120px;
  }

  .card-label {
    font-size: 0.85rem;
    font-family: var(--fontContent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
  }

  .card-value {
    font-size: 1.6rem;
    font-weight: 600;
    font-family: var(--fontHeaders);
  }

  .card-helper {
    font-size: 0.9rem;
    opacity: 0.75;
    font-family: var(--fontContent);
  }

  .ratio-card {
    position: relative;
    overflow: hidden;
    align-items: flex-start;
  }

  .ratio-value {
    font-size: 2rem;
    font-weight: 700;
    font-family: var(--fontHeaders);
    color: var(--textColor);
  }

  .ratio-helper,
  .ratio-meta {
    font-size: 0.85rem;
    font-family: var(--fontContent);
    opacity: 0.75;
  }

  .ratio-divider {
    width: 100%;
    height: 1px;
    background: var(--hrColor);
    margin: 12px 0;
    opacity: 0.4;
  }
</style>
