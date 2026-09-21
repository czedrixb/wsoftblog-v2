import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";

// Replays every request in docs/postman/wsoftblog-v2.postman_collection.json
// against a live server, in order, so a stale URL/body/status expectation in
// the collection fails here instead of on someone's first import into
// Postman. See docs/postman/README.md for what the collection itself is for.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLECTION_PATH = path.resolve(
  __dirname,
  "../docs/postman/wsoftblog-v2.postman_collection.json",
);

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@wsoftlabs.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme-admin-123";

// 1x1 transparent PNG — same fixture banner-image.spec.ts uses for uploads.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

type PostmanItem = {
  name: string;
  item?: PostmanItem[];
  request?: {
    method: string;
    header?: { key: string; value: string }[];
    url: { raw: string };
    body?: {
      mode: "raw" | "formdata";
      raw?: string;
      formdata?: { key: string; type: "text" | "file"; value?: string }[];
    };
  };
};

type FlatRequest = { folder: string; name: string; request: NonNullable<PostmanItem["request"]> };

function flattenRequests(items: PostmanItem[], trail: string[] = []): FlatRequest[] {
  return items.flatMap((it) => {
    if (it.item) return flattenRequests(it.item, [...trail, it.name]);
    return [{ folder: trail.join(" / "), name: it.name, request: it.request! }];
  });
}

// Resolves {{var}} placeholders — including Postman's built-in dynamic
// variables this collection uses — against a live variable map. Mirrors
// Postman's own substitution: plain text replacement, so a variable placed
// inside quotes in the source JSON stays a string, and one placed bare (see
// "Create Post"'s `banner` field) becomes a bare JSON number.
function resolve(input: string, vars: Map<string, string>): string {
  return input.replace(/{{(\$?[\w.]+)}}/g, (_m, key: string) => {
    if (key === "$timestamp") return String(Math.floor(Date.now() / 1000));
    if (key === "$isoTimestamp") return new Date().toISOString();
    const value = vars.get(key);
    if (value === undefined) {
      throw new Error(`Unresolved Postman variable {{${key}}} — is it captured before this request runs?`);
    }
    return value;
  });
}

// Per-request expectations. Deliberately keyed by name and required (no
// fallback) so a request renamed/added/removed in the collection forces this
// spec to be updated rather than silently under-checking it.
type Expectation = {
  status: number;
  capture?: (json: unknown, vars: Map<string, string>) => void;
  assert?: (json: unknown) => void;
};

const EXPECTATIONS: Record<string, Expectation> = {
  Login: {
    status: 200,
    capture: (json, vars) => vars.set("authToken", (json as { token: string }).token),
    assert: (json) => expect(typeof (json as { token: string }).token).toBe("string"),
  },
  "Get Current User": { status: 200 },
  "Upload Media": {
    status: 201,
    capture: (json, vars) =>
      vars.set("mediaId", String((json as { doc: { id: number | string } }).doc.id)),
  },
  "List Media": { status: 200 },
  "Get Media by ID": { status: 200 },
  "Update Media (alt text)": { status: 200 },
  "Create Post": {
    status: 201,
    capture: (json, vars) => {
      const doc = (json as { doc: { id: number | string; slug: string } }).doc;
      vars.set("postId", String(doc.id));
      vars.set("postSlug", doc.slug);
    },
    assert: (json) => expect((json as { doc: { banner?: unknown } }).doc.banner).toBeTruthy(),
  },
  "List Posts": { status: 200 },
  "Get Post by ID": { status: 200 },
  "Find Post by Slug": {
    status: 200,
    assert: (json) => expect((json as { docs: unknown[] }).docs).toHaveLength(1),
  },
  "Publish Post": { status: 200 },
  "Delete Post": { status: 200 },
  "Delete Media": { status: 200 },
  "Create User": {
    status: 201,
    capture: (json, vars) =>
      vars.set("userId", String((json as { doc: { id: number | string } }).doc.id)),
  },
  "List Users": { status: 200 },
  "Get User by ID": { status: 200 },
  "Update User": { status: 200 },
  "Delete User": { status: 200 },
  "Legacy: List Posts (default locale)": {
    status: 200,
    assert: (json) => expect(Array.isArray(json)).toBe(true),
  },
  "Legacy: List Posts (English)": {
    status: 200,
    assert: (json) => expect(Array.isArray(json)).toBe(true),
  },
  "Legacy: Get Post by Slug": { status: 200 },
  Logout: { status: 200 },
};

