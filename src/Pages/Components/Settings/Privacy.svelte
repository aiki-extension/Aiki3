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
<p>For the duration of this study, Aiki will be logging the amount of time you spend on websites that you add to it as 
  <em>time wasting</em> sites, as well as the amount of time you spend on the <em>redirection</em> 
  platform that Aiki redirects you to. However, Aiki will only log the time spent (in seconds) 
  on each of these sites—nothing more. Aiki will not know anything about any webpages you do not add to it, 
  and it will not record what you view, type, search for, or interact with on any site.</p>

  <p>Only the name of the root site/domain (e.g., Youtube.com, Facebook.com, Monkeytype.com) and the time spent will be logged.</p>


<p><strong>For example:</strong> You added Facebook.com as a procrastination site to Aiki, and you selected Monkeytype.com as 
  one of your learning platforms. You then visited Facebook for 45 seconds on Tuesday and were redirected to Monkeytype, 
  where you spent 120 seconds. Aiki would log that you spent 45 seconds on Facebook.com on Tuesday and 120 seconds on 
  Monkeytype.com on Tuesday, but absolutely nothing else. To be clear, Aiki will not know anything about the content of the 
  pages you visit.</p>

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