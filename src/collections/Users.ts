import type { CollectionConfig } from "payload";

// Per WOS-312 §6 — keep the non-dev publishing flow simple: two roles only.
// `editor` can create/edit/publish posts; `admin` (the two named maintainers)
// additionally manages users. No GitHub account, no Git, ever required.
export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: { en: "User", ko: "사용자" },
    plural: { en: "Users", ko: "사용자" },
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
  },
  auth: true,
  access: {
    // Public read at the collection level — `name`/`twitter` are meant to be
    // shown on published posts (byline, OG tags), same as the old wire
    // contract. `email` and `role` are locked down at the field level below.
    read: () => true,
    create: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => {
      if (req.user?.role === "admin") return true;
      return { id: { equals: req.user?.id } };
    },
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      // Overrides the field `auth: true` injects automatically, so it can
      // be hidden from anonymous/public reads (collection-level read is
      // public, for name/twitter — email and role are not).
      name: "email",
      type: "email",
      required: true,
      unique: true,
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Editor", value: "editor" },
        { label: "Admin", value: "admin" },
      ],
      saveToJWT: true,
      access: {
        read: ({ req }) => Boolean(req.user),
        // Only an admin may change roles — an editor cannot self-promote.
        update: ({ req }) => req.user?.role === "admin",
      },
    },
    {
      name: "twitter",
      label: "Twitter / X handle",
      type: "text",
    },
  ],
};
