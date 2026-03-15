export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Validate group token and return group + session info
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const group = await prisma.group.findUnique({
    where: { token },
    include: { session: { include: { projects: { orderBy: { createdAt: "asc" } } } } },
  });

  if (!group) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  // Get this group's placements
  const placements = await prisma.placement.findMany({
    where: { groupId: group.id },
  });

  return NextResponse.json({
    group: { id: group.id, name: group.name, token: group.token },
    session: {
      id: group.session.id,
      name: group.session.name,
      active: group.session.active,
    },
    projects: group.session.projects,
    placements,
  });
}
