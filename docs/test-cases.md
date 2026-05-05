> Note: These cases are important when/if automated testing is later implemented.

# Manual Edge Case Testing

This document covers non-obvious edge cases in the Aiki extension that are worth checking manually, especially before a release or after touching any of the redirection, timer, or settings code. These aren't the happy-path flows you'd test naturally, they're the things that are easy to accidentally break without noticing.

Most of these require a bit of setup. Each section says what state to get into before testing. Where we know the expected behaviour from the code, we say so. Where we genuinely don't know (see: midnight and operating hours), we note that too.

To inspect stored state during testing: open the browser's extension DevTools, go to Application > Storage > Extension Storage. You can read and manually edit values there which is useful for simulating edge cases without having to wait for timers.

---

## Setup reference

Throughout this document:

- **Learning site**: whatever you have set as your redirection platform (e.g. `www.duolingo.com`)
- **Time wasting site**: a site you have added to the list (e.g. `www.youtube.com`)
- **Session**: the countdown timer that runs while you're on the learning site
- **Reward**: the countdown timer that runs after you claim your reward on the time wasting site

---

## 1. Settings: URL input validation

### 1a. Adding a time wasting site that is the same as the learning site

**Setup:** Set your learning site to `www.duolingo.com`. Try adding `www.duolingo.com` (or `duolingo.com`) to the time wasting list.

**Expected:** A warning alert should appear saying the site is already set as your redirection. The site should not be added.

**Also test:** What if the learning site is set to `www.duolingo.com` and you try adding `duolingo.com` (without the `www`)? The name-based comparison in `SetTimeWastingSites.svelte` uses `parseUrl().name` (just `"duolingo"` for both), so it should still catch this. Check that it does.

---

### 1b. Adding a site that is already in the list

**Setup:** Add `www.youtube.com` to the list. Then try adding it again, or try `youtube.com` without the `www`.

**Expected:** Warning alert, no duplicate added. The comparison is by `.name`, so both forms should be caught.

---

### 1c. Adding a site with no domain ending

**Setup:** Type `youtube` (no TLD) into the time wasting site field and submit.

**Expected:** Warning alert saying the URL is invalid and to include a domain ending. This is handled by `normalizeUrl` returning `null` for inputs without a recognisable TLD.

---

### 1d. Setting the learning site to a URL that is already in the time wasting list

**Setup:** Add `www.reddit.com` to the time wasting list. Then go to the learning site field and try to save `www.reddit.com` as your learning platform.

**Expected:** Warning alert: "Your learning site can't be the same as a time wasting site". The learning site should not be saved.

---

### 1e. Clearing the learning site URL

**Setup:** Have a learning site saved. Click "Change", delete the entire URL, and save an empty field.

**Expected:** The learning platform should be cleared (storage removes the key). A success alert saying "Learning platform cleared." should appear. The field should go back to the editable empty state.

**What to check:** After clearing, navigate to a time wasting site. Aiki should not attempt to redirect anywhere, since there's no destination. No errors should appear.

---

### 1f. Session duration exceeding the daily goal

**Setup:** Go to Settings > Redirection Settings. Set the daily goal to 10 minutes. Then try setting the session duration to 15 minutes.

**Expected:** A warning alert saying the session can't exceed the daily goal, and the session duration should be auto-adjusted down to match the daily goal. The UI should reflect the clamped value.

---

### 1g. Setting the operating hours "from" time to after the "to" time

**Setup:** Set the "from" time to 21:00 and the "to" time to 08:30. Or try entering a "from" that is equal to the "to".

**Expected:** The "to" time should be automatically advanced by 1 minute to stay ahead of "from". So if you set "from" to 21:30 and "to" is already 21:30, "to" should jump to 21:31. Check this actually happens in the UI and isn't just a silent storage write.

---

## 2. Redirection behaviour

### 2a. Navigating to a time wasting site while Aiki is off

**Setup:** Toggle Aiki off in the popup (the red "Off" button). Navigate to a time wasting site.

**Expected:** Nothing happens. No redirect, no overlay, no prompt. The toggle state is checked before anything else in the redirect pipeline.

**Also check:** Toggle Aiki back on while sitting on the time wasting site. Does Aiki immediately intercept, or does it only activate on the next navigation? Based on the code, `reviveAiki()` calls `checkActiveTab()`, so it should check the current tab immediately and show a prompt if applicable.

---

### 2b. The 10-minute global prompt cooldown

**Setup:** Navigate to a time wasting site. When the redirect prompt appears, click "Stay here". The global prompt lock is set at this point.

**Expected:** For the next 10 minutes, navigating to any time wasting site (in any tab) should not trigger the prompt again. The `PROMPT_SUPPRESS_DURATION` is 10 minutes.

**What to verify:** Open a second time wasting site in a new tab. The prompt should not appear. Accepting the redirect (clicking the redirect button) clears the lock, so if you accepted instead of staying, the lock would be gone and the next visit would prompt again.

