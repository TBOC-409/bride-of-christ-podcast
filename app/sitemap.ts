import type { MetadataRoute } from "next";
import { sessionsForSitemap } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sessions = await sessionsForSitemap();
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...sessions.map((session) => ({
      url: `${siteUrl}/sessions/${session.id}`,
      lastModified: session.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
