<!-- 
  Display used in the Popup to show remaining time during a learning session.
  Used in / Parent components: /src/Pages/Popup.svelte
 -->
<script>
  import { AIKI_VARIANT } from "../../../util/variant";

  export let learningTimeRemaining = 0;
  export let dailyGoal = 0;
  export let dailyProgress = 0;
  
  // Controlled variant props
  export let controlledState = "idle";
  export let controlledLearningRemaining = 0;
  export let controlledLearningGoal = 0;
  export let controlledLearningElapsed = 0;
  export let controlledLearningCompleted = false;
  export let controlledRewardRemaining = 0;
  export let controlledRewardGoal = 0;

  const isControlled = AIKI_VARIANT === "controlled";

  function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return "0m 0s";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  // Experimental variant values
  $: remainingLabel = formatDuration(learningTimeRemaining);
  $: goalLabel = formatDuration(dailyGoal);
  $: progressLabel = formatDuration(dailyProgress);
  $: clampedGoal = dailyGoal > 0 ? dailyGoal : 0;
  $: percent = clampedGoal > 0
    ? Math.min(100, Math.round((dailyProgress / clampedGoal) * 100))
    : 0;

  // Controlled variant computed values
  $: isLearning = isControlled && controlledState === "learning";
  $: isReward = isControlled && controlledState === "reward";
  $: isIdle = isControlled && controlledState === "idle";
  
  // Learning session values
  $: learningProgress = controlledLearningGoal - controlledLearningRemaining;
  $: learningPercent = controlledLearningGoal > 0 
    ? Math.min(100, Math.round((learningProgress / controlledLearningGoal) * 100)) 
    : 0;
  
  // Reward session values
  $: rewardProgress = controlledRewardGoal - controlledRewardRemaining;
  $: rewardPercent = controlledRewardGoal > 0 
    ? Math.min(100, Math.round((rewardProgress / controlledRewardGoal) * 100)) 
    : 0;
</script>

{#if isControlled}
  <!-- Controlled variant display -->
  {#if isLearning}
    <div class="container" data-tooltip="Your learning session progress">
      <h6 class="item">Learning remaining:</h6>
      <p class="item learning">{formatDuration(controlledLearningRemaining)}</p>
      <div class="progress">
        <div class="progress-bar learning-bar" style={`width: ${learningPercent}%`} />
      </div>
      {#if controlledLearningCompleted || controlledLearningRemaining <= 0}
        <p class="meta">{formatDuration(controlledLearningElapsed)} / {formatDuration(controlledLearningGoal)}</p>
      {:else}
        <p class="meta">{formatDuration(learningProgress)} / {formatDuration(controlledLearningGoal)}</p>
      {/if}
    </div>
  {:else if isReward}
    <div class="container" data-tooltip="Your reward time remaining">
      <h6 class="item">🎉 Reward time remaining:</h6>
      <p class="item reward">{formatDuration(controlledRewardRemaining)}</p>
      <div class="progress">
        <div class="progress-bar reward-bar" style={`width: ${rewardPercent}%`} />
      </div>
      <p class="meta">{formatDuration(rewardProgress)} / {formatDuration(controlledRewardGoal)}</p>
    </div>
  {:else}
    <div class="container" data-tooltip="Start learning by visiting a procrastination site">
      <h6 class="item">Session status:</h6>
      <p class="item idle">Ready to learn</p>
    </div>
  {/if}
{:else}
  <!-- Experimental variant display -->
  {#if dailyGoal > 0 && dailyProgress >= dailyGoal}
    <!-- Goal completed view -->
    <div class="container goal-complete" data-tooltip="Congratulations on completing your daily learning goal!">
      <h6 class="item">🎉 Daily goal complete!</h6>
      <p class="item complete">Great work today!</p>
      <div class="progress">
        <div class="progress-bar complete-bar" style="width: 100%" />
      </div>
      <p class="meta">{progressLabel} learned today</p>
      <p class="hint">Want to learn more? Increase your daily goal in settings.</p>
    </div>
  {:else}
    <!-- Goal in progress view -->
    <div
      class="container"
      data-tooltip="Progress towards your daily learning goal"
    >
      <h6 class="item">Daily goal remaining:</h6>
      <p class="item learning">{remainingLabel}</p>
      <div class="progress">
        <div class="progress-bar learning-bar" style={`width: ${percent}%`} />
      </div>
      <p class="meta">{progressLabel} / {goalLabel}</p>
    </div>
  {/if}
{/if}

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
  }

  p.learning {
    color: #22c55e;
  }

  p.reward {
    color: var(--textColor);
  }

  p.idle {
    color: var(--textColorSecondary, rgba(100, 100, 100, 0.7));
  }

  .progress {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background-color: var(--progressBarBackground, #D1D5DB);
    overflow: hidden;
    margin-top: 6px;
  }

  .progress-bar {
    height: 100%;
    border-radius: inherit;
    transition: width 0.3s ease;
  }

  .progress-bar.learning-bar {
    background: var(--progressBarFill, #22c55e);
  }

  .progress-bar.reward-bar {
    background: var(--progressBarFill, #22c55e);
  }

  .meta {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--textColorSecondary, rgba(100, 100, 100, 0.7));
    margin-top: 6px;
  }

  p.complete {
    color: #22c55e;
    font-weight: 700;
  }

  .progress-bar.complete-bar {
    background: linear-gradient(135deg, #22c55e, #0ea5e9);
  }

  .goal-complete h6 {
    color: #22c55e;
  }

  .hint {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--textColorSecondary, rgba(100, 100, 100, 0.6));
    margin-top: 8px;
    line-height: 1.4;
    padding: 0 8px;
  }
</style>
