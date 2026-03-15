export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    // We need to delete associated data manually because we are using raw SQL 
    // and might not have CASCADE CONSTRAINTS set up in the DB.
    
    // 1. Delete placements
    await query("DELETE FROM Placement WHERE groupId IN (SELECT id FROM \`Group\` WHERE sessionId = ?)", [sessionId]);
    
    // 2. Delete groups
    await query("DELETE FROM \`Group\` WHERE sessionId = ?", [sessionId]);
    
    // 3. Delete final placements
    await query("DELETE FROM FinalPlacement WHERE sessionId = ?", [sessionId]);
    
    // 4. Delete projects
    await query("DELETE FROM Project WHERE sessionId = ?", [sessionId]);
    
    // 5. Delete the session itself
    await query("DELETE FROM Session WHERE id = ?", [sessionId]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/sessions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    
    if (typeof body.active !== "undefined") {
      await query("UPDATE Session SET active = ? WHERE id = ?", [body.active, sessionId]);
    }
    
    if (typeof body.name !== "undefined") {
      await query("UPDATE Session SET name = ? WHERE id = ?", [body.name, sessionId]);
    }

    const [updatedSession] = await query<Record<string, unknown>>("SELECT * FROM Session WHERE id = ?", [sessionId]);
    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Ensure active is returned as a boolean as frontend code expects
    const formattedSession = {
      ...updatedSession,
      active: !!updatedSession.active
    };

    return NextResponse.json(formattedSession);
  } catch (error: unknown) {
    console.error("PATCH /api/sessions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
