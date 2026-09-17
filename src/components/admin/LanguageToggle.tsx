"use client";

import { useTranslation } from "@payloadcms/ui";

// Payload's own account-settings language switcher (LanguageSelector.tsx)
// is just useTranslation()'s i18n.language + switchLanguage — this mirrors
// that exactly so a reader doesn't have to open Account to change the admin
// chrome language. Mounted via admin.components.actions (payload.config.ts),
// the one slot Payload renders in the top right of every admin view.
export const LanguageToggle = () => {
  const { i18n, switchLanguage } = useTranslation();
  const current = i18n.language === "en" ? "en" : "ko";

  return (
    <div
      aria-label={current === "ko" ? "언어" : "Language"}
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px" }}
    >
      <button
        type="button"
        onClick={() => switchLanguage?.("ko")}
        aria-current={current === "ko" ? "true" : undefined}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textDecoration: "underline",
          fontWeight: current === "ko" ? 600 : 400,
          opacity: current === "ko" ? 1 : 0.6,
          color: "inherit",
        }}
      >
        한국어
      </button>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>
        |
      </span>
      <button
        type="button"
        onClick={() => switchLanguage?.("en")}
        aria-current={current === "en" ? "true" : undefined}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textDecoration: "underline",
          fontWeight: current === "en" ? 600 : 400,
          opacity: current === "en" ? 1 : 0.6,
          color: "inherit",
        }}
      >
        English
      </button>
    </div>
  );
};