**Edge case within this:** What if you navigate to the time wasting site via a link on another page, rather than typing in the URL bar? The `webNavigation.onBeforeNavigate` listener should still catch it. Try both.

---

### 2c. The redirect prompt when a session is already active

**Setup:** Get redirected to the learning site and let a session start (the injection overlay should show a countdown). While the session is running, open a new tab and navigate to a time wasting site.

**Expected:** The content blocker overlay should appear (the dark fullscreen "Keep learning" screen), not the softer redirect prompt. The code branches on whether `storage.origin` is set: if origin exists (meaning there's an active learning session), `renderContentBlocker` fires instead of `promptRedirect`.

**What to check:** Both "Visit site anyway" and "Return to learning" buttons should work. "Visit site anyway" dismisses the blocker and sets a cooldown. "Return to learning" navigates back to the learning site URL.

---

### 2d. Navigating to a time wasting site when the daily goal is already met

**Setup:** Complete your daily goal (or manually set `dailyProgress` in extension storage to equal or exceed `learningTime` in milliseconds).

**Expected:** Navigating to a time wasting site should not trigger a redirect. The `goalMet` check in `redirectFlow.js` should catch this. If the goal was just met and you haven't claimed a reward yet, the reward session should auto-start (this is the `goalMet + reward unclaimed` branch).

---

### 2e. Navigating to a time wasting site when reward time is active

**Setup:** Complete a session and claim the reward. While the reward overlay is running on the time wasting site, try opening another time wasting site in a new tab.

**Expected:** The reward overlay should appear on the new tab as well. This is because the reward bootstrap runs on page load and checks `sessionRewardGoal > 0` in the timer state.

**Also check:** Navigating within the same time wasting site (e.g. from YouTube homepage to a YouTube video) should not cause the overlay to disappear. The persistence guards re-render it on `pushState`/`replaceState` calls, which YouTube uses heavily.

---

### 2f. Navigating back to the learning site during reward time

**Setup:** Be in reward mode (reward overlay showing on the time wasting site). Manually navigate to your learning site in the same tab.

**Expected:** The learning panel overlay should appear showing reward time remaining, not a session countdown. The overlay state switches based on `sessionRewardGoal > 0`. When reward time expires while you're on the learning site, a new session should auto-start without any prompt, and the overlay should transition to the session countdown.

---

### 2g. Closing the learning tab during an active session

**Setup:** Get redirected to the learning site and let a session start. Close the learning tab.

**Expected:** Aiki should look for another tab on the learning site. If one exists, the session migrates to that tab. If none exist, the session is torn down, `shouldRedirect` is set back to `true`, and the extension goes back to its idle state where it will intercept the next visit.

**What to test:** Have two learning site tabs open when you close the origin one. The session should migrate to the remaining one. Open DevTools on that tab and verify the overlay is still running.

---

### 2h. Having two time wasting sites open in separate tabs, one gets intercepted

**Setup:** Open `www.youtube.com` in Tab A and `www.reddit.com` in Tab B. Let Aiki intercept Tab A and redirect it to the learning site.

**Expected:** Tab B should not be automatically redirected. It should stay on Reddit. However, if you then click on Tab B or navigate somewhere in Tab B, the `onActivated` listener may fire and `checkTabById` could pick it up depending on the state of the prompt lock and `shouldRedirect`. If the 10-minute prompt lock is not set (because the redirect was automatic, not a "Stay here" click), Tab B should show a content blocker when you switch to it, since there is now an active learning session (origin is set).

This one is worth testing carefully since the behaviour is not immediately obvious.

---

## 3. Timer and session edge cases

### 3a. The final session being shorter than the configured session length

**Setup:** Set the daily goal to 7 minutes and the session duration to 5 minutes. Complete the first session (5 minutes). Claim the reward, go back to the learning site, and start the second session.

**Expected:** The second session should only last 2 minutes, not 5. The code caps the session duration at `Math.min(sessionDuration, remaining)` where `remaining` is the goal minus current progress. Verify the overlay shows a 2-minute countdown, not 5.

---

### 3b. Changing session duration mid-session

**Setup:** Start a session. While it's running, go to Settings and change the session duration. Navigate back to the learning site.

**Expected:** The code in `messageHandler.js` detects that `currentGoal !== sessionDuration` and rescales the timer, preserving the progress ratio. So if you were 50% through a 10-minute session and changed it to 6 minutes, the timer should restart at 3 minutes remaining (50% of the new goal). This is a bit complex, test it a couple of times to make sure the overlay reflects the new duration immediately.

---

### 3c. The session timer and the daily goal counter staying in sync across multiple sessions

**Setup:** Set the daily goal to 15 minutes and session duration to 5 minutes. Complete three full sessions, claiming reward each time.

**Expected:** After three sessions, the daily goal should be marked as complete and no further redirects should happen. The popup's progress bar should show 100%. Check the `dailyProgress` value in extension storage directly to confirm it's at or above the goal in milliseconds.

---

### 3d. What happens at midnight (known unknown)

**Context:** The daily progress resets inside `getDailyProgress()` when the stored `dailyProgressDate` doesn't match today's date string. This check only fires when something actually calls `getDailyProgress()`, which includes `startSessionTimer()`, `decrementSession()`, and `syncDailyState()`.

**What this means in practice:** If a session is running across midnight, `decrementSession()` increments `dailyProgress` by calling `storage.dailyProgress.set()` directly with the in-memory value, it does NOT go through `getDailyProgress()`. So the reset probably does not happen mid-session. The timer in memory just keeps going.

The next call to `getDailyProgress()` after midnight (which would happen when a new session tries to start, or on the next popup poll) should trigger the reset and return 0, treating it as a fresh day.

**To test:** This is genuinely hard to reproduce without waiting until midnight or mocking the system clock. What you can do is manually set `dailyProgressDate` in extension storage to yesterday's date string (e.g. `"Mon Apr 28 2025"`) and then trigger a new session. The reset should fire and `dailyProgress` should go back to 0.

---

## 4. Multi-tab and window edge cases

### 4a. Switching browser windows during a session

**Setup:** Have the learning site open in Window A. Switch to Window B (a different browser window).

**Expected:** `finalizeAllActiveSessions` fires on `windows.onFocusChanged` when focus leaves the window. This is meant to pause session tracking. When you switch back to Window A, `maybeStartSessionForTab` should resume.

In practice the timer itself (in `TimerManager`) also does an `isActive()` check via `checkActive()` on every tick, which verifies the current window is focused and the current tab is the origin learning tab. So even if the finalize doesn't fire cleanly, the timer should stop counting when you're not looking at the learning tab.

---

### 4b. Opening multiple settings tabs

**Setup:** Click the settings button in the popup twice quickly, or otherwise get two settings pages open.

**Expected:** Both should render. Changes saved in one should not conflict with the other since they both write to the same storage. However, the second tab's displayed values won't update live if you change something in the first, since Svelte components only read storage on mount. This isn't a bug, but it's worth knowing.

---

## 5. Authentication edge cases

### 5a. Signing in as a guest and then signing in with an account

**Setup:** Sign in as a guest. Notice that guest mode skips all API calls (the `uid === "guest"` guard in `apiHandler.js`). Then sign out and sign in with a real account.

**Expected:** Settings should sync from the server on login. The invite code field should appear (it's hidden for guests). The time wasting list should reflect whatever is stored in the database for that account.

---

### 5b. Changing the invite code and verifying flags update

**Setup:** Sign in with an account that does not have the `AIKI-STUDY-1` invite code. Go to settings and enter `AIKI-STUDY-1` (assuming it's active in the database). Save it.

**Expected:** `fetchAndSyncSettings()` is called after a successful invite code save in `InviteCodeSettings.svelte`. This re-syncs all flags from the server. Check `featureFlags` in extension storage and confirm `redirectPrompt` flipped to `true`. Then navigate to a time wasting site and confirm instant redirect is now active.

Also test the reverse: remove the invite code (blank the field and save). Flags should re-sync with `redirectPrompt` back to `false`, restoring the normal prompt behaviour.

---

### 5c. What happens when the backend is unreachable

**Setup:** Start the extension normally and confirm it's working. Then stop the backend server. Try adding a time wasting site.

**Expected:** The site should still be added to local storage immediately (the list update and `port.postMessage` happen before the API call). The API call should fail silently with a "Could not reach the server" warning alert. The site should appear in the list. Restart the backend: the site is in local storage but the database won't have it until the next operation that syncs.

This is worth checking across the various settings actions: adding/removing time wasting sites, changing the learning URL, updating operating hours. Each one saves locally first and then tries the server.

---

## 6. Feature flag edge cases

### 6a. Stale flags after deploy

**Setup:** Sign in. Inspect `featureFlags` in extension storage and note the current value. Without logging out, imagine a new flag has been added on the backend (you can simulate this by manually adding a key to `featureFlags` in storage with a value of `false`).

**Expected:** The stale stored flags object won't have the new key. Any code that reads `flags.newFlag ?? false` should default to `false` safely. Code that reads `flags.newFlag` without a fallback would get `undefined`. Check any flag call sites in the code you're touching have the `?? false` fallback.

To force a re-sync without logging out: go to Settings and save the invite code field (even with the same value). This calls `fetchAndSyncSettings()` which overwrites `featureFlags` with the fresh server response.

---

## How to inspect state during testing

Open the extension's background service worker in DevTools (in Chrome: `chrome://extensions` > click "Service Worker"). From there you can run:

```javascript
// Read all storage
chrome.storage.local.get(null, console.log);

// Manually set daily progress to simulate goal completion
chrome.storage.local.set({
  dailyProgress: 1800000,
  dailyProgressDate: new Date().toDateString(),
});

// Clear the global prompt lock (lets you trigger prompts again immediately)
chrome.storage.local.remove('globalPromptLock');

// Simulate yesterday's date to test the midnight reset
chrome.storage.local.set({ dailyProgressDate: 'Mon Apr 28 2025' });
```

You can also open the settings page's DevTools separately, since it runs in a different context from the service worker.
