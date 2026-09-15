import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: { en: "Media", ko: "미디어" },
    plural: { en: "Media", ko: "미디어" },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      localized: true,
    },
  ],
  upload: {
    staticDir: process.env.MEDIA_DIR || "media",
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 300,
        position: "centre",
      },
      {
        name: "banner",
        width: 1600,
        height: 900,
        position: "centre",
      },
    ],
    mimeTypes: ["image/*"],
  },
};
