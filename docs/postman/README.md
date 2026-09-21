# wsoftblog-v2 Postman collection

A Postman collection for this project's HTTP API: Payload's REST layer
(`/api/posts`, `/api/media`, `/api/users` + auth) and the two legacy
wire-compat routes the Nuxt marketing site consumes (`/api/getPosts`,
`/api/getPost/:id`).

There was no API documentation or HTTP-client tooling in this repo before
this — no OpenAPI spec, no `.http` file, nothing. Discovery is otherwise
source-only: all three collections set `hideAPIURL: true`, so the admin UI
deliberately doesn't surface these URLs either.

## Files

- `wsoftblog-v2.postman_collection.json` — the collection: 5 folders, auth
  wiring, request/field descriptions, and test scripts that chain IDs between
  requests.
- `wsoftblog-v2.local.postman_environment.json` — `baseUrl` +
  the seeded admin credentials for local dev.

## Import & run

1. In Postman: **Import** both JSON files (collection + environment).
2. Select the **wsoftblog-v2 · local** environment (top-right environment
   picker).
3. Make sure `baseUrl` matches the app's `NEXT_PUBLIC_SERVER_URL` **exactly**
   — scheme, host spelling, and port. Payload derives its CSRF origin
   allowlist from that env var; a mismatch 403s every write (see "Auth
   model" below). Against a plain `pnpm dev`, the default `http://localhost:3000`
   is already correct.
4. Run **00 · Auth → Login**. Its test script stores the returned JWT in the
   collection variable `authToken`; every other request already sends
   `Authorization: JWT {{authToken}}` (set once at the collection level).
5. From there, folders `01`–`04` can be run individually or via **Run
   collection** top to bottom — each folder's create request chains its new
   id into the requests below it (`mediaId`, `postId`, `postSlug`, `userId`).
6. Run **05 · End Session → Logout** last, not before — this app uses
   Payload's session tracking, so logout invalidates `authToken` immediately
   (see that folder's description).

## Auth model

This app is not friendly to a plain HTTP client using cookie auth. Payload's
cookie strategy requires either an `Origin` header that matches the app's
`csrf` allowlist, or a `Sec-Fetch-Site` header — a real browser sends one of
those automatically; Postman (or curl) sends neither by default. Cookie auth
would just silently 403.

So this collection authenticates with the `Authorization: JWT <token>`
header instead, which Payload accepts independent of CSRF. A collection-level
pre-request script also stamps `Origin: {{baseUrl}}` on every request, so a
request switched to cookie auth still works.

One more wrinkle: Payload's default `useSessions: true` means each login is
tracked as a session on the user's own doc, and logout deletes that session
server-side — so the same `authToken` stops working immediately after
logout, well before its 2-hour expiry. That's why Logout has its own folder
at the very end instead of sitting next to Login.

## Folders

| Folder | Contents |
|---|---|
| `00 · Auth` | Login (captures the token), Get Current User |
| `01 · Media` | Upload (multipart, captures `mediaId`), List, Get, Update |
| `02 · Posts` | Create (attaches the uploaded media as `banner`, captures `postId`/`postSlug`), List, Get by ID, Find by slug, Publish, Delete, Delete Media (cleanup, run last since the post referenced it) |
| `03 · Users` | Create (admin-only, captures `userId`), List, Get, Update, Delete |
| `04 · Legacy wire-compat` | The three public, read-only, snake_case endpoints the Nuxt site proxies to |
| `05 · End Session` | Logout — run this last; see "Auth model" below |

Each request's Postman description covers its required/optional body
fields, access rules, and response shape. The collection description (visible
in Postman under the collection's root) repeats the sharpest gotchas —
integer IDs, wrapped create responses (`{ doc: {...} }`), `?locale=` only
applying to folder `04`, and `publishedAt` not being auto-stamped on create.

## Verifying the collection itself

`e2e/postman-collection.spec.ts` replays every request in
`wsoftblog-v2.postman_collection.json` against a running server and asserts
status codes, so a stale URL or body shape fails CI instead of surfacing on
someone's first import. See that file, or the project's e2e README, for how
to run it.
