export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Joint query to get group and its session status
    const rows = await query<Record<string, unknown>>(`
      SELECT g.*, s.active as sessionActive
      FROM \`Group\` g
      JOIN Session s ON g.sessionId = s.id
      WHERE g.token = ?
    `, [token]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = rows[0];
    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error("GET /api/groups/by-token error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
