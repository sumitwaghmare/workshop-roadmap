export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Clean up associated placements
    await query("DELETE FROM Placement WHERE groupId = ?", [id]);

    // Delete the group
    await query("DELETE FROM \`Group\` WHERE id = ?", [id]);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
