import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const isConnectionClosedError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("postgresql connection") ||
    message.includes("error { kind: closed") ||
    message.includes("connection closed") ||
    message.includes("can't reach database server")
  );
};

export const withPrismaReconnect = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (!isConnectionClosedError(error)) {
      throw error;
    }

    await prisma.$connect();
    return operation();
  }
};

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
