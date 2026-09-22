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

**pnpm 12 lockfile note:** `pnpm-lock.yaml` is a two-YAML-document file (pnpm
12 writes a leading "env lockfile" document for its self-managed
`@pnpm/exe.*` binaries ahead of the real project lockfile). Vercel's
documented pnpm support tops out at pnpm 10, so a naive single-document
parser can choke on it — see the Vercel section under Deployment below for
the mitigation in `vercel.json`.

**Version pin constraint:** `@payloadcms/next@3.89.0`'s peer range for
`next` is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`.
Don't bump Next past `17.0.0`, or below the matching Payload minor, without
checking this range first.

## Local setup

```bash
corepack pnpm install
cp .env.example .env        # fill in PAYLOAD_SECRET with a real generated value
# start Postgres locally (matching DATABASE_URI: wsoftblog/wsoftblog on localhost:5432)
corepack pnpm migrate       # applies src/migrations/ (schema is not auto-pushed in production)
corepack pnpm seed          # creates admin+editor users and ~5 demo posts
corepack pnpm dev           # http://localhost:3000, admin at /admin
```

Local dev still auto-pushes schema changes on every `next dev`/`payload` run
(`NODE_ENV=development`) — `pnpm migrate` above is only needed the first
time, or after pulling a new migration. `src/migrations/` holds a single
squashed baseline (`initial`) capturing the full current schema; there is no
incremental migration history before it (see the comment at the top of that
file for why, and `docs/archive/` for what it replaced).

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

Two deploy targets exist side by side. The VM path is production; the
Vercel path (WOS-324) is a **free-tier verification deploy only** — it
proves the stack works end to end, and is not itself a production decision.

### VM (Bitnami, production)

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

**Known gap:** the pipeline does not run `payload migrate` — the VM database
has never had migration bookkeeping (`payload_migrations`). If that ever
changes, baseline it first (see the comment at the top of
`src/migrations/20260921_085427_initial.ts`), or the baseline's `CREATE
TABLE` statements will collide with the VM's existing schema. Tracked in the
WOS-324 follow-up ticket, not fixed here.

### Vercel + Supabase (WOS-324, free-tier verification)

Vercel (Next.js hosting, serverless functions) + Supabase (pooled Postgres +
S3-compatible object storage for media). `next.config.ts`'s `output:
"standalone"` is conditional on `process.env.VERCEL` — Vercel's own adapter
breaks if standalone mode is left on.

**Env vars** (Vercel dashboard, Production + Preview unless noted):

| Var | Value | Notes |
|---|---|---|
| `DATABASE_URI` | Supabase **transaction pooler**, `:6543` | runtime |
| `DATABASE_URI_SESSION` | Supabase **session pooler**, `:5432` | only used by the manual laptop bootstrap below, not by the build |
| `PAYLOAD_SECRET` | freshly generated, not the VM's value | |
| `NEXT_PUBLIC_SERVER_URL` | the production `.vercel.app` URL | **Production only** — build-inlined; left unset on Preview so CSRF/serverURL fall back to runtime `VERCEL_*` vars (see `src/lib/deployOrigins.ts`) |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from Supabase Storage → Settings | enables `@payloadcms/storage-s3` in `src/payload.config.ts`; absent → local-disk storage (VM behavior) |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | so Vercel honours `packageManager: pnpm@12.4.1` |

Also enable **Settings → Environment Variables → "Enable access to System
Environment Variables"**, required for `VERCEL_URL` / `VERCEL_BRANCH_URL` /
`VERCEL_PROJECT_PRODUCTION_URL` to reach the app.

**Settings → Git → Production Branch must be `main`.** WOS-329: this branch
was merged into `main` after Vercel's Production Branch was found still
pointing at pre-merge `main` (`plugins: []`, no `s3Storage`) — every media
upload attempted a local-disk write on Vercel's read-only filesystem and
500'd. `src/payload.config.ts` now throws at boot if `VERCEL` is set without
`S3_BUCKET`, so a repeat of this fails the deploy loudly instead of only the
first upload.

Do **not** set `MEDIA_DIR` or `NODE_ENV` on Vercel — the former is obsolete
once `S3_BUCKET` is set, the latter is reserved/managed by the platform.

Bootstrapping a fresh Supabase database from a laptop (proves the migration
baseline independent of the Vercel build):

```bash
cp .env.example .env.supabase   # fill in the Supabase values above, plus:
#   NODE_ENV=production
#   PAYLOAD_DISABLE_PUSH=true   # belt-and-braces so this shell can never
#                               # dev-push schema at a remote database
corepack pnpm migrate:supabase
corepack pnpm migrate:supabase:status   # every row should read "Yes"
corepack pnpm seed:supabase
```

**`vercel.json`'s build command does *not* run `payload migrate`.** It did
originally (WOS-324), but Vercel's *build* container could not reach
Supabase's pooler at all (bare TCP connect timeout) even with credentials
that were independently verified to work — reachable, unrestricted, correct
password — from both a laptop and the deployed *function* runtime (which
successfully serves `/api/posts` and `/api/media` today). Whatever blocks
outbound DB connections from Vercel's build step specifically remains
unexplained; rather than block every deploy on it, migrations here go back
to being applied by hand from a laptop (below), the same as the VM. Re-adding
a build-time migrate step is a follow-up, not a blocker (WOS-329).

## Fixed — admin "Save Draft" 403 under a production build (CSRF origin)

Previously, admin Save Draft/Publish failed under `next build && next start`
(403, or fields persisted empty) while working under `next dev` and via the
Local API. **Root cause:** Payload silently pushes `serverURL` into its CSRF
origin allowlist, and every production run served on a port other than 3000
(e2e 3100, deploy 3001) while `NEXT_PUBLIC_SERVER_URL` stayed
`http://localhost:3000` — so the browser's `Origin` header on PATCH/POST got
the auth cookie discarded. It was never a Payload/Next incompatibility; the
discriminating variable was the port, and `next dev` "worked" only because it
happens to run on 3000. Confirmed by replaying the same authenticated PATCH
with only the `Origin` header varied (403 vs 200).

