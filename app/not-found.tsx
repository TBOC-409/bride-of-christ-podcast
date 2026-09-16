import Link from "next/link";
import { primaryButton } from "@/components/styles";

export default function NotFound() {
  return (
    <section className="px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight text-navy-950">Page not found</h1>
      <p className="mt-3 text-sm text-navy-950/60">This page does not exist. The live broadcast is on the home page.</p>
      <Link href="/" className={`${primaryButton} mt-6`}>
        Go to the live broadcast
      </Link>
    </section>
  );
}
