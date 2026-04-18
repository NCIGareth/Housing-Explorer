import { PrismaClient } from "@prisma/client";
import { prisma as prismaBase } from "@housing/db";

export const prisma = prismaBase as PrismaClient;
