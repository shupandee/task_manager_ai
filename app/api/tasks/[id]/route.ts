// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/store";

// PATCH /api/tasks/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body    = await req.json();
  const updated = updateTask(params.id, body);
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/tasks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = deleteTask(params.id);
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
