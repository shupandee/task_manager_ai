// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loadData, createTask } from "@/lib/store";

// GET /api/tasks?viewer=Alice&role=assigned_to
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewer = searchParams.get("viewer");
  const role   = searchParams.get("role") ?? "all";

  const data = loadData();
  let tasks = data.tasks;

  if (viewer) {
    const vl = viewer.toLowerCase();
    if (role === "assigned_to") {
      tasks = tasks.filter((t) => t.assigned_to.toLowerCase() === vl);
    } else if (role === "assigned_by") {
      tasks = tasks.filter((t) => t.assigned_by.toLowerCase() === vl);
    } else {
      tasks = tasks.filter(
        (t) =>
          t.assigned_to.toLowerCase() === vl ||
          t.assigned_by.toLowerCase() === vl
      );
    }
  }

  return NextResponse.json(tasks);
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.title)       return NextResponse.json({ error: "title required" },       { status: 400 });
  if (!body.assigned_to) return NextResponse.json({ error: "assigned_to required" }, { status: 400 });
  if (!body.assigned_by) return NextResponse.json({ error: "assigned_by required" }, { status: 400 });

  const task = createTask({
    title:       body.title,
    description: body.description ?? "",
    assigned_to: body.assigned_to,
    assigned_by: body.assigned_by,
    status:      body.status   ?? "todo",
    priority:    body.priority ?? "medium",
    due_date:    body.due_date ?? "",
    tags:        body.tags     ?? [],
  });

  return NextResponse.json(task, { status: 201 });
}
