import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Posts.title/content/excerpt and Media.alt stop being `localized: true` in
// favor of explicit ko/en fields (title/titleEn, content/contentEn,
// excerpt/excerptEn) — see src/collections/Posts.ts and Media.ts. With
// localization on, that text lives only in posts_locales / media_locales /
// _posts_v_locales, keyed by _locale. This migration is additive-only: it
// adds the new base-table columns and backfills them from the *_locales
// tables. It deliberately does NOT drop posts_locales / media_locales /
// _posts_v_locales — that happens in a later, separate migration, once the
// counts below have been verified against production:
//
//   SELECT _locale, count(*) FROM posts_locales GROUP BY _locale;
//   -- vs.
//   SELECT count(title) AS ko, count(title_en) AS en FROM posts;
//
// (and the equivalent for media_locales/alt and _posts_v_locales/version_*).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Posts: add the new columns (nullable — Payload's "required: true" on
    -- the Korean title is enforced at the application layer, not the DB, so
    -- this matches the column Payload itself would generate for the field).
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content" jsonb;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "excerpt" varchar;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "title_en" varchar;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content_en" jsonb;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "excerpt_en" varchar;

    UPDATE "posts" p
    SET "title" = pl.title, "content" = pl.content, "excerpt" = pl.excerpt
    FROM "posts_locales" pl
    WHERE pl._parent_id = p.id AND pl._locale = 'ko';

    UPDATE "posts" p
    SET "title_en" = pl.title, "content_en" = pl.content, "excerpt_en" = pl.excerpt
    FROM "posts_locales" pl
    WHERE pl._parent_id = p.id AND pl._locale = 'en';

    -- Versions (drafts/autosave history): same shape, "version_" prefixed.
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_title" varchar;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_content" jsonb;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_excerpt" varchar;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_title_en" varchar;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_content_en" jsonb;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_excerpt_en" varchar;

    UPDATE "_posts_v" v
    SET "version_title" = vl.version_title,
        "version_content" = vl.version_content,
        "version_excerpt" = vl.version_excerpt
    FROM "_posts_v_locales" vl
    WHERE vl._parent_id = v.id AND vl._locale = 'ko';

    UPDATE "_posts_v" v
    SET "version_title_en" = vl.version_title,
        "version_content_en" = vl.version_content,
        "version_excerpt_en" = vl.version_excerpt
    FROM "_posts_v_locales" vl
    WHERE vl._parent_id = v.id AND vl._locale = 'en';

    -- Media.alt is required:true, so the target column is NOT NULL. Add it
    -- nullable first, backfill (ko preferred, en as fallback for any row
    -- authored only in English), THEN enforce NOT NULL — if any row has
    -- neither locale's alt text, this SET NOT NULL fails loudly and rolls
    -- back the whole transaction rather than silently writing a blank alt.
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt" varchar;

    UPDATE "media" m
    SET "alt" = COALESCE(
      (SELECT alt FROM "media_locales" ml WHERE ml._parent_id = m.id AND ml._locale = 'ko'),
      (SELECT alt FROM "media_locales" ml WHERE ml._parent_id = m.id AND ml._locale = 'en')
    );

    ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
    ALTER TABLE "media" DROP COLUMN IF EXISTS "alt";

    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_title";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_content";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_excerpt";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_title_en";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_content_en";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_excerpt_en";

    ALTER TABLE "posts" DROP COLUMN IF EXISTS "title";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "content";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "excerpt";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "title_en";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "content_en";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "excerpt_en";
  `)
}
