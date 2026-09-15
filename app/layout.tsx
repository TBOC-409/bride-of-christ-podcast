import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const siteName = "The Bride of Christ Podcast";
const description =
  "Live audio sessions from The Bride of Christ, with a private notepad to capture what speaks to you.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s — ${siteName}` },
  description,
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: { siteName, title: siteName, description, type: "website", images: ["/icon-512.png"] },
};

export const viewport: Viewport = { themeColor: "#0ea5e9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="site-public-page min-h-screen text-slate-900">
        <header className="sticky top-0 z-50 border-b border-white/60 bg-sky-50/75 shadow-sm shadow-sky-100/50 backdrop-blur-2xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${siteName} home`}>
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                priority
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm sm:h-10 sm:w-10"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-wide">The Bride of Christ</span>
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80">
                  Podcast
                </span>
              </span>
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="px-4 py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} The Bride of Christ
        </footer>
      </body>
    </html>
  );
}
