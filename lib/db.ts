import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl(): string | undefined {
  const configured = process.env.DATABASE_URL;
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    // Supabase's pooler on port 6543 shares connections between clients, so
    // Prisma must be told or its prepared statements collide and queries fail
    // at random. The dashboard's copy of the string omits it.
    if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    // A small, bounded pool. Every page reads a handful of rows, and the pooler
    // is shared with the church site.
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "3");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return configured;
  }
}

const url = databaseUrl();

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
