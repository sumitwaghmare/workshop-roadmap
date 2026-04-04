export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, ensureProjectFields } from "@/lib/db";
import { MAJORITY_THRESHOLD } from "@/lib/constants";

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
    const groupId = searchParams.get("groupId");

    interface Placement {
      projectId: string;
      groupId: string;
      groupName: string;
      horizon: number | null;
      status: string | null;
    }

    // 1. Get session info
    const sessionRows = await query<{ active: boolean }>(
      "SELECT active FROM Session WHERE id = ?",
      [sessionId]
    );
    const sessionActive = sessionRows[0]?.active ?? false;

    // 2. Get group details for this session (needed for pinned project consensus)
    const groups = await query<{ id: string; name: string }>(
      "SELECT id, name FROM `Group` WHERE sessionId = ?",
      [sessionId]
    );
    const totalGroups = groups.length;

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
      spocCtg?: string | null;
      spocBu?: string | null;
      pinnedHorizon?: number | null;
      pinnedStatus?: string | null;
      createdAt: string | null;
    }>(
      "SELECT id, name, description, icon, priority, bu, owner, timeline, category, spocCtg, spocBu, pinnedHorizon, pinnedStatus, createdAt FROM Project WHERE sessionId = ?",
      [sessionId]
    );

    // 4. Get all placements for this session with group names
    const placements = await query<Placement>(`
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
      const isPinned = project.pinnedHorizon !== null && project.pinnedStatus !== null;

      let projectPlacements = placements.filter((p) => p.projectId === project.id);

      // If the project is admin-pinned, treat it as pre-agreed placement in every group.
      if (isPinned) {
        projectPlacements = groups.map((g) => ({
          projectId: project.id,
          groupId: g.id,
          groupName: g.name,
          horizon: project.pinnedHorizon!,
          status: project.pinnedStatus!,
        }));
      }

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

      // Find majority cell based on "Max Horizon" rule:
      // 1. Check if total votes for the project (anywhere on roadmap) > threshold
      // 2. If yes, place in the furthest (max) horizon voted for.
      let majorityCell: { horizon: number; status: string | null; groups: string[] } | null = null;
      
      const validPlacements = projectPlacements.filter(p => p.horizon !== null && (!yAxisEnabled || p.status !== null));
      const totalValidVotes = validPlacements.length;

      if (totalValidVotes > totalGroups * MAJORITY_THRESHOLD) {
        // Calculate max horizon from all valid votes
        const horizons = validPlacements.map(p => p.horizon as number);
        const maxHorizon = Math.max(...horizons);
        
        // Find most frequent status among those who voted for the max horizon
        const maxHorizonVotes = validPlacements.filter(p => p.horizon === maxHorizon);
        const statusCounts: Record<string, number> = {};
        maxHorizonVotes.forEach(p => {
          const s = p.status || "UNKNOWN";
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        
        let bestStatus: string | null = null;
        let maxStatusCount = -1;
        for (const s in statusCounts) {
          if (statusCounts[s] > maxStatusCount) {
            maxStatusCount = statusCounts[s];
            bestStatus = s === "UNKNOWN" ? null : s;
          }
        }

        majorityCell = { 
          horizon: maxHorizon, 
          status: bestStatus, 
          groups: [...new Set(validPlacements.map(p => p.groupName))] 
        };
      }

      // GROUP FILTER LOGIC (NEW)
      let groupSpecificPlacement: Placement | null = null;
      if (groupId) {
        groupSpecificPlacement = placements.find(p => p.projectId === project.id && p.groupId === groupId) || null;
      }

      // DETERMINISTIC LOGIC:
      // If groupId is provided: Show EXACTLY what that group chose (or pinned fallback).
      // Else if session is ACTIVE: Only use majority consensus (Consolidated Roadmap).
      // Else if session is LOCKED: Use manual override (Final Roadmap), fallback to majority.
      let horizon: number | null = null;
      let status: string | null = null;
      const hasMajority = !!majorityCell;

      if (groupId && !groupSpecificPlacement && isPinned) {
        // If pinned projects have no explicit per-group placement record, still show pin
        groupSpecificPlacement = {
          projectId: project.id,
          groupId,
          groupName: groups.find((g) => g.id === groupId)?.name || "",
          horizon: project.pinnedHorizon,
          status: project.pinnedStatus,
        } as unknown as typeof placements[number];
      }

      if (groupId) {
        // Group-specific view
        horizon = groupSpecificPlacement ? groupSpecificPlacement.horizon : null;
        status = groupSpecificPlacement ? (yAxisEnabled ? groupSpecificPlacement.status : null) : null;
      } else if (sessionActive) {
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
        if (groupId) {
          agreedGroups = groupSpecificPlacement ? [groupSpecificPlacement.groupName] : [];
        } else {
          agreedGroups = projectPlacements.map((p) => p.groupName);
        }
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
