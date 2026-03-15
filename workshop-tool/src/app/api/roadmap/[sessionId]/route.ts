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
    const groupRows = await query(
      "SELECT COUNT(*) as total FROM \`Group\` WHERE sessionId = ?",
      [sessionId]
    );
    const totalGroups = groupRows[0].total;

    // 2. Get all projects in this session
    const projects = await query(
      "SELECT * FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 3. Get all placements for this session with group names
    const placements = await query(`
      SELECT p.*, g.name as groupName
      FROM Placement p
      JOIN \`Group\` g ON p.groupId = g.id
      JOIN Project pr ON p.projectId = pr.id
      WHERE pr.sessionId = ?
    `, [sessionId]);

    // 4. Compute majority for each project
    const roadmap = projects.map((project: any) => {
      const projectPlacements = placements.filter(
        (p: any) => p.projectId === project.id
      );

      // Group placements by (horizon, status)
      const counts: Record<string, { horizon: number; status: string; groups: string[] }> = {};
      
      projectPlacements.forEach((p: any) => {
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
  } catch (error: any) {
    console.error("GET /api/roadmap error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
