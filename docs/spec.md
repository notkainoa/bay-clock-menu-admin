# Spec

## Goal

Extract the menu admin into a standalone repo with a maintainable Nuxt structure while preserving the behavior that already works:

- shared-code auth
- local preview before upload
- GitHub inbox-branch write on confirm
- GitHub Actions status polling

## Visual direction

The public Bay Clock app is typographically simple and direct. The provided references add a darker, sketch-like interaction model that works better for an admin workspace than the earlier warm-white card.

Chosen direction:

- charcoal canvas
- pale ink lines
- dashed review containers
- Highway Gothic for structure and Bay Clock continuity
- Patrick Hand for control labels and review annotations
- restrained green/red status accents instead of dashboard chrome

## Architecture

### Client

- `app/pages/*` hold route-level state and navigation
- `app/components/*` hold the reusable UI pieces
- `app/composables/useMenuAdmin.ts` owns client-only file and preview state
- PDF first-page rendering is client-only via `pdfjs-dist`

### Server

- `server/api/*` exposes the auth / upload / status endpoints
- `server/utils/session.ts` owns signed cookie logic
- `server/utils/github.ts` owns GitHub API and workflow normalization
- `server/utils/upload.ts` owns file validation

## Explicit rejections

### Rejection: keep everything in one entry file

That was fast for the Worker prototype, but it is not a credible long-term codebase. Nuxt gives us route and server boundaries for free, so not using them would just recreate the same maintenance problem in a bigger app.

### Rejection: serialize `File` objects through Nuxt state

`File` is not a durable server/client state primitive. Keeping the selected upload as client-only composable state is the correct constraint. Refreshing `/review` intentionally loses the file and routes back to `/upload`.

### Rejection: write to GitHub on selection

That would make the review screen dishonest. The app should not publish side effects until the user presses confirm.

### Rejection: mimic Bay Clock’s full UI

The public site is a schedule app, not an admin tool. Reusing the exact layout would produce the wrong interaction model. The new app keeps the Bay Clock feel through font, restraint, and tone, but the workspace is purpose-built for upload/review.

## Risks

### Risk: GitHub workflow stage names are coupled to exact job step names

Mitigation:

- normalization is centralized in `server/utils/github.ts`
- failure mode is visible and isolated to status labeling

### Risk: PDF preview adds client bundle cost

Mitigation:

- dynamic import via plugin
- preview only loads when the user selects a PDF

### Risk: Cloudflare deployment details drift over time

Mitigation:

- app is built with standard Nuxt server routes
- deploy config is isolated to `nuxt.config.ts` and `wrangler.jsonc`

## Acceptance criteria

- Wrong code does not authenticate
- Trusted login persists for 30 days
- Untrusted login uses a session cookie
- Upload screen supports drag/drop and browse
- JPG and PDF preview render locally
- Review supports split and slider comparison
- Refreshing `/review` returns to `/upload` with an explanation
- Confirm writes to `.menu-upload-inbox/upload` only once
- `/status` resumes polling from the commit query param
