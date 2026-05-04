import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

/** Walk Error.cause and common shapes so driver/Rust messages still match. */
function collectErrorText(error: unknown, depth = 0): string {
  if (error == null || depth > 12) return "";
  if (error instanceof Error) {
    return `${error.message} ${collectErrorText(error.cause, depth + 1)}`;
  }
  if (typeof error === "object") {
    const o = error as { message?: unknown; cause?: unknown };
    if (typeof o.message === "string") {
      return `${o.message} ${collectErrorText(o.cause, depth + 1)}`;
    }
  }
  try {
    return String(error);
  } catch {
    return "";
  }
}

const isConnectionClosedError = (error: unknown) => {
  const text = collectErrorText(error).toLowerCase();
  return (
    text.includes("postgresql connection") ||
    text.includes("kind: closed") ||
    text.includes("connection closed") ||
    text.includes("server closed the connection") ||
    text.includes("connection terminated") ||
    text.includes("econnreset") ||
    text.includes("broken pipe") ||
    text.includes("can't reach database server")
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
