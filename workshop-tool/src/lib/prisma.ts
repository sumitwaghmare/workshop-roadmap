import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // Prisma 7 requires explicit datasourceUrl if not in schema.prisma
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  } as any);
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
