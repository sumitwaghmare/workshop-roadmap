export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, ensureProjectFields } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await ensureProjectFields();

    const { sessionId } = await params;
    
    // Parse query params
    const { searchParams } = new URL(_req.url);
    const yAxisEnabled = searchParams.get("yAxis") !== "false";

    // 1. Get session info
    const sessionRows = await query<{ active: boolean }>(
      "SELECT active FROM Session WHERE id = ?",
      [sessionId]
    );
    const sessionActive = sessionRows[0]?.active ?? false;

    // 2. Get total group count for this session
    const groupRows = await query<{ total: number }>(
      "SELECT COUNT(*) as total FROM `Group` WHERE sessionId = ?",
      [sessionId]
    );
    const totalGroups = groupRows[0]?.total || 0;

    // 3. Get all projects in this session
    const projects = await query<{
      id: string;
      name: string;
      description: string | null;
      icon?: string | null;
      priority?: string | null;
      bu?: string | null;
      owner?: string | null;
      timeline?: string | null;
      category?: string | null;
    }>(
      "SELECT id, name, description, icon, priority, bu, owner, timeline, category FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 4. Get all placements for this session with group names
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

    // 5. Get final placements
    const finalPlacements = await query<{ projectId: string; horizon: number | null; status: string | null }>(
      "SELECT projectId, horizon, status FROM FinalPlacement WHERE sessionId = ?",
      [sessionId]
    );

    // 6. Compute roadmap for each project
    const roadmap = projects.map((project) => {
      const projectPlacements = placements.filter(
        (p) => p.projectId === project.id
      );

      const final = finalPlacements.find((f) => f.projectId === project.id);

      // Group placements by (horizon, status) for "bubble" info
      // Group placements by (horizon, status) for "bubble" info
      const counts: Record<string, { horizon: number; status: string | null; groups: string[] }> = {};
      
      projectPlacements.forEach((p) => {
        if (p.horizon === null) return;
        
        // If Y-axis is enabled, we need both horizon and status to count a vote
        if (yAxisEnabled && p.status === null) return;

        // If Y-axis is disabled, we group only by horizon, ignoring status
        const cellStatus = yAxisEnabled ? p.status : null;
        const key = `${p.horizon}-${cellStatus}`;
        
        if (!counts[key]) {
          counts[key] = { horizon: p.horizon, status: cellStatus, groups: [] };
        }
        counts[key].groups.push(p.groupName);
      });

      // Find majority cell (>= 50%)
      let majorityCell: { horizon: number; status: string | null; groups: string[] } | null = null;
      for (const key in counts) {
        if (counts[key].groups.length >= totalGroups / 2) {
          majorityCell = counts[key];
          break;
        }
      }

      // DETERMINISTIC LOGIC:
      // If session is ACTIVE: Only use majority consensus (Consolidated Roadmap).
      // If session is LOCKED: Use manual override (Final Roadmap), fallback to majority.
      let horizon: number | null = null;
      let status: string | null = null;
      const hasMajority = !!majorityCell;

      if (sessionActive) {
        // Active session: consolidated view from live group votes
        horizon = majorityCell ? majorityCell.horizon : null;
        status = majorityCell ? majorityCell.status : null;
      } else {
        // Locked session: respect manual admin overrides
        horizon = final && final.horizon !== null ? final.horizon : (majorityCell ? majorityCell.horizon : null);
        
        if (yAxisEnabled) {
          status = final && final.status !== null ? final.status : (majorityCell ? majorityCell.status : null);
        } else {
          status = null;
        }
      }
      
      // Which groups recommended THIS specific cell?
      let agreedGroups: string[] = [];
      
      if (horizon !== null) {
        if (!yAxisEnabled) {
          // If Y-axis is disabled, we prioritize groups that placed this project in this horizon.
          agreedGroups = projectPlacements
            .filter(p => p.horizon === horizon)
            .map(p => p.groupName);
            
          // If no one voted for this horizon (pure manual placement), fallback to all voters
          if (agreedGroups.length === 0) {
            agreedGroups = projectPlacements.map(p => p.groupName);
          }
        } else if (status !== null) {
          // Y-axis is enabled, check the specific cell counts
          agreedGroups = counts[`${horizon}-${status}`]?.groups || [];
          
          if (agreedGroups.length === 0) {
            // Fallback for manual final placements that weren't the majority:
            // If they didn't vote for this specific cell, at least show everyone who voted for the project
            // so the admin doesn't lose context of who wanted it.
            agreedGroups = projectPlacements.map(p => p.groupName);
          }
        }
      }

      // If project is in Inbox (no horizon, or no status when yAxis is enabled), show all groups that voted for it
      if (horizon === null || (yAxisEnabled && status === null)) {
        agreedGroups = projectPlacements.map(p => p.groupName);
      }

      // Ensure groups are unique, especially on raw placement mapping
      agreedGroups = [...new Set(agreedGroups)];

      return {
        ...project,
        horizon,
        status,
        agreedGroups,
        isFinal: !!final && !sessionActive,
        hasMajority
      };
    });

    return NextResponse.json(roadmap);
  } catch (error: unknown) {
    console.error("GET /api/roadmap error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
