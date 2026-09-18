import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { InstallApp } from "@/components/install-app";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });

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
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-haze-100 text-navy-950">
        <header className="sticky top-0 z-50 border-b border-navy-950/[0.07] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${siteName} home`}>
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                priority
                className="h-9 w-9 shrink-0 rounded-xl bg-white object-cover ring-1 ring-navy-950/10 sm:h-[34px] sm:w-[34px]"
              />
              <span className="min-w-0 leading-none">
                <span className="block truncate text-[15px] font-semibold uppercase tracking-[0.1em] text-navy-950 sm:text-base">
                  In His Presence
                </span>
                <span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-[0.2em] text-navy-950/45">
                  The Bride of Christ
                </span>
              </span>
            </Link>
            <InstallApp />
          </div>
        </header>
        <main>{children}</main>
        {/* Extra room at the bottom on phones, where the mini player docks. */}
        <footer className="mt-10 border-t border-haze-200 px-4 pb-28 pt-8 text-center text-xs text-navy-950/45 lg:pb-8">
          © {new Date().getFullYear()} The Bride of Christ · In His Presence radio
        </footer>
      </body>
    </html>
  );
}
