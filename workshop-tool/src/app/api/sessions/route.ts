export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const sessions = await query<{
      id: string;
      name: string;
      active: number | boolean;
      createdAt: Date;
      projectCount: number;
      groupCount: number;
    }>(`
      SELECT s.*, 
             (SELECT COUNT(*) FROM Project p WHERE p.sessionId = s.id) as projectCount,
             (SELECT COUNT(*) FROM \`Group\` g WHERE g.sessionId = s.id) as groupCount
      FROM Session s
      ORDER BY s.createdAt DESC
    `);
    
    // Map to match the expected structure
    const mappedSessions = sessions.map((s: { 
      id: string; 
      name: string; 
      active: number | boolean; 
      createdAt: Date; 
      projectCount: number; 
      groupCount: number 
    }) => ({
      ...s,
      _count: {
        projects: s.projectCount,
        groups: s.groupCount
      }
    }));

    return NextResponse.json(mappedSessions);
  } catch (error: unknown) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const id = uuidv4();
    await query(
      "INSERT INTO Session (id, name, active, createdAt) VALUES (?, ?, ?, ?)",
      [id, name, true, new Date()]
    );
    
    const [session] = await query<Record<string, unknown>>("SELECT * FROM Session WHERE id = ?", [id]);
    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/sessions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
