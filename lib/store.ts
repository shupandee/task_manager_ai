// lib/store.ts
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_FILE = path.join(process.cwd(), "tasks_data.json");

export interface Comment {
  id: string;
  author: string;
  text: string;
  status_changed_to?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string;
  created_at: string;
  tags: string[];
  comments: Comment[];
}

interface Store {
  tasks: Task[];
}

const SEED: Store = {
  tasks: [
    {
      id: uuidv4(),
      title: "Design new landing page",
      description: "Create wireframes and mockups for the marketing landing page",
      assigned_to: "Bob Smith",
      assigned_by: "Alice Johnson",
      status: "in_progress",
      priority: "high",
      due_date: "2026-03-15",
      created_at: "2026-03-01T10:00:00",
      tags: ["design", "marketing"],
      comments: [],
    },
    {
      id: uuidv4(),
      title: "Fix login bug",
      description: "Users report intermittent login failures on mobile",
      assigned_to: "Carol White",
      assigned_by: "Alice Johnson",
      status: "todo",
      priority: "urgent",
      due_date: "2026-03-12",
      created_at: "2026-03-05T09:00:00",
      tags: ["bug", "auth"],
      comments: [],
    },
    {
      id: uuidv4(),
      title: "Write Q1 report",
      description: "Compile metrics for Q1 board presentation",
      assigned_to: "Alice Johnson",
      assigned_by: "David Lee",
      status: "todo",
      priority: "medium",
      due_date: "2026-03-20",
      created_at: "2026-03-03T14:00:00",
      tags: ["report", "quarterly"],
      comments: [],
    },
    {
      id: uuidv4(),
      title: "Database optimisation",
      description: "Optimise slow queries in production",
      assigned_to: "Alice Johnson",
      assigned_by: "Bob Smith",
      status: "in_progress",
      priority: "high",
      due_date: "2026-03-18",
      created_at: "2026-03-04T11:00:00",
      tags: ["backend", "performance"],
      comments: [],
    },
    {
      id: uuidv4(),
      title: "Team onboarding docs",
      description: "Update onboarding documentation for new members",
      assigned_to: "David Lee",
      assigned_by: "Alice Johnson",
      status: "done",
      priority: "low",
      due_date: "2026-03-10",
      created_at: "2026-02-28T08:00:00",
      tags: ["docs", "hr"],
      comments: [],
    },
  ],
};

export function loadData(): Store {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Store;
      // migrate old tasks that don't have comments array
      raw.tasks = raw.tasks.map((t) => ({ ...t, comments: [] }));
      return raw;
    } catch {
      // fall through to seed
    }
  }
  saveData(SEED);
  return SEED;
}

export function saveData(data: Store): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function allNames(tasks: Task[]): string[] {
  const names = new Set<string>();
  tasks.forEach((t) => {
    if (t.assigned_to) names.add(t.assigned_to);
    if (t.assigned_by) names.add(t.assigned_by);
  });
  return Array.from(names).sort();
}

export function createTask(payload: Omit<Task, "id" | "created_at" | "comments">): Task {
  const data = loadData();
  const task: Task = {
    ...payload,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    comments: [],
  };
  data.tasks.push(task);
  saveData(data);
  return task;
}

export function updateTask(id: string, patch: Partial<Task>): Task | null {
  const data = loadData();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<Task>;
  data.tasks[idx] = { ...data.tasks[idx], ...clean };
  saveData(data);
  return data.tasks[idx];
}

export function deleteTask(id: string): boolean {
  const data = loadData();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t.id !== id);
  if (data.tasks.length === before) return false;
  saveData(data);
  return true;
}

export function addComment(
  taskId: string,
  author: string,
  text: string,
  newStatus?: string
): Task | null {
  const data = loadData();
  const idx = data.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;

  const comment: Comment = {
    id: uuidv4(),
    author,
    text,
    created_at: new Date().toISOString(),
    ...(newStatus ? { status_changed_to: newStatus } : {}),
  };

  data.tasks[idx].comments = [...(data.tasks[idx].comments ?? []), comment];
  if (newStatus) {
    data.tasks[idx].status = newStatus as Task["status"];
  }

  saveData(data);
  return data.tasks[idx];
}