**The invariant to keep:** `NEXT_PUBLIC_SERVER_URL` must equal the
browser-facing origin exactly (scheme + host spelling + port) in every
environment. `payload.config.ts` additionally allowlists
`http://localhost:3000` / `http://127.0.0.1:3000` for local dev, and
`playwright.config.ts` builds the e2e production server with
`NEXT_PUBLIC_SERVER_URL` set to its own baseURL.

**And note it's baked in at build time:** `NEXT_PUBLIC_*` values are inlined
into the bundle during `next build` (the pipeline writes `.env` before
building, so CI is covered). Changing the VM's `.env` after the fact does
nothing for this variable — a wrong value needs a rebuild + redeploy.

**Vercel addendum (WOS-324):** a build-inlined value can never match a
Vercel *preview* deployment's random `*.vercel.app` hostname. `serverURL`
and `csrf` are only build-inlined because of the `NEXT_PUBLIC_` prefix —
`csrf` itself never reaches the client, and `serverURL` is attached to the
per-request client config server-side, not baked into the bundle. So
`src/lib/deployOrigins.ts` widens both at runtime from `VERCEL_*` system env
vars: production keeps an explicit `NEXT_PUBLIC_SERVER_URL`, and previews
get an empty `serverURL` (→ relative media URLs) plus every origin the
preview might actually be served from in `csrf`. Same invariant, just
resolved at request time instead of at build time where a preview can't
satisfy it.

## Testing

```bash
corepack pnpm exec playwright test
```

Requires Postgres reachable at `DATABASE_URI`. With no `E2E_BASE_URL`
set, Playwright builds and serves a production build itself (port 3100) with
`NEXT_PUBLIC_SERVER_URL` matching that origin; all specs, including the
admin-mutation ones, pass against it.

To run against a deployed Vercel URL instead (WOS-324 verification):

```bash
E2E_BASE_URL=https://<project>.vercel.app \
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
SEED_EDITOR_EMAIL=... SEED_EDITOR_PASSWORD=... \
corepack pnpm exec playwright test
```

`webServer` is skipped entirely when `E2E_BASE_URL` is set. Seed the target
database first (see the Vercel deployment section above) so the exact-content
assertions (3 published posts = one page, known slugs) pass. Check the
project's Deployment Protection setting first — anything stricter than
"Standard" puts an SSO wall in front of the production domain and every spec
fails at the first `page.goto`.

## Backlog (explicitly out of scope for WOS-313)

Categories/tags, search, SEO (meta fields, sitemap, RSS, OG), analytics,
comments — old schema had category support but no current Nuxt template
reads it. Archive migration (1 real post live at `newsroom.wsoftlabs.dev` —
grab its banner image off the old server before decommissioning; it's on
local disk, not S3). WOS-314 cutover. Amending WOS-312 to note the renewed
site is Nuxt, not Next.js. Rotating the credentials committed in
`wsoftblog/Test.http`.
