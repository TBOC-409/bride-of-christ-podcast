import Link from "next/link";
import { primaryButton } from "@/components/styles";

export default function NotFound() {
  return (
    <section className="px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-3 text-sm text-slate-600">This page does not exist. The live broadcast is on the home page.</p>
      <Link href="/" className={`${primaryButton} mt-6`}>
        Go to the live broadcast
      </Link>
    </section>
  );
}
