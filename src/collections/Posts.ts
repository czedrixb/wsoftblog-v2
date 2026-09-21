import type { CollectionConfig } from "payload";
import { slugify } from "@/lib/slugify";

export const Posts: CollectionConfig = {
  slug: "posts",
  labels: {
    singular: { en: "Post", ko: "포스트" },
    plural: { en: "Posts", ko: "포스트" },
  },
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug"],
    hideAPIURL: true,
    description: {
      ko: "글을 쓰고 '초안 저장'으로 보관하거나 '변경 사항 게시'로 발행하세요.",
      en: "Write a post, keep it with Save Draft, or make it live with Publish.",
    },
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
      // Unnamed tabs keep title/content/titleEn/etc. all top-level fields
      // (a named tab would namespace them under `ko.title`, breaking
      // useAsTitle/defaultColumns/listSearchableFields below). Two full
      // language tabs on one screen so authors never need a locale switcher
      // to write the other language (WOS-320 follow-up).
      type: "tabs",
      tabs: [
        {
          label: { en: "Korean", ko: "한국어" },
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              label: { en: "Title (Korean)", ko: "제목" },
              admin: {
                description: {
                  ko: "글의 제목입니다.",
                  en: "The post's title.",
                },
              },
            },
            {
              name: "content",
              type: "richText",
              label: { en: "Content (Korean)", ko: "본문" },
              admin: {
                description: {
                  ko: "본문을 입력하세요. 서식은 위쪽 도구 모음을 사용하세요.",
                  en: "Write the post body. Use the toolbar above for formatting.",
                },
              },
            },
            {
              name: "excerpt",
              type: "textarea",
              label: { en: "Excerpt (Korean)", ko: "요약" },
              admin: {
                description: {
                  ko: "목록 화면에 보이는 한두 문장 요약 (선택).",
                  en: "One or two sentences shown on list pages (optional).",
                },
              },
            },
          ],
        },
        {
          label: { en: "English", ko: "English" },
          fields: [
            {
              name: "titleEn",
              type: "text",
              label: { en: "Title (English)", ko: "제목 (영문)" },
              admin: {
                description: {
                  ko: "선택 사항입니다. 비워두면 한국어 제목이 대신 표시됩니다.",
                  en: "Optional. If left blank, the Korean title is shown instead.",
                },
              },
            },
            {
              name: "contentEn",
              type: "richText",
              label: { en: "Content (English)", ko: "본문 (영문)" },
              admin: {
                description: {
                  ko: "선택 사항입니다. 비워두면 한국어 본문이 대신 표시됩니다.",
                  en: "Optional. If left blank, the Korean content is shown instead.",
                },
              },
            },
            {
              name: "excerptEn",
              type: "textarea",
              label: { en: "Excerpt (English)", ko: "요약 (영문)" },
              admin: {
                description: {
                  ko: "선택 사항입니다. 비워두면 한국어 요약이 대신 표시됩니다.",
                  en: "Optional. If left blank, the Korean excerpt is shown instead.",
                },
              },
            },
          ],
        },
      ],
    },
    {
      // Shared across languages, not part of either tab — collapsed by
      // default so the edit screen stays title + body first (WOS-320).
      type: "collapsible",
      label: { en: "Additional info", ko: "추가 정보" },
      admin: { initCollapsed: true },
      fields: [
        {
          name: "banner",
          type: "upload",
          relationTo: "media",
          label: { en: "Banner image", ko: "배너 이미지" },
          admin: {
            description: {
              ko: "글 상단에 표시되는 큰 이미지 (선택).",
              en: "Large image shown at the top of the post (optional).",
            },
          },
        },
      ],
    },
    {
      // Shared across languages on purpose — a post's URL must not change
      // when the reader switches language, or inbound links break.
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: { en: "Slug (URL)", ko: "슬러그 (URL)" },
      admin: {
        position: "sidebar",
        description: {
          ko: "제목에서 자동 생성됩니다. 이유를 알 때만 수정하세요.",
          en: "Auto-generated from the title. Edit only if you know why.",
        },
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
      name: "publishedAt",
      type: "date",
      label: { en: "Published at", ko: "발행일" },
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description: {
          ko: "처음 게시할 때 자동으로 채워집니다.",
          en: "Filled in automatically the first time you publish.",
        },
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
      label: { en: "Author", ko: "작성자" },
      admin: { position: "sidebar" },
    },
  ],
};
