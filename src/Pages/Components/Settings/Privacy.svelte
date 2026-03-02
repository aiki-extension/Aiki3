<!-- 
  Details the privacy of the application when the user first installs it.
  Used in / Parent components: /src/Pages/Settings.svelte
 -->
<script>
import Container from "./Container.svelte";
</script>

<Container headline="Your Privacy">
<h5>We want you to know we take your privacy very seriously:</h5>
<hr>
<p>For the duration of this study, Aiki will be logging the amount of time you spend on websites that
    you add to it as time wasting sites. However, Aiki will only log the time spent (in seconds) on each 
    time wasting site, nothing more. Aiki will not know anything about any webpages you do not add to it.
    As for the the content of the pages you do add, only the name of the root site (ie: Youtube.com, 
    Facebook.com, etc) will be logged.</p>

<p><strong>For example:</strong> You added Facebook.com as a time wasting site to Aiki. You then visited 
    Facebook for 45 seconds on Tuesday. Aiki would log that you spent 45 seconds on Facebook.com on Tuesday, 
    but absolutely nothing else. To be clear, Aiki will not know anything about the content of the pages you 
    visit. We will later use this data to see if Aiki helped you to time waste a little less.</p>
</Container>

<style>
  h5 {
    font-family: var(--fontHeaders);
  }

  p {
    font-family: var(--fontContent);
    font-size: var(--fontSizeSettings);
  }

  hr {
    background-color: var(--hrColor);
  }
</style>