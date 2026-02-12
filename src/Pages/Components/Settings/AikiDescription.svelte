<script>
  import Container from "./Container.svelte";
  import variantConfig from "../../../util/variantConfig";
  

const infotext = variantConfig.isControlled()
    ? "Aiki steps in when you open a time wasting site you’ve added to the list. It automatically redirects you to an activity site you’ve chosen (for example studying, meditation, or anything else). Time spent on your activity site counts toward your daily goal. When the goal is reached, Aiki stops intervening until the next day."
    : "Aiki steps in when you open a time wasting site you’ve added to the list. It shows a prompt where you choose what happens next: stay on the time wasting site or switch to an activity site you’ve chosen (for example studying, meditation, or anything else). Time spent on your activity site counts toward your daily goal. When the goal is reached, Aiki stops intervening until the next day."
</script>

<Container id="site-input-container" headline="Aiki">
  <h5>Info:</h5>
  <hr />
    <p>{infotext}</p>
</Container>
