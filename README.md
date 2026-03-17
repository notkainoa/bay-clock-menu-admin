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

2. Copy env values:

```bash
cp .env.example .env
```

3. Start Nuxt:

```bash
npm run dev
```

## Environment

Private runtime config is sourced from these env vars:

- `NUXT_MENU_UPLOAD_PASSWORD`
- `NUXT_SESSION_SIGNING_SECRET`
- `NUXT_GITHUB_TOKEN`
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
