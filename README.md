# W Labs Blog — Standalone Prototype

Blog CMS for W Labs, built on Next.js 16 + Payload CMS 3, standing alone from
the renewed W Labs site (Nuxt) per [WOS-313](https://uedu-dev.atlassian.net/browse/WOS-313).
Integration with the renewed site is a separate ticket (WOS-314): the site
already proxies to an external blog API and only needs one env var flipped.

## Ownership

- **Owner:** Czedrix Barcena (czedrix@wsoft.space)
- **Second maintainer:** _assign before production use_ — WOS-312 §6 named
  this the actual fix for why the old blog died (see below).

## Why this exists

The previous blog (`wsoftblog`, Laravel + Filament) had no ownership
transfer and no committed deploy configuration anywhere in its history — the
only working deploy lived on one person's machine and froze the moment that
stopped being maintained. **One-line cause:** *no CI/deploy config was ever
committed, the database was a gitignored local SQLite file, and uploaded
images lived on local disk — so nothing about that deployment could survive
a server change or a second maintainer.* This project fixes that by
committing deploy config from the first commit, treating Postgres and media
storage as declared external resources, and naming an owner.

Full research and the build-vs-adopt decision are in WOS-312.

## Stack

| | |
|---|---|
| Framework | Next.js `16.3.5`, App Router, TypeScript |
| CMS | Payload `3.89.0` — installed *into* this app (`(payload)` route group), not a second app |
| Database | Postgres (`@payloadcms/db-postgres`) |
| Styling | Tailwind CSS v3 + `@tailwindcss/typography` (matches the renewed site's stack, so this can merge in later) |
| Package manager | pnpm (pinned via `packageManager` in `package.json`) |
| Node | 22 LTS (`payload` requires `^18.20.2 \|\| >=20.9.0`) |

**Version pin constraint:** `@payloadcms/next@3.89.0`'s peer range for
`next` is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`.
Don't bump Next past `17.0.0`, or below the matching Payload minor, without
checking this range first.

## Local setup

```bash
corepack pnpm install
cp .env.example .env        # fill in PAYLOAD_SECRET with a real generated value
docker compose up -d        # starts Postgres on localhost:5432
corepack pnpm seed          # creates admin+editor users and ~5 demo posts
corepack pnpm dev           # http://localhost:3000, admin at /admin
```

Seeded accounts (override via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`/
`SEED_EDITOR_EMAIL`/`SEED_EDITOR_PASSWORD` env vars before seeding):

| Role | Email | Password |
|---|---|---|
| admin | `admin@wsoftlabs.dev` | `changeme-admin-123` |
| editor | `editor@wsoftlabs.dev` | `changeme-editor-123` |

**Change both passwords before any real deployment.**

## Core features

1. Create / edit / delete posts — Payload admin at `/admin`, Korean by
   default (WOS-312 §5/§6).
2. Post list + detail view, paginated — `/` and `/posts/[slug]`.
3. Published / unpublished toggle — Payload's native drafts (`_status`),
   with autosave + an explicit "초안 저장" (Save Draft) button.
4. Data fetching → frontend display, independent of the news component —
   public pages read via Payload's Local API (`payload.find`), no internal
   HTTP hop.
5. Deployable — see below.

## Wire-compat API (for WOS-314)

`GET /api/getPosts` and `GET /api/getPost/:id` mirror the old Laravel
`PostResource` contract field-for-field (`id`, `title`, `slug`, `excerpt`,
`content`, `banner_url`, `published_at`, `author`), so the renewed site's
Nuxt proxies (`server/api/getBlogs.get.js`, `server/api/getPost/[id].get.js`)
can point here by only setting `NUXT_BLOG_API_BASE` — no template changes.

## Deployment

Bitbucket Pipelines → the same Bitnami VM as `wsoftlabs-website-v2`, on port
`3001` (the Nuxt site holds `3000`). Blue/green swap with automatic
rollback, same pattern as the main site's `deploy.sh`.

Required env vars (see `.env.example` for the full list): `DATABASE_URI`,
`PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `MEDIA_DIR`, `NODE_ENV`.

Two failure modes from the old blog are deliberately closed here:

- **Database** — Postgres, not a file in the deploy directory. `DATABASE_URI`
  is one env var, so moving to AWS RDS later is a one-line change.
- **Uploads** — `MEDIA_DIR` must point *outside* the deploy directory
  (`APP_PATH`), or the blue/green swap will delete uploaded images on every
  deploy, exactly as happened to the old blog.

## Known issue — admin "Save Draft" under a production build

**Do not treat this as fixed.** Under `next build && next start` (this
project's production deploy target), the admin UI's "Save Draft"/"Publish"
PATCH request intermittently 403s, or succeeds but persists every field
empty — reproduced across Payload `3.88.0`/`3.89.0`, Next.js `16.2.6`/`16.3.5`,
Webpack and Turbopack builds, session-based and stateless JWT auth, and
pnpm's hoisted and default `node_modules` layouts. The same write succeeds
via Payload's Local API directly (used by the seed script and by every
public page) and via this same admin flow under `next dev`.

Two Playwright specs (`e2e/admin-crud.spec.ts`, `e2e/publish-toggle.spec.ts`)
are marked `test.fixme()` with the full diagnostic trail in comments,
rather than deleted or left silently failing. **Before treating this
prototype as production-ready, this needs a fix or an upstream report** —
see the WOS-313 verification report for the complete investigation.

## Testing

```bash
corepack pnpm exec playwright test
```

Requires the app built/served and Postgres reachable (`docker compose up -d`
+ `pnpm build && pnpm start`, or point `E2E_BASE_URL` at a running `pnpm dev`
instance — the admin-mutation specs above only pass against `pnpm dev`,
per the known issue).

## Backlog (explicitly out of scope for WOS-313)

Categories/tags, search, SEO (meta fields, sitemap, RSS, OG), analytics,
comments — old schema had category support but no current Nuxt template
reads it. Archive migration (1 real post live at `newsroom.wsoftlabs.dev` —
grab its banner image off the old server before decommissioning; it's on
local disk, not S3). WOS-314 cutover. Amending WOS-312 to note the renewed
site is Nuxt, not Next.js. Rotating the credentials committed in
`wsoftblog/Test.http`.
