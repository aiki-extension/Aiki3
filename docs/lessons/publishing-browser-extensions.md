# Lesson: Publishing a browser extension to two stores (and why it's harder than you'd think)

This is a write-up of a real bug we hit on the aiki extension and what we learned trying to make it impossible to hit again. It touches three things every working programmer eventually meets:

1. Build-time vs runtime configuration
2. Why you eventually want a CI/CD pipeline
3. OAuth, and why Google's authentication ritual is so much more elaborate than Mozilla's

If you've ever wondered _why_ shipping software gets bureaucratic the moment it leaves your laptop, this is a small case study.

---

## The bug

The aiki extension was published to the Firefox Add-ons store. People installed it. It looked fine. But the moment anyone tried to sign in, **nothing happened**. The extension couldn't talk to its backend.

When we looked at the network tab, we saw the extension trying to reach `http://localhost:3000/api/`. That URL is on the user's _own_ machine — not our server. So of course it failed: the user wasn't running the backend on their laptop.

How did `localhost:3000` end up baked into a production extension? Here's the relevant code (in `rollup.config.js`):

```js
__API_BASE_URL__: JSON.stringify(
  env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api/'
)
```

This is a **build-time substitution**. When you run `npm run build`, the bundler looks at `process.env.PUBLIC_API_BASE_URL` and pastes its value into the compiled JavaScript. If the env var isn't set, it falls back to `localhost`.

Whoever built and uploaded the extension didn't have `PUBLIC_API_BASE_URL` set, so the production URL never got baked in. The fallback shipped to thousands of users.

### The first lesson: build-time vs runtime config

A web app reads `process.env.X` while it's running, on the server. If you forget to set the var, you get an obvious error — the app crashes on startup, you fix it, you redeploy.

A bundled JavaScript artifact (extension, mobile app, single-page app) reads its config **once, when it's compiled**. After that, the value is a literal string in the bundle. There's no "the env var was missing" error — you just silently ship the wrong value and only find out when users complain.

**Takeaway:** anything that gets _compiled_ rather than _executed_ needs config validation at build time, not runtime. A missing env var should fail the build, not fall back to a default that happens to be wrong in production.

---

## The two fixes

When you find a bug like this, you almost always face the same choice:

- **Quick fix:** rebuild on someone's laptop with the env var set, re-upload to the store.
- **Proper fix:** make it impossible for a future human to repeat the mistake.

Both are valid. The quick fix gets the extension working today. The proper fix means future-us isn't one tired afternoon away from shipping the same bug again.

We did both. The quick fix is one shell command. The proper fix is the rest of this lesson.

---

## The proper fix: a release pipeline

The idea: instead of "a human runs `npm run build` and uploads a file," we say "a human pushes a git tag, and a server we don't manage builds the artifact in a clean environment and uploads it."

This is what GitHub Actions (or GitLab CI, CircleCI, etc.) does. The pipeline:

1. Runs on every git tag matching `v*` (e.g. `v3.0.2`)
2. Checks out the code into a fresh Linux VM
3. Sets `PUBLIC_API_BASE_URL` from a value stored once in the repo's secrets
4. Runs `npm ci && npm run build`
5. Uploads the built artifact to the Firefox store and Chrome store

You may notice that step 3 is where the bug couldn't have happened: the env var lives in the repo's secrets, not on a laptop. There's no path where someone forgets to set it.

This is the heart of "infrastructure as code": **the release process is a checked-in script, not a habit.**

### The second lesson: trust the machine, not the human

Manual release steps are bug factories. Not because humans are dumb — because humans are doing the same thing for the hundredth time, on a tight schedule, after lunch, while a Slack message is buzzing. Anything that requires a human to remember N things is a process that produces bugs at a steady rate.

The CI pipeline isn't smarter than you. It's just more boring. That's the point.

---

## Now the real lesson: why does each store need different credentials?

Here's where it gets interesting (and where the students reading this get to learn about OAuth without realizing it).

