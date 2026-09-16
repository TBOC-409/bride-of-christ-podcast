import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { primaryButton } from "@/components/styles";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when the app is opened with no connection. */
export default function OfflinePage() {
  return (
    <section className="px-4 py-16 text-center sm:py-24">
      <Image
        src="/logo.png"
        alt=""
        width={80}
        height={80}
        className="mx-auto h-20 w-20 rounded-full bg-white object-cover shadow-[0_0_60px_rgba(226,180,87,.45)] ring-1 ring-gold-400/60"
      />
      <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-navy-950">You are offline</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-navy-950/60">
        The radio needs an internet connection. Your notes are still saved on this device, and the radio will
        play again as soon as you are back online.
      </p>
      <Link href="/" className={`${primaryButton} mt-6`}>
        Try again
      </Link>
    </section>
  );
}
