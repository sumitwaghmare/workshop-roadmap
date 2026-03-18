export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, ensureProjectFields } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const projects = await query<Record<string, unknown>>(
      "SELECT id, sessionId, name, description, icon, priority, bu, owner, timeline, category, createdBy, createdAt FROM Project WHERE sessionId = ? ORDER BY createdAt ASC",
      [sessionId]
    );
    return NextResponse.json(projects);
  } catch (error: unknown) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureProjectFields();
    const { sessionId, name, description, icon, priority, bu, owner, timeline, category, createdBy } = await req.json();
    const id = uuidv4();
    
    await query(
      "INSERT INTO Project (id, sessionId, name, description, icon, priority, bu, owner, timeline, category, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        sessionId,
        name,
        description,
        icon || null,
        priority || null,
        bu || null,
        owner || null,
        timeline || null,
        category || null,
        createdBy || "admin",
        new Date(),
      ]
    );

    const [project] = await query<Record<string, unknown>>("SELECT * FROM Project WHERE id = ?", [id]);
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