We need to upload an extension to:
- **Firefox Add-ons (AMO)** — operated by Mozilla
- **Chrome Web Store** — operated by Google

Both stores need to know "the entity uploading this is allowed to publish updates for aiki." Both have an API for that. But the way they authenticate looks _wildly_ different. Why?

### Mozilla: a simple direct API key

You log in to addons.mozilla.org → Manage API Keys → it gives you two strings:

- `JWT issuer`, e.g. `user:17388245:343`
- `JWT secret`, a long hex string

You put these in your CI as secrets. Your script signs a tiny JWT (JSON Web Token) on every API call to prove it's you. That's it.

This is the simplest possible API auth: **a username and a password the server checks directly**.

### Google: an OAuth dance

For the Chrome Web Store, Google does **not** give you a direct API key. Instead, you have to:

1. Create a "project" in Google Cloud Console
2. Enable the "Chrome Web Store API" on that project
3. Configure an "OAuth consent screen"
4. Create an "OAuth 2.0 client" (Desktop app type)
5. Run a one-time browser login flow that produces a "refresh token"

That's _five_ steps to get _three_ secrets (`client_id`, `client_secret`, `refresh_token`). It feels insane the first time. Why?

### The third lesson: OAuth is not designed for our use case

OAuth was invented to solve a specific problem: **how can app A access user B's data on service C, without B giving A their password?**

The classic example: a fitness app wants to read your Google Calendar. You don't want to give the fitness app your Google password — that would let them read your Gmail too. Instead, OAuth lets you tell Google: "give this fitness app a token that lets it read my calendar, and only my calendar."

The whole flow exists to support that case. The dance goes:

1. The app says "I want access to user X's calendar" (using its `client_id` and `client_secret` to identify itself)
2. The user is redirected to a Google login page
3. The user logs in and sees a "this app wants access to your calendar — allow?" screen
4. If they click Allow, Google issues a `refresh_token` to the app — a long-lived "the user said yes" certificate
5. The app uses the refresh_token to get short-lived `access_token`s, which it sends with each API call

Now, our use case: **we're the publisher, we want our own bot to upload our own extension to our own publisher account.** There's no "third-party app accessing user data." But Google reuses the same authentication system for _everything_ — Gmail, Drive, Calendar, Cloud, Chrome Web Store — so we have to walk through the whole consent dance even though we're the only user involved.

That's why we have to:

