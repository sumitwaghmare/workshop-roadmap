export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true, groups: true } } },
    });
    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("GET /api/sessions runtime error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message,
      code: error.code,
      meta: error.meta 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  const session = await prisma.session.create({ data: { name } });
  return NextResponse.json(session, { status: 201 });
}
