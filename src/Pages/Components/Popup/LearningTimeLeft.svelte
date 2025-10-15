<!-- 
  Display used in the Popup to show remaining time during a learning session.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  export let learningTimeRemaining = 0;
  export let dailyGoal = 0;
  export let dailyProgress = 0;

  function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return "0m 0s";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  $: remainingLabel = formatDuration(learningTimeRemaining);
  $: goalLabel = formatDuration(dailyGoal);
  $: progressLabel = formatDuration(dailyProgress);
  $: clampedGoal = dailyGoal > 0 ? dailyGoal : 0;
  $: percent = clampedGoal > 0
    ? Math.min(100, Math.round((dailyProgress / clampedGoal) * 100))
    : 0;
</script>

<div
  class="container"
  data-tooltip="Progress towards your daily learning goal"
>
  <h6 class="item">Daily goal remaining:</h6>
  <p class="item">{remainingLabel}</p>
  <div class="progress">
    <div class="progress-bar" style={`width: ${percent}%`} />
  </div>
  <p class="meta">{progressLabel} / {goalLabel}</p>
</div>

<style>
  .container {
    display: block;
    justify-content: center;
    align-content: center;
    flex-direction: row;
  }

  .item {
    margin: auto auto;
  }

  h6 {
    font-size: var(--fontSizePopup);
    color: var(--textColor);
    padding-top: 5px;
  }

  p {
    font-size: var(--fontSizePopup);
    font-weight: 700;
    padding: 10px 0px 0px;
    justify-content: center;
    align-items: center;
    color: #22c55e;
  }

  .progress {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background-color: rgba(255, 255, 255, 0.2);
    overflow: hidden;
    margin-top: 6px;
  }

  .progress-bar {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #22c55e, #14b8a6);
    transition: width 0.3s ease;
  }

  .meta {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--textColorSecondary, rgba(255, 255, 255, 0.7));
    margin-top: 6px;
  }
</style>
