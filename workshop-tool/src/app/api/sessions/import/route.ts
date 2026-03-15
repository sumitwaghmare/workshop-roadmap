export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, sessionName, sessionId: existingSessionId } = await req.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items data" }, { status: 400 });
    }

    // 1. Determine local sessionId
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      const actualSessionName = sessionName || `Imported Session - ${new Date().toLocaleString()}`;
      await query(
        "INSERT INTO Session (id, name, active) VALUES (?, ?, ?)",
        [sessionId, actualSessionName, false]
      );
    }

    const summary = {
      projectsAdded: 0,
      projectsUpdated: 0,
      placementsUpdated: 0,
    };

    // 2. Iterate and upsert projects/placements
    for (const item of items) {
      const { title, description, horizon, status } = item;
      if (!title) continue;

      // Check if project exists by name in this session
      const existingProjects = await query<{ id: string }>(
        "SELECT id FROM Project WHERE sessionId = ? AND name = ?",
        [sessionId, title]
      );

      let projectId: string;
      if (existingProjects.length > 0) {
        projectId = existingProjects[0].id;
        await query(
          "UPDATE Project SET description = ? WHERE id = ?",
          [description || null, projectId]
        );
        summary.projectsUpdated++;
      } else {
        projectId = uuidv4();
        await query(
          "INSERT INTO Project (id, sessionId, name, description) VALUES (?, ?, ?, ?)",
          [projectId, sessionId, title, description || null]
        );
        summary.projectsAdded++;
      }

      // Upsert Final Placement if data exists
      if (status && horizon !== undefined && horizon !== null) {
        await query(`
          INSERT INTO FinalPlacement (id, sessionId, projectId, horizon, status)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            horizon = VALUES(horizon),
            status = VALUES(status)
        `, [uuidv4(), sessionId, projectId, horizon, status]);
        summary.placementsUpdated++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sessionId, 
      summary
    });
  } catch (error: unknown) {
    console.error("POST /api/sessions/import error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
