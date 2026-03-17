// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask, addComment } from "@/lib/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body    = await req.json();
  const updated = updateTask(params.id, body);
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = deleteTask(params.id);
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// POST /api/tasks/:id/comment  — add comment + optional status change
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { author, text, status } = await req.json();
  if (!author) return NextResponse.json({ error: "author required" }, { status: 400 });
  if (!text)   return NextResponse.json({ error: "text required" },   { status: 400 });

  const updated = addComment(params.id, author, text, status ?? undefined);
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(updated);
}