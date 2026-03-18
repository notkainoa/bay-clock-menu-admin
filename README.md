# Bay Clock Menu Admin

Standalone Nuxt 4 admin app for reviewing and publishing Bay Clock menu uploads.

## Stack

- Nuxt 4
- Tailwind CSS
- Server API routes for auth and GitHub integration
- Cloudflare Worker-compatible Nitro output

## What it does

- Shared-code auth with signed `menu_admin_session` cookies
- Local JPG / PDF preview before upload
- Review screen with split and slider comparison modes
- GitHub inbox-branch write on explicit confirm only
- In-app workflow status polling

## Routes

- `/` auth
- `/upload`
- `/review`
- `/status?commit=<sha>`

API:

- `GET /api/session`
- `POST /api/auth`
- `POST /api/logout`
- `POST /api/confirm-upload`
- `GET /api/run-status?commit=<sha>`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start Nuxt:

```bash
npm run dev
```

For local dev, no `.env` file is required:

- `NUXT_MENU_UPLOAD_PASSWORD` defaults to `test-code`
- `NUXT_SESSION_SIGNING_SECRET` defaults to a dev-only signing secret

Set `NUXT_GITHUB_TOKEN` only if you want to exercise the real GitHub-backed upload and workflow path locally.

## Environment

Private runtime config is sourced from these env vars:

- `NUXT_MENU_UPLOAD_PASSWORD`
  - Optional in `npm run dev`; defaults to `test-code` when unset
  - Required for build, preview, and deploy environments
- `NUXT_SESSION_SIGNING_SECRET`
  - Optional in `npm run dev`; defaults to a dev-only signing secret when unset
  - Required for build, preview, and deploy environments
- `NUXT_GITHUB_TOKEN`
  - Required for GitHub-backed workflow features
- `NUXT_GITHUB_OWNER`
- `NUXT_GITHUB_REPO`
- `NUXT_GITHUB_DEFAULT_BRANCH`
- `NUXT_GITHUB_INBOX_BRANCH`
- `NUXT_UPLOAD_MAX_BYTES`

The GitHub token must have:

- `Contents: Read and write`
- `Actions: Read`

## Build

```bash
npm run build
npm run preview
```

## Deploy

This repo is configured to build a Cloudflare Worker-compatible output via Nitro.

```bash
npm run deploy
```

Before the first deploy, set the Worker secrets / vars in Cloudflare to match `.env.example`.

## Docs

- Architecture and design notes: [`docs/spec.md`](/Users/knewton26/.t3/worktrees/bay-clock-menu-admin/docs/spec.md)
