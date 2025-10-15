<!-- This handles the data and drawing functions required to generate
  a pie chart for our statistics element in the Settings menu. Uses
  'chart.js' module to do so: https://www.chartjs.org/
Used in / Parent components: /src/Pages/Settings.svelte	
-->
<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";
  import Fa from "svelte-fa";
  import { faSkull, faThumbsUp } from "@fortawesome/free-solid-svg-icons";

  export let stats;

  let textColor = getComputedStyle(document.documentElement).getPropertyValue(
    "--textColor"
  );

  function createPieChart() {
    var ctx = document.getElementById("pie-chart");
    let myChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: [
          //ORDER MATTERS
          "Learning Time",
          "Procrastination Time",
        ],
        datasets: [
          {
            backgroundColor: [
              //ORDER MATTERS
              "#0077b6",
              "#d00000",
            ],
            data: [
              //ORDER MATTERS
              stats[0],
              stats[1],
            ],
            hoverOffset: 8,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            text: `Time spent ${stats[5]} (in minutes)`,
            color: textColor,
            size: 16,
            display: true,
            padding: 10,
          },
          legend: {
            display: true,
            position: "bottom",
            align: "center",
            color: textColor,
            labels: {
              color: textColor,
              boxWidth: 12,
              padding: 12,
            },
          },
        },
        layout: {
          padding: 10,
        },
      },
    });
  }
  onMount(createPieChart);
</script>

<div class="flex">
  <div class="chart">
    <canvas id="pie-chart" />
  </div>
  <div class="other-stats">
    <h6><Fa icon={faThumbsUp} /> Completed Sessions:</h6>
    <p>{stats[2]}</p>
    <h6><Fa icon={faSkull} /> Emergency Skips:</h6>
    <p>{stats[3]}</p>
  </div>
</div>

<style>
  canvas {
    display: flex;
    justify-content: center;
    width: 1px;
    height: 1px;
    background-color: var(--backgroundColorSecondary);
  }

  .flex {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .chart {
    display: flex;
    background-color: var(--backgroundColorSecondary);
    width: 50vh;
    height: 50vh;
  }
</style>
