import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
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
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Posts, Media, Users],
  editor: lexicalEditor(),
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
