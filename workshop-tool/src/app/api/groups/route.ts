export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const groups = await query<Record<string, unknown>>(
      "SELECT * FROM \`Group\` WHERE sessionId = ? ORDER BY name ASC",
      [sessionId]
    );
    return NextResponse.json(groups);
  } catch (error: unknown) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, name } = await req.json();
    const id = uuidv4();
    const token = uuidv4(); // Unique token for group link
    
    await query(
      "INSERT INTO \`Group\` (id, sessionId, name, token) VALUES (?, ?, ?, ?)",
      [id, sessionId, name, token]
    );

    const [group] = await query<Record<string, unknown>>("SELECT * FROM \`Group\` WHERE id = ?", [id]);
    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