async function fireRequest(
  api: APIRequestContext,
  baseURL: string,
  item: FlatRequest,
  vars: Map<string, string>,
) {
  const method = item.request.method.toLowerCase() as "get" | "post" | "patch" | "delete";
  const rawUrl = resolve(item.request.url.raw, vars);

  const headers: Record<string, string> = { Origin: baseURL };
  for (const h of item.request.header ?? []) headers[h.key] = resolve(h.value, vars);
  const authToken = vars.get("authToken");
  if (authToken) headers["Authorization"] = `JWT ${authToken}`;

  const options: { headers: Record<string, string>; data?: unknown; multipart?: Record<string, unknown> } = {
    headers,
  };

  if (item.request.body?.mode === "raw" && item.request.body.raw) {
    options.data = JSON.parse(resolve(item.request.body.raw, vars));
  } else if (item.request.body?.mode === "formdata" && item.request.body.formdata) {
    const multipart: Record<string, unknown> = {};
    for (const field of item.request.body.formdata) {
      multipart[field.key] =
        field.type === "file"
          ? { name: "postman-e2e-upload.png", mimeType: "image/png", buffer: PNG }
          : resolve(field.value ?? "", vars);
    }
    options.multipart = multipart;
  }

  return api[method](rawUrl, options);
}

test("every request in the Postman collection succeeds against a live server", async ({ baseURL }) => {
  test.skip(!baseURL, "requires a running server (E2E_BASE_URL, or the Playwright webServer)");

  const collection: { item: PostmanItem[] } = JSON.parse(fs.readFileSync(COLLECTION_PATH, "utf8"));
  const requests = flattenRequests(collection.item);
  expect(requests.length).toBeGreaterThan(0);

  const vars = new Map<string, string>([
    ["baseUrl", baseURL!],
    ["adminEmail", ADMIN_EMAIL],
    ["adminPassword", ADMIN_PASSWORD],
    ["legacyPostSlug", "welcome-to-the-w-labs-blog"],
  ]);

  // A fresh, cookie-less context: this collection authenticates purely via
  // the Authorization header, and Playwright's default `request` fixture
  // would otherwise carry the admin.json storageState cookie — masking a
  // broken header-auth flow, which is exactly what this spec exists to catch.
  const api = await pwRequest.newContext({ baseURL });

  try {
    for (const item of requests) {
      const expectation = EXPECTATIONS[item.name];
      if (!expectation) {
        throw new Error(
          `No expectation registered in postman-collection.spec.ts for "${item.folder} / ${item.name}" — ` +
            "the collection changed; update EXPECTATIONS to match.",
        );
      }

      const res = await fireRequest(api, baseURL!, item, vars);
      expect(res.status(), `${item.folder} / ${item.name} -> ${res.status()} ${await res.text()}`).toBe(
        expectation.status,
      );

      if (expectation.capture || expectation.assert) {
        const json = await res.json();
        expectation.capture?.(json, vars);
        expectation.assert?.(json);
      }
    }
  } finally {
    // Best-effort safety net: if an assertion threw partway through, the
    // collection's own Delete steps never ran. Clean up whatever we can with
    // whatever auth we still have (a no-longer-valid token just 401s these,
    // which is fine — nothing else should exist for it to delete).
    const cleanupHeaders: Record<string, string> = { Origin: baseURL! };
    const authToken = vars.get("authToken");
    if (authToken) cleanupHeaders["Authorization"] = `JWT ${authToken}`;

    const postId = vars.get("postId");
    const mediaId = vars.get("mediaId");
    const userId = vars.get("userId");
    if (postId) await api.delete(`/api/posts/${postId}`, { headers: cleanupHeaders }).catch(() => {});
    if (mediaId) await api.delete(`/api/media/${mediaId}`, { headers: cleanupHeaders }).catch(() => {});
    if (userId) await api.delete(`/api/users/${userId}`, { headers: cleanupHeaders }).catch(() => {});

    await api.dispose();
  }
});
