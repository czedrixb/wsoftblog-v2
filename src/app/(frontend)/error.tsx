"use client";

import { useEffect } from "react";

// Catches server-render failures for the public pages (e.g. Postgres
// unreachable, WOS-329) so visitors get a retry page instead of Next's raw
// production 500. Rendered client-side without a locale, so the copy is
// bilingual ko-first like the rest of the site chrome.
export default function FrontendError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">일시적인 오류가 발생했습니다</h1>
      <p className="mt-2 text-gray-600">Something went wrong while loading the blog.</p>
      <p className="mt-1 text-sm text-gray-400">
        잠시 후 다시 시도해 주세요. / Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        다시 시도 / Try again
      </button>
      {error.digest && (
        <p className="mt-6 text-xs text-gray-300">Error {error.digest}</p>
      )}
    </main>
  );
}
