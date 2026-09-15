import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "W Labs Blog",
  description: "W Labs blog — standalone prototype (WOS-313)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
