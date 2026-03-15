export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const finals = await prisma.finalPlacement.findMany({
    where: { sessionId },
    include: { project: true },
  });
  return NextResponse.json(finals);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const { placements } = await req.json();

  // Upsert each final placement in a transaction
  const result = await prisma.$transaction(
    placements.map(
      (p: { projectId: string; horizon: number | null; status: string | null }) =>
        prisma.finalPlacement.upsert({
          where: {
            sessionId_projectId: { sessionId, projectId: p.projectId },
          },
          create: {
            sessionId,
            projectId: p.projectId,
            horizon: p.horizon,
            status: p.status,
          },
          update: {
            horizon: p.horizon,
            status: p.status,
          },
        })
    )
  );

  return NextResponse.json({ success: true, count: result.length });
}
