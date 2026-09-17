import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: { en: "Media", ko: "미디어" },
    plural: { en: "Media", ko: "미디어" },
  },
  admin: {
    hideAPIURL: true,
    description: {
      ko: "글에 쓰이는 이미지 보관함 — 배너 이미지는 여기에서 올립니다.",
      en: "Image library for posts — banner images are uploaded here.",
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: { en: "Alt text", ko: "대체 텍스트" },
      admin: {
        description: {
          ko: "이미지를 설명하는 짧은 문구 (스크린 리더·검색용).",
          en: "A short phrase describing the image (screen readers, search).",
        },
      },
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
