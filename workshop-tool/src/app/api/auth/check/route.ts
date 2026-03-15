export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await isAdmin();
  return NextResponse.json({ authenticated: admin });
}
