export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const projects = await query(
      "SELECT * FROM Project WHERE sessionId = ? ORDER BY createdAt ASC",
      [sessionId]
    );
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sessionId, name, description, createdBy } = await req.json();
    const id = uuidv4();
    
    await query(
      "INSERT INTO Project (id, sessionId, name, description, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [id, sessionId, name, description, createdBy || "admin", new Date()]
    );

    const [project] = await query("SELECT * FROM Project WHERE id = ?", [id]);
    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
