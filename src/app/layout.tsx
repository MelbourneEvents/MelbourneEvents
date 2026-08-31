import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melbourne Events — Networking, Workshops & Talks",
  description:
    "Find networking events, workshops, and talks happening in Melbourne, and jump straight to registration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <a href="/" className="text-lg font-bold text-brand-700">
              Melbourne Events
            </a>
            <p className="hidden text-sm text-slate-500 sm:block">
              Networking · Workshops · Talks
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-400">
          Melbourne Events is a community events index. Registration and event details are hosted by the organisers linked from each event.
        </footer>
      </body>
    </html>
  );
}
