// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const url = process.env.DATABASE_URL;
    console.log("✅ Prisma (adapter-pg). DATABASE_URL set?", !!url);
    if (!url) throw new Error("Falta DATABASE_URL en el entorno del server");

    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
