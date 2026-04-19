import NextAuth from "next-auth";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
  const { authOptions } = await import("@/lib/auth");
  const handler = NextAuth(authOptions);
  return handler(req, { params });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
  const { authOptions } = await import("@/lib/auth");
  const handler = NextAuth(authOptions);
  return handler(req, { params });
}
