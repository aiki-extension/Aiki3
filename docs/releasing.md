# Releasing Aiki

This document describes how to publish a new version of the Aiki browser extension to the Chrome Web Store and Mozilla Add-ons (AMO).

Releases are fully automated via GitHub Actions. Once a version tag is pushed, the pipeline builds both browser targets, submits them to their respective stores, and creates a GitHub release - no manual store interaction is required.

---

## Prerequisites

The following GitHub repository secrets must be configured before the pipeline can run. These are one-time setup steps; once in place they do not need to be changed between releases.

| Secret                 | Where to find it                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AMO_API_KEY`          | [addons.mozilla.org/developers/addon/api/key/](https://addons.mozilla.org/en-US/developers/addon/api/key/) |
| `AMO_API_SECRET`       | Same page as above                                                                                         |
| `CHROME_EXTENSION_ID`  | Chrome Web Store Developer Console - the 32-character extension ID                                         |
| `CHROME_CLIENT_ID`     | Google Cloud Console - OAuth 2.0 credentials (Desktop app type)                                            |
| `CHROME_CLIENT_SECRET` | Same Google Cloud OAuth credential                                                                         |
| `CHROME_REFRESH_TOKEN` | Obtained by completing the Google OAuth flow with the credentials above                                    |

> **Important:** The AMO credentials must belong to the Mozilla account that owns the AMO listing. Using credentials from a different Mozilla account will fail with a 403 error.

The production API URL (`https://aiki.zeeguu.dev/api/`) is hard-coded in the workflow and does not need to be set as a secret.

---

## Releasing a new version

### 1. Bump the version in `package.json`

Open `package.json` and update the `version` field:

```json
{
  "version": "3.0.X"
}
```

Commit the change:

```bash
git add package.json
git commit -m "Bump version to 3.0.X"
git push
```

### 2. Tag the commit and push the tag

```bash
git tag v3.0.X
git push --tags
```

The tag must use the `v` prefix followed by the exact version string in `package.json` (e.g. `v3.0.4`). The pipeline will fail with an error if these do not match.

### 3. Monitor the pipeline

Go to the **Actions** tab in the GitHub repository. A workflow run named **Publish to stores** will appear. It runs four jobs in sequence:

1. **Verify tag matches package.json** - confirms the tag and `package.json` version are identical. The remaining jobs do not start if this check fails.
2. **Publish Firefox (AMO listed)** - builds the Firefox extension and source archive, then submits them to AMO.
3. **Publish Chrome Web Store** - builds the Chrome zip and uploads it via the Chrome Web Store API with auto-publish enabled.
4. **Create GitHub release** - runs after both store jobs succeed, creates a GitHub release with auto-generated release notes and attaches the Firefox `.xpi` artifact.

Jobs 2 and 3 run in parallel. The GitHub release (job 4) waits for both to complete.

---

## Store review timelines

Both stores review submissions asynchronously after the pipeline exits.

- **AMO (Firefox):** Review typically takes hours to days. The pipeline submits and exits immediately without waiting.
- **Chrome Web Store:** The extension is submitted for review automatically (`--auto-publish`). Google's review timeline varies.

The pipeline completing successfully means the submissions were accepted by the stores - not that the new version is publicly live.

---

## Triggering a release manually

The workflow can also be triggered manually without pushing a tag. Go to **Actions → Publish to stores → Run workflow**, enter the version tag (e.g. `v3.0.4`), and click **Run workflow**. The version must still match `package.json`.

This is useful for re-submitting after a rejected review without creating a new tag.

---

## Troubleshooting

**Tag does not match `package.json`**
The verify job prints both values and exits with an error. Update `package.json`, push the commit, delete the tag, and re-push it.

```bash
git tag -d v3.0.X
git push origin :refs/tags/v3.0.X
# update package.json, commit, push
git tag v3.0.X
git push --tags
```

**Chrome Web Store rejects re-upload of same version**
Chrome does not accept a re-upload while a version is pending review. Either wait for the review to complete, cancel it in the developer console, or increment the version number.

**AMO submission fails with 403**
The `AMO_API_KEY` and `AMO_API_SECRET` secrets must come from the Mozilla account that owns the listing. Regenerate the keys at `addons.mozilla.org/developers/addon/api/key/` and update the repository secrets.
