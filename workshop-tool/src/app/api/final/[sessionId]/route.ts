export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const finals = await query(`
      SELECT fp.*, p.name as projectName, p.description as projectDescription
      FROM FinalPlacement fp
      JOIN Project p ON fp.projectId = p.id
      WHERE fp.sessionId = ?
    `, [sessionId]);
    
    // To match frontend expectations where 'project' is an object
    const mappedFinals = finals.map((fp: { 
      projectName: string; 
      projectDescription: string;
      [key: string]: unknown 
    }) => ({
      ...fp,
      project: {
        name: fp.projectName,
        description: fp.projectDescription
      }
    }));

    return NextResponse.json(mappedFinals);
  } catch (error: unknown) {
    console.error("GET /api/final error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const { placements } = await req.json();

    if (!Array.isArray(placements)) {
      return NextResponse.json({ error: "Invalid placements data" }, { status: 400 });
    }

    // Upsert each final placement
    for (const p of placements) {
      const { projectId, horizon, status } = p;
      await query(`
        INSERT INTO FinalPlacement (id, sessionId, projectId, horizon, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          horizon = VALUES(horizon),
          status = VALUES(status)
      `, [uuidv4(), sessionId, projectId, horizon, status]);
    }

    return NextResponse.json({ success: true, count: placements.length });
  } catch (error: unknown) {
    console.error("PUT /api/final error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
