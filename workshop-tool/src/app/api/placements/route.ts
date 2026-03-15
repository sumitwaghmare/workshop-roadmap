export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const groupId = searchParams.get("groupId");

  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const where: Record<string, string> = {};
  if (groupId) where.groupId = groupId;
  // Filter by sessionId via project relation
  const placements = await prisma.placement.findMany({
    where: {
      ...where,
      project: { sessionId },
    },
    include: { project: true, group: true },
  });
  return NextResponse.json(placements);
}

export async function PUT(req: Request) {
  const { projectId, groupId, horizon, status } = await req.json();

  if (!projectId || !groupId) {
    return NextResponse.json({ error: "projectId and groupId required" }, { status: 400 });
  }

  // Verify the group's session is still active
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { session: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!group.session.active) {
    return NextResponse.json({ error: "Session is no longer active" }, { status: 403 });
  }

  const placement = await prisma.placement.upsert({
    where: { projectId_groupId: { projectId, groupId } },
    create: { projectId, groupId, horizon, status },
    update: { horizon, status },
  });
  return NextResponse.json(placement);
}
