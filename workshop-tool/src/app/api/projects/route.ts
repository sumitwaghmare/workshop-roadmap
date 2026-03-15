export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const projects = await prisma.project.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, name, description, icon, createdBy } = body;

  if (!sessionId || !name) {
    return NextResponse.json({ error: "sessionId and name required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { sessionId, name, description, icon, createdBy: createdBy || "admin" },
  });
  return NextResponse.json(project, { status: 201 });
}
