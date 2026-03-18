export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // 1. Get group and its session details
    const groupRows = await query<{ 
      groupId: string; groupName: string; token: string;
      sessionId: string; sessionName: string; sessionActive: number | boolean;
    }>(`
      SELECT 
        g.id as groupId, g.name as groupName, g.token,
        s.id as sessionId, s.name as sessionName, s.active as sessionActive
      FROM \`Group\` g
      JOIN Session s ON g.sessionId = s.id
      WHERE g.token = ?
    `, [token]);
    
    if (groupRows.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const first = groupRows[0];
    const sessionId = first.sessionId;
    const groupId = first.groupId;

    // 2. Fetch all projects for this session (including optional icon metadata)
    const projects = await query<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      priority: string | null;
      category: string | null;
    }>(
      "SELECT id, name, description, icon, priority, category FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 3. Fetch placements for THIS specific group
    const placements = await query<{ id: string; projectId: string; groupId: string; horizon: number | null; status: string | null }>(
      "SELECT id, projectId, groupId, horizon, status FROM Placement WHERE groupId = ?",
      [groupId]
    );

    return NextResponse.json({
      group: { id: first.groupId, name: first.groupName, token: first.token },
      session: { id: first.sessionId, name: first.sessionName, active: Boolean(first.sessionActive) },
      projects,
      placements
    });
  } catch (error: unknown) {
    console.error("GET /api/groups/by-token error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
