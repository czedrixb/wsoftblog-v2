import { postgresAdapter } from "@payloadcms/db-postgres";
import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { ko } from "@payloadcms/translations/languages/ko";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Posts } from "./collections/Posts";
import { Media } from "./collections/Media";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  // Payload's sanitize step pushes serverURL into this CSRF origin allowlist,
  // silently enabling strict Origin checking on every cookie-authed write.
  // NEXT_PUBLIC_SERVER_URL must therefore match the browser-facing origin
  // EXACTLY (scheme + host spelling + port) or all admin saves 403 — this was
  // the "Save Draft fails in production" bug: prod/e2e served on other ports
  // while the allowlist only held http://localhost:3000. The extra entries
  // cover the localhost/127.0.0.1 spelling difference in local dev.
  csrf: [
    process.env.NEXT_PUBLIC_SERVER_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter((origin): origin is string => Boolean(origin)),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
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
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
  }),
  sharp,
  // Non-devs publish unaided (WOS-312 §5) — the admin UI opens in Korean by
  // default. Post content itself is bilingual via field-level localization.
  localization: {
    locales: ["ko", "en"],
    defaultLocale: "ko",
    fallback: true,
  },
  i18n: {
    fallbackLanguage: "ko",
    supportedLanguages: { en, ko },
  },
  plugins: [],
});
