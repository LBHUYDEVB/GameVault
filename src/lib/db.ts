import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getDbUrl(): string {
  if (process.env.DATABASE_PATH) {
    return `file:${process.env.DATABASE_PATH}`;
  }
  return `file:${path.resolve(process.cwd(), "dev.db")}`;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: getDbUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
