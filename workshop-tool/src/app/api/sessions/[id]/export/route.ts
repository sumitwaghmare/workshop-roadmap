export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, ensureProjectFields } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureProjectFields();
    const { id: sessionId } = await params;

    // 1. Get session details
    const sessionRows = await query<{ name: string }>(
      "SELECT name FROM Session WHERE id = ?",
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. Get all projects
    const projects = await query<{
      id: string;
      name: string;
      description: string | null;
      icon?: string | null;
      priority?: string | null;
      bu?: string | null;
      owner?: string | null;
      timeline?: string | null;
    }>(
      "SELECT id, name, description, icon, priority, bu, owner, timeline FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 3. Get all final placements
    const finals = await query<{ projectId: string; horizon: number; status: string }>(
      "SELECT projectId, horizon, status FROM FinalPlacement WHERE sessionId = ?",
      [sessionId]
    );

    // Map into the format matching the import template
    const items = projects.map(p => {
      const f = finals.find(fp => fp.projectId === p.id);
      return {
        title: p.name,
        description: p.description,
        icon: p.icon,
        priority: p.priority,
        bu: p.bu,
        owner: p.owner,
        timeline: p.timeline,
        horizon: f ? f.horizon : null,
        status: f ? f.status : null,
      };
    });

    return NextResponse.json({
      sessionName: sessionRows[0].name,
      items
    });
  } catch (error: unknown) {
    console.error("GET /api/sessions/export error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
