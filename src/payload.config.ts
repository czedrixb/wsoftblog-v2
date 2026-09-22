import { postgresAdapter } from "@payloadcms/db-postgres";
import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { en } from "@payloadcms/translations/languages/en";
import { ko } from "@payloadcms/translations/languages/ko";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Posts } from "./collections/Posts";
import { Media } from "./collections/Media";
import { Users } from "./collections/Users";
import { csrfOrigins, serverURL } from "./lib/deployOrigins";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// On Vercel the filesystem is read-only outside /tmp, so a missing S3_BUCKET
// doesn't degrade to local storage — Media's disableLocalStorage stays false,
// generateFileData's fs.mkdir('media') throws ENOENT, and every upload 500s
// with no admin-visible reason why (WOS-329: this happened for weeks because
// Vercel's Production Branch was still `main`, which had no s3Storage plugin
// at all). Fail loudly at boot instead of on the first upload attempt.
if (process.env.VERCEL && !process.env.S3_BUCKET) {
  throw new Error(
    "S3_BUCKET is required on Vercel — media uploads cannot fall back to the local filesystem.",
  );
}

export default buildConfig({
  serverURL,
  // Payload's sanitize step pushes serverURL into this CSRF origin allowlist,
  // silently enabling strict Origin checking on every cookie-authed write.
  // NEXT_PUBLIC_SERVER_URL must therefore match the browser-facing origin
  // EXACTLY (scheme + host spelling + port) or all admin saves 403 — this was
  // the "Save Draft fails in production" bug: prod/e2e served on other ports
  // while the allowlist only held http://localhost:3000.
  //
  // On Vercel (WOS-324) a build-inlined value can never match a preview's
  // random *.vercel.app host, so serverURL/csrf are widened at runtime from
  // VERCEL_* vars instead (see src/lib/deployOrigins.ts) — production gets
  // its own stable domain, previews get relative media URLs plus every
  // origin they might actually be served from.
  csrf: csrfOrigins,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: "- W Labs",
      // Setting icons replaces Payload's default favicons entirely.
      icons: [{ rel: "icon", type: "image/svg+xml", url: "/wlabs-icon.svg" }],
    },
    components: {
      beforeDashboard: ["/components/admin/BeforeDashboard#BeforeDashboard"],
      // Top-right of every admin view — the same switchLanguage() Payload's
      // own Account > Payload Settings > Language selector uses, just
      // surfaced without a trip to /admin/account.
      actions: ["/components/admin/LanguageToggle#LanguageToggle"],
    },
  },
  collections: [Posts, Media, Users],
  // Non-developer authors expect a persistent toolbar at the top of the
  // editor (like Word/Notion); the default Lexical toolbar only appears on
  // text selection, which reads as "there is no toolbar" (WOS-320).
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, FixedToolbarFeature()],
  }),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // findMigrationDir() would resolve src/migrations from process.cwd()
    // anyway, but pin it so it doesn't depend on where the CLI is invoked.
    migrationDir: path.resolve(dirname, "migrations"),
    // Never let the adapter try `CREATE DATABASE` against Supabase.
    disableCreateDatabase: true,
    pool: {
      connectionString: process.env.DATABASE_URI || "",
      // Supavisor hands the connection back after every transaction, so a
      // per-lambda pool >1 on Vercel just holds idle sockets against
      // Supabase's pooler connection ceiling for no benefit.
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
    // Off-switch only (connect() already disables dev-push when
    // NODE_ENV=production), so this can't accidentally push schema. Exists
    // so a dev-mode local shell can be safely pointed at Supabase (e.g. to
    // seed it) without pushDevSchema() running and writing the batch:-1
    // marker row that makes `payload migrate` hang/no-op in CI (WOS-324).
    ...(process.env.PAYLOAD_DISABLE_PUSH === "true" ? { push: false } : {}),
    // prodMigrations deliberately NOT set: it would run inside connect() on
    // every serverless cold start with no locking — concurrent cold starts
    // would race the same DDL. Migrations run once, at build time, via the
    // Vercel build command (see vercel.json) and the `migrate` script below.
  }),
  sharp,
  // Non-devs publish unaided (WOS-312 §5) — the admin UI opens in Korean by
  // default. Post content is bilingual via explicit ko/en fields on Posts
  // (see src/collections/Posts.ts), not Payload's locale switcher — a
  // switcher made "my English text vanished" a recurring authoring bug.
  i18n: {
    fallbackLanguage: "ko",
    supportedLanguages: { en, ko },
  },
  plugins: [
    // Vercel's filesystem is ephemeral/read-only outside /tmp, so uploads
    // must go to object storage there (WOS-324). On the Bitnami VM (no
    // S3_BUCKET set) this is a no-op and Media.upload.staticDir / MEDIA_DIR
    // keep working exactly as before.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: {
        // `true`, not an options object, deliberately:
        //  - no disablePayloadAccessControl: URLs stay /api/media/file/<name>,
        //    so mediaPath(), next.config.ts's images.localPatterns, and
        //    banner-image.spec.ts all keep working untouched. (Supabase's
        //    disablePayloadAccessControl URL is the SigV4 S3 gateway path,
        //    not a public URL, so direct URLs would need a custom
        //    generateFileURL too — not worth it for a verification deploy.)
        //  - no prefix: @payloadcms/plugin-cloud-storage only adds a
        //    `prefix` DB column when prefix/alwaysInsertFields is set, so
        //    the drizzle schema is identical whether this plugin is enabled
        //    or not — one baseline migration covers both deploy targets.
        media: true,
      },
      bucket: process.env.S3_BUCKET || "",
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        forcePathStyle: true, // Supabase's S3 gateway is path-style only
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        },
      },
    }),
  ],
});
