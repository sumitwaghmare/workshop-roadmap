export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const groups = await prisma.group.findMany({
    where: { sessionId },
    include: { _count: { select: { placements: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, name } = await req.json();
  if (!sessionId || !name) {
    return NextResponse.json({ error: "sessionId and name required" }, { status: 400 });
  }

  const group = await prisma.group.create({ data: { sessionId, name } });
  return NextResponse.json(group, { status: 201 });
}
