import type { CollectionConfig } from "payload";
import { slugify } from "@/lib/slugify";

export const Posts: CollectionConfig = {
  slug: "posts",
  labels: {
    singular: { en: "Post", ko: "포스트" },
    plural: { en: "Posts", ko: "포스트" },
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "publishedAt", "author"],
  },
  // Drafts are never public. Anonymous/public reads only see published posts;
  // logged-in users (editors/admins) can also see drafts in the admin UI.
  access: {
    read: ({ req }) => {
      if (req.user) return true;
      return { _status: { equals: "published" } };
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: {
      // WOS-312 §6 promises editors a visible "Write -> Save draft ->
      // Preview -> Publish" flow. Autosave alone hides that first step, so
      // we surface an explicit Save Draft button on top of it.
      autosave: { interval: 2000, showSaveDraftButton: true },
    },
    maxPerDoc: 25,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
    },
    {
      // Shared across locales on purpose — a post's URL must not change
      // when the reader switches language, or inbound links break.
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: "Auto-generated from the title. Edit only if you know why.",
      },
      hooks: {
        beforeValidate: [
          ({ value, data, originalDoc }) => {
            if (value) return value;
            const source = data?.title ?? originalDoc?.title;
            if (!source) return value;
            return slugify(typeof source === "string" ? source : String(source));
          },
        ],
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      localized: true,
    },
    {
      name: "content",
      type: "richText",
      localized: true,
    },
    {
      name: "banner",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value, operation }) => {
            // Stamp publishedAt the first time a post goes live, don't
            // overwrite it on later edits.
            if (value) return value;
            if (operation === "update" && siblingData._status === "published") {
              return new Date().toISOString();
            }
            return value;
          },
        ],
      },
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      admin: { position: "sidebar" },
    },
  ],
};