- Set up a Google Cloud project (Google's container for "an app that calls APIs")
- Configure a consent screen ("which Google account is allowing what")
- Create an OAuth client (the "app"'s ID card)
- Do the browser login once (the "user" — also us — granting permission)
- Save the refresh_token (the certificate that says "yes, the user said yes")

The complexity isn't because Chrome Web Store is special. It's because OAuth was designed for a more general problem, and we're reusing the machinery for our simpler case.

### The "test users" paradox: when developer = user

There's one specific step that makes everything click — or makes everyone want to throw their laptop. When you set up the OAuth consent screen, Google asks you to **add yourself as a "test user."**

Wait, what? You're _building_ the app. Why would you add yourself as a user of your own app?

Because OAuth was designed for the case where the developer and the user are different people. Specifically, OAuth has two states:

- **Testing mode** — only people on the "test users" list can log in. No Google review needed.
- **Production mode** — anyone with a Google account can log in. May need Google to review your app first.

The point of "Testing mode" is to protect end users from half-baked apps. Imagine a developer is building a meditation app that wants access to people's Google Calendars. While they're still developing, Google doesn't want random strangers stumbling onto a half-finished app and granting it access to their personal data. So Google enforces: "until your app is reviewed and published, only people you _explicitly list_ as test users can grant your app permissions."

This is great for the meditation-app developer. It's bizarre for us.

For us, there is exactly one human in the entire world who will ever log in to our "app": the developer themselves. We are simultaneously:

- **The developer** of the upload bot
- **The user** the bot is asking permission from
- **The owner** of the Chrome Web Store listing the bot will modify

Three roles, one human. But Google's form has a field for each role, and you have to fill them all in — including writing your own email address into the "test users" allowlist of the app you yourself just created five minutes ago.

#### Analogy: the private cabin booking site

Imagine you're building a private booking website for your family's holiday cabin. While you're developing, you're the only person who logs in to test. The hosting provider says:

> "We need a list of email addresses allowed to log in during development. Once you publish the site, anyone can sign up — but during testing, only people on this list."

You write your own email on the list. Not because you're being audited, not because the system distrusts you — but because the system is designed for the general case ("multiple developers + multiple test users + eventually the public"), and your specific case ("one human, three hats") happens to be a degenerate sub-case of that general design.

#### The 7-day refresh-token footgun

There's a real consequence of staying in Testing mode: **refresh tokens issued in Testing mode expire after 7 days.** If you do all the OAuth setup, get a refresh token, and then come back two weeks later for a release, the workflow will fail with `invalid_grant` and you'll spend an hour confused.

The fix is to move the consent screen from Testing to **"In production."** For our use case (no sensitive scopes — just the Chrome Web Store API for our own publisher account), this doesn't trigger a Google review. It's an instant flip from a button on the consent screen page. After that, refresh tokens are long-lived (only invalidated by explicit revocation).

Most tutorials skip this detail and your release pipeline mysteriously breaks a week after setup. Now you know.

### One brand, many doors: consent screens vs OAuth clients

Another step that feels redundant the first time: you have to create the **OAuth consent screen** and the **OAuth client** separately. Why two? They're both about my "app," right?

They answer two different questions:

- **OAuth consent screen** — _"what does the user see when they're asked to grant permission?"_ The app name, the logo, the privacy URL, the list of scopes the app is allowed to ask for. It's the **user-facing identity** of your app.
- **OAuth client** — _"what specific piece of software is making this API call?"_ The `client_id`, `client_secret`, the redirect URIs, the client _type_ (Web app, iOS, Android, Desktop). It's the **technical fingerprint** of one implementation.

The key insight: **one consent screen can have many clients.**

#### Why this separation exists

Imagine Spotify. They have an iPhone app, an Android app, a web player at spotify.com, a desktop client, and a CLI tool. When _any_ of those asks Google "can I see this user's contacts?", the user should see the same consent screen: **"Spotify wants access to your contacts."** Same brand, same scopes, same description. The user shouldn't see a different "app" depending on which platform they happen to be on.

But each of those five clients talks to Google differently:

- The web player runs on a server → can actually keep `client_secret` secret → uses one OAuth flow
- The iOS app runs on the user's phone → can't keep secrets → uses a different flow (PKCE)
- The desktop client uses a loopback redirect → yet another flow

So Google's design is:

- **One project per "product"** → one consent screen → one user-facing brand
- **Many OAuth clients per project** → one per platform, each with the right security shape

#### What this looks like for us

We have one client: the **Desktop app** type (used by the CLI bot that uploads to the Chrome Web Store). That's all we need today.

If a year from now we wanted to also build a web dashboard at `releases.aiki.dev` that uses the Chrome Web Store API — we'd add a **Web application** OAuth client under the _same_ project, sharing the _same_ consent screen. New `client_id`, new `client_secret`, but the user would see the same `aiki-extension-publishing` consent screen they saw when they authorized the CLI.

#### The mental model

| Layer | Scope | What it answers |
|---|---|---|
| Project | "What product is this?" | Holds billing, enabled APIs, IAM access |
| Consent screen | "What brand do users see?" | One per project |
| OAuth client | "Which specific app is calling?" | Many per project, one per platform |

Each layer is split off because each has its own lifecycle:

- A project might be deleted independently
- A consent screen gets re-reviewed by Google when scopes change
- A client might be rotated independently if compromised

For us — one project, one consent screen, one client — the split looks redundant. But the design is optimized for the multi-client case (web + mobile + CLI under one brand), and Google charges that complexity up front rather than making you migrate when you add the second client.

This is a recurring theme of working with OAuth: **everything has more pieces than you need, because the pieces are sized for use cases bigger than yours.**

### If OAuth still feels confusing — that's correct

OAuth is hard to learn cold, and it's _harder_ when your use case is the degenerate one (single human playing all roles). The protocol's design imagines a world of independent parties — a third-party app, an end user, a service provider — and each `client_id` / `client_secret` / `refresh_token` is named after its role in _that_ world. When you collapse all three roles into one person, the names stop making intuitive sense.

The fix is repetition. After you do this for two or three different services, the abstractions click. The first time always feels like nonsense. That's not a failing of yours; it's a feature of learning a protocol designed around a different mental model than yours.

### Why Mozilla doesn't have this

Mozilla _could_ have built the same OAuth flow, but they chose not to. AMO has its own auth system (JWT issuer + secret), separate from Mozilla's other products. So they get to design it for the simple case: "a developer wants to publish their own extension." No third-party-app scenario, no consent screen.

This is a recurring pattern in software: **simple solutions that work for one product, vs. unified solutions that work for everything but cost complexity even in the simple cases.** Both are reasonable choices. Google has 50 products and benefits from one auth system. Mozilla has fewer surfaces and benefits from a focused one.

---

## What we ended up with

Once both stores have credentials, a release looks like:

```bash
# Bump version in package.json, commit
git tag v3.0.2
git push --tags
```

That's it. GitHub Actions does the rest:

- Builds with `PUBLIC_API_BASE_URL` baked in
- Uploads to AMO via the Firefox API
- Uploads to Chrome Web Store via the Google API
- Both stores email "in review"

The total credentials we manage:

| Where | Secret | What it is |
|---|---|---|
| AMO | `AMO_API_KEY` | JWT issuer string |
| AMO | `AMO_API_SECRET` | JWT signing secret |
| AMO | `FIREFOX_ADDON_ID` | The extension's ID on AMO |
| Chrome | `CHROME_EXTENSION_ID` | The extension's ID on the store |
| Chrome | `CHROME_CLIENT_ID` | OAuth client identifier |
| Chrome | `CHROME_CLIENT_SECRET` | OAuth client secret |
| Chrome | `CHROME_REFRESH_TOKEN` | Long-lived "you have my permission" token |

Three for Mozilla, four for Google. The extra one for Google is that "permission" token — the artifact of the OAuth dance.

---

## Takeaways for the working programmer

1. **Bundled artifacts have build-time config, not runtime config.** A missing env var should fail the build, not fall back to a default that's wrong in production.
2. **Manual release steps are bug factories.** The CI pipeline isn't smarter — it's more boring, and that's exactly what you want.
3. **OAuth's complexity is paying for a use case you don't have.** When you're authenticating yourself to your own resources, OAuth feels like overkill. That's because it _is_ overkill — but you pay the tax to use systems designed around the third-party-app case.
4. **Different services chose different tradeoffs for a reason.** Mozilla's simpler auth isn't lazy; Google's complex auth isn't bureaucratic. Each fits a different product surface.
5. **The bug you found isn't the lesson.** The lesson is the _shape_ of bug it represents. "I forgot to set an env var" is one example of "anything that requires humans to remember N things on a deadline produces bugs at a steady rate."

---

## Pointers

- The actual workflow we wrote: `.github/workflows/publish.yml`
- The Mozilla upload script: `scripts/publish-firefox.js`
- AMO API docs: https://addons-server.readthedocs.io/en/latest/topics/api/
- Chrome Web Store API docs: https://developer.chrome.com/docs/webstore/using-api
- The OAuth 2.0 spec, if you're curious: https://datatracker.ietf.org/doc/html/rfc6749 (don't read it cold; read an explainer first)
