export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, ensureProjectFields } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureProjectFields();
    const { id } = await params;
    const { name, description, icon, priority, bu, owner, timeline, category, pinnedHorizon, pinnedStatus } = await req.json();

    // Dynamically build the update query because pinnedHorizon might be correctly passed as null.
    // However, keeping with the original pattern:
    await query(
      "UPDATE Project SET name = ?, description = ?, icon = ?, priority = ?, bu = ?, owner = ?, timeline = ?, category = ?, pinnedHorizon = ?, pinnedStatus = ? WHERE id = ?",
      [name, description, icon || null, priority || null, bu || null, owner || null, timeline || null, category || null, pinnedHorizon !== undefined ? pinnedHorizon : null, pinnedStatus || null, id]
    );

    const [project] = await query<Record<string, unknown>>("SELECT * FROM Project WHERE id = ?", [id]);
    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await query("DELETE FROM Project WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
