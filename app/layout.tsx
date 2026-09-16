import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { InstallApp } from "@/components/install-app";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const siteName = "In His Presence";
const description =
  "In His Presence, the live radio of The Bride of Christ, around the clock, with a private notepad to capture what speaks to you.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} — The Bride of Christ`, template: `%s — ${siteName}` },
  description,
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: { siteName, title: siteName, description, type: "website", images: ["/icon-512.png"] },
  // Lets iPhones open the home-screen shortcut full screen, like an app.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "IHP Radio" },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="presence-light min-h-screen text-navy-950">
        <header className="sticky top-0 z-50 border-b border-sky-wash-200 bg-white shadow-[0_8px_24px_-16px_rgba(21,32,99,0.25)]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${siteName} home`}>
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                priority
                className="h-9 w-9 shrink-0 rounded-full bg-white object-cover shadow-sm ring-2 ring-gold-400/70"
              />
              <span className="min-w-0 leading-none">
                <span className="block truncate font-serif text-[15px] font-semibold uppercase tracking-[0.12em] text-navy-950 sm:text-base">
                  In His Presence
                </span>
                <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-700">
                  The Bride of Christ
                </span>
              </span>
            </Link>
            <InstallApp />
          </div>
        </header>
        <main>{children}</main>
        {/* Extra room at the bottom on phones, where the mini player docks. */}
        <footer className="px-4 pb-28 pt-10 text-center text-xs text-navy-950/45 lg:pb-10">
          © {new Date().getFullYear()} The Bride of Christ · In His Presence radio
        </footer>
      </body>
    </html>
  );
}
