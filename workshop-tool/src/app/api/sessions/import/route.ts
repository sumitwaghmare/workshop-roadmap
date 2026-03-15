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
    const { items, sessionName } = await req.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items data" }, { status: 400 });
    }

    // 1. Create a new session
    const sessionId = uuidv4();
    const actualSessionName = sessionName || `Imported Session - ${new Date().toLocaleString()}`;
    await query(
      "INSERT INTO Session (id, name, active) VALUES (?, ?, ?)",
      [sessionId, actualSessionName, false] // Imported sessions start as inactive (editable)
    );

    // 2. Iterate and create projects/placements
    for (const item of items) {
      const projectId = uuidv4();
      const { title, description, horizon, status } = item;

      // Create Project
      await query(
        "INSERT INTO Project (id, sessionId, name, description) VALUES (?, ?, ?, ?)",
        [projectId, sessionId, title || "Untitled Project", description || null]
      );

      // Create Final Placement if data exists
      if (status && horizon !== undefined && horizon !== null) {
        await query(
          "INSERT INTO FinalPlacement (id, sessionId, projectId, horizon, status) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), sessionId, projectId, horizon, status]
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      sessionId, 
      projectCount: items.length 
    });
  } catch (error: unknown) {
    console.error("POST /api/sessions/import error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
