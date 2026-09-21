import Link from "next/link";
import type { Locale } from "@/lib/locale";
import { withLocale } from "@/lib/locale";
import { t } from "@/lib/strings";

type Props = {
  locale: Locale;
  // Current route plus any non-locale query (e.g. "/", "/?page=2",
  // "/posts/my-slug") — used to build the "switch language" links so they
  // land on the same page the reader is already on.
  path: string;
};

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "ko", label: "한국어" },
  { locale: "en", label: "English" },
];

export function SiteHeader({ locale, path }: Props) {
  return (
    <header className="mx-auto mb-10 flex max-w-3xl items-center justify-between px-6 pt-16">
      <h1 className="text-3xl font-bold">
        <Link href={withLocale("/", locale)}>W Labs Blog</Link>
      </h1>
      <nav aria-label={t(locale).languageNav} className="flex items-center gap-2 text-sm">
        {OPTIONS.map((option, index) => {
          const active = option.locale === locale;
          return (
            <span key={option.locale} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" className="text-foreground opacity-40">|</span>}
              <Link
                href={withLocale(path, option.locale)}
                lang={option.locale}
                aria-current={active ? "true" : undefined}
                className={
                  active
                    ? "font-semibold underline"
                    : "underline opacity-60 hover:opacity-100"
                }
              >
                {option.label}
              </Link>
            </span>
          );
        })}
      </nav>
    </header>
  );
}
