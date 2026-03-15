export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // 1. Get total group count for this session
    const groupRows = await query<{ total: number }>(
      "SELECT COUNT(*) as total FROM \`Group\` WHERE sessionId = ?",
      [sessionId]
    );
    const totalGroups = groupRows[0]?.total || 0;

    // 2. Get all projects in this session
    const projects = await query<{ id: string; name: string }>(
      "SELECT * FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 3. Get all placements for this session with group names
    const placements = await query<{ 
      projectId: string; 
      groupName: string; 
      horizon: number | null; 
      status: string | null 
    }>(`
      SELECT p.*, g.name as groupName
      FROM Placement p
      JOIN \`Group\` g ON p.groupId = g.id
      JOIN Project pr ON p.projectId = pr.id
      WHERE pr.sessionId = ?
    `, [sessionId]);

    // 4. Compute majority for each project
    const roadmap = projects.map((project: { id: string; name: string }) => {
      const projectPlacements = placements.filter(
        (p: { projectId: string }) => p.projectId === project.id
      );

      // Group placements by (horizon, status)
      const counts: Record<string, { horizon: number; status: string; groups: string[] }> = {};
      
      projectPlacements.forEach((p: { horizon: number | null; status: string | null; groupName: string }) => {
        if (p.horizon === null || p.status === null) return;
        const key = `${p.horizon}-${p.status}`;
        if (!counts[key]) {
          counts[key] = { horizon: p.horizon, status: p.status, groups: [] };
        }
        counts[key].groups.push(p.groupName);
      });

      // Find if any cell has > 50% agreement
      let majorityCell = null;
      for (const key in counts) {
        if (counts[key].groups.length > totalGroups / 2) {
          majorityCell = counts[key];
          break;
        }
      }

      return {
        ...project,
        horizon: majorityCell ? majorityCell.horizon : null,
        status: majorityCell ? majorityCell.status : null,
        agreedGroups: majorityCell ? majorityCell.groups : [],
      };
    });

    return NextResponse.json(roadmap);
  } catch (error: unknown) {
    console.error("GET /api/roadmap error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
