export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const groupId = searchParams.get("groupId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    let sql = `
      SELECT p.* 
      FROM Placement p
      JOIN Project pr ON p.projectId = pr.id
      WHERE pr.sessionId = ?
    `;
    const params = [sessionId];

    if (groupId) {
      sql += " AND p.groupId = ?";
      params.push(groupId);
    }

    const placements = await query<Record<string, unknown>>(sql, params);
    return NextResponse.json(placements);
  } catch (error: unknown) {
    console.error("GET /api/placements error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { placements } = await req.json();

    if (!Array.isArray(placements)) {
      return NextResponse.json({ error: "Invalid placements data" }, { status: 400 });
    }

    // Process each placement
    for (const p of placements as { projectId: string; groupId: string; horizon: number | null; status: string | null }[]) {
      const { projectId, groupId, horizon, status } = p;
      
      // MySQL UPSERT using ON DUPLICATE KEY UPDATE
      await query(`
        INSERT INTO Placement (id, projectId, groupId, horizon, status, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          horizon = VALUES(horizon),
          status = VALUES(status),
          updatedAt = VALUES(updatedAt)
      `, [uuidv4(), projectId, groupId, horizon, status, new Date()]);
    }

    return NextResponse.json({ success: true, count: placements.length });
  } catch (error: unknown) {
    console.error("PUT /api/placements error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
