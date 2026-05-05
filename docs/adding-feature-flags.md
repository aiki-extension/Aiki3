# How to Add a New Feature Flag

Feature flags in Aiki lets you gate behaviour behind invite codes or other user properties without the user having to download new versions. The active state of the flag is computed on the backend once per settings fetch, stored in `browser.storage.local`, and read locally from that point on.

This document explains how to add a new feature flag to Aiki from scratch, covering both the backend (Fastify/TypeScript) and the frontend (Svelte/JS extension). Follow every step in order, otherwise things will silently break and you'll spend an hour wondering why nothing changed...

We will work through how a new feature flag `myNewFeature`, could be implemented by using the existing `redirectPrompt` flag as a reference example, since it's the only one we currently have and the pattern is already working end-to-end.

---

## How the System Works (the short version)

The backend decides whether a flag is enabled for a given user. That decision is computed in `FeatureToggles.ts` and sent down to the frontend as part of the `GET /api/users/settings` response, inside a `flags` object. When the user logs in, `settingsService.js` picks up that response and writes the flags into `browser.storage.local`. From then on, any part of the extension can read flags locally without making another network request.

```
FeatureToggles.ts (backend logic)
        |
        v
UserSettingsDto.flags  <-- computed and returned on GET /api/users/settings
        |
        v
settingsService.js  <-- syncs to browser.storage.local on login
        |
        v
storage.featureFlags.get()  <-- read anywhere in the extension
```

If you only touch the frontend, the flag will always be `false`. If you only touch the backend, the flag will be computed but never used. You need both sides.

---

## Step 1: Define the flag logic on the backend

Open `src/services/FeatureToggles.ts`. This is the only place where you decide who gets a flag. Each flag is a small private function that takes the user's invite code and returns a boolean.

Add your new detector function, then register it in `featureMap`:

```typescript
// src/services/FeatureToggles.ts

type InviteCode = { code: string; isActive: boolean } | null;

const redirectPrompt = (inviteCode: InviteCode): boolean => {
  return inviteCode?.code === 'AIKI-STUDY-1' && inviteCode?.isActive === true;
};

// NEW: only enable for users with the beta invite code
const myNewFeature = (inviteCode: InviteCode): boolean => {
  return inviteCode?.code === 'BETA-2025' && inviteCode?.isActive === true;
};

export const featureMap = (inviteCode: InviteCode) => ({
  redirectPrompt: redirectPrompt(inviteCode),
  myNewFeature: myNewFeature(inviteCode), // <-- add this line
});
```

The function name you use as the key in `featureMap` is the name that flows all the way through to the frontend.

Right now the only thing we use to gate flags is the invite code.

---

## Step 2: Expose the flag in the DTO

Open `src/dtos/UserDto.ts`. The `flags` field in `UserSettingsDto` is a typed object, so you need to add your new flag to it:

```typescript
// src/dtos/UserDto.ts

export interface UserSettingsDto {
  dailyLearningGoalMinutes: number;
  inviteCode?: { code: string; isActive: boolean };
  rewardTimeMinutes: number;
  sessionDurationMinutes: number;
  lastActive: Date;
  operatingStartMinutes: number;
  operatingEndMinutes: number;
  timeWastingSites: string[];
  learningSiteDomain?: string;
  flags: {
    redirectPrompt: boolean;
    myNewFeature: boolean; // <-- add this
  };
}
```

You don't need to touch `toUserSettingsDto` itself because it already calls `featureMap(user.inviteCode ?? null)` which will now include your new key automatically. The TypeScript type just needs to match.

If you forget to add the type here, TypeScript will complain when you try to read `flags.myNewFeature` anywhere, which is actually useful.

---

## Step 3: Verify the backend response

Start the backend locally and log in with a user that has the right invite code. Hit `GET /api/users/settings` (you can use the Swagger UI at `http://localhost:3000/docs`). You should see something like:

```json
{
  "flags": {
    "redirectPrompt": false,
    "myNewFeature": true
  }
}
```

If `myNewFeature` is missing from the response entirely, you probably forgot to add it to the `featureMap` return object in Step 1. If it's always `false`, double-check the invite code logic in your detector function.

---

## Step 4: The frontend already picks it up (mostly)

`settingsService.js` already handles saving the entire `flags` object to storage:

```javascript
// src/services/settingsService.js  (no changes needed here)
storage.featureFlags.set(db.flags ?? {}),
```

This runs every time the user logs in or changes their invite code. So as long as the backend is returning the new flag, `storage.featureFlags.get()` will return the full object including your new key. You don't need to touch this file.

---

## Step 5: Read the flag where you need it

Anywhere in the extension that needs to branch on your flag, read it from storage like this:

```javascript
const flags = await storage.featureFlags.get();

if (flags.myNewFeature) {
  // do the new thing
} else {
  // do the old thing
}
```

Look at how `redirectPrompt` is used in `src/redirection/redirectFlow.js` as a concrete example:

```javascript
// src/redirection/redirectFlow.js
async function dispatchPrompt(tabId, learningUri, procUrl) {
  const flags = await storage.featureFlags.get();
  const promptEnabled = !flags.redirectPrompt; // note: inverted because the flag means "show prompt"

  if (!promptEnabled) {
    redirectTo(tabId, learningUri, procUrl);
    return;
  }
  // ... rest of prompt logic
}
```

Since `storage.featureFlags.get()` is async, you always need to `await` it. In Svelte components, handle this with `onMount` or an `{#await}` block:

```svelte
<!-- In a Svelte component -->
<script>
  import { onMount } from 'svelte';
  import storage from '../../util/storage';

  let myNewFeatureEnabled = false;

  onMount(async () => {
    const flags = await storage.featureFlags.get();
    myNewFeatureEnabled = flags.myNewFeature ?? false;
  });
</script>

{#if myNewFeatureEnabled}
  <MyNewFeatureComponent />
{/if}
```

The `?? false` fallback is important. If a user has stale storage from before you added the flag (e.g. they haven't logged in since you deployed), the key won't exist in their stored flags object, and you'll get `undefined` without the fallback.

---

## Step 6: Test it end-to-end

1. Make sure the backend is running with your changes.
2. Log in as a user with the invite code that should enable the flag. Open the extension, go to Settings, and change/save your invite code if needed. This triggers `fetchAndSyncSettings()` which re-reads the flags from the server.
3. Add a temporary `console.log` to confirm the flag value is what you expect:
   ```javascript
   const flags = await storage.featureFlags.get();
   console.log('[Feature Flags]', flags);
   ```
4. Check that the flag-gated behaviour actually changes.
5. Log in with a user who does NOT have the right invite code and verify the flag is `false` and the old behaviour is used.

You can also inspect the stored flags directly by opening the browser extension's service worker in DevTools, going to Application > Storage > Extension Storage, and looking for the `featureFlags` key.
