// lib/ai.ts
// Azure OpenAI agentic loop with tool/function-calling
// Mirrors the Python run_agent() in task_man.py

import OpenAI from "openai";
import { loadData, saveData, Task } from "./store";
import { v4 as uuidv4 } from "uuid";

// ── Azure client ─────────────────────────────────────────────────────────────

function getClient(): OpenAI {
  const apiKey   = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVer   = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

  if (!apiKey || !endpoint) {
    throw new Error(
      "Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT in .env.local"
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint.replace(/\/$/, "")}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"}`,
    defaultQuery: { "api-version": apiVer },
    defaultHeaders: { "api-key": apiKey },
  });
}

// ── Tool definitions (identical to TOOLS in Python backend) ──────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "Return tasks, optionally filtered by assigned_to, assigned_by, status, or priority. Pass null to skip a filter.",
      parameters: {
        type: "object",
        properties: {
          assigned_to: { type: ["string", "null"], description: "Filter by assignee name" },
          assigned_by: { type: ["string", "null"], description: "Filter by assigner name" },
          status:      { type: ["string", "null"], enum: ["todo", "in_progress", "done", null] },
          priority:    { type: ["string", "null"], enum: ["low", "medium", "high", "urgent", null] },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task and save it.",
      parameters: {
        type: "object",
        properties: {
          title:       { type: "string" },
          description: { type: "string" },
          assigned_to: { type: "string" },
          assigned_by: { type: "string" },
          status:      { type: "string", enum: ["todo", "in_progress", "done"] },
          priority:    { type: "string", enum: ["low", "medium", "high", "urgent"] },
          due_date:    { type: "string", description: "YYYY-MM-DD" },
          tags:        { type: "array", items: { type: "string" } },
        },
        required: ["title", "assigned_to", "assigned_by"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update one or more fields on an existing task by its ID.",
      parameters: {
        type: "object",
        properties: {
          task_id:     { type: "string" },
          title:       { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          assigned_to: { type: ["string", "null"] },
          assigned_by: { type: ["string", "null"] },
          status:      { type: ["string", "null"] },
          priority:    { type: ["string", "null"] },
          due_date:    { type: ["string", "null"] },
          tags:        { type: ["array", "null"], items: { type: "string" } },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by its ID.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_summary",
      description:
        "Return a summary of task counts grouped by status and priority, and a list of overdue tasks. Optionally scoped to one person.",
      parameters: {
        type: "object",
        properties: {
          person: { type: ["string", "null"], description: "Scope to this person (assigned_to OR assigned_by)" },
        },
        required: [],
      },
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runTool(name: string, args: Record<string, any>): string {
  const data  = loadData();
  let tasks   = data.tasks;
  const today = new Date().toISOString().split("T")[0];

  if (name === "list_tasks") {
    let result = tasks;
    if (args.assigned_to) result = result.filter((t) => t.assigned_to.toLowerCase() === args.assigned_to.toLowerCase());
    if (args.assigned_by) result = result.filter((t) => t.assigned_by.toLowerCase() === args.assigned_by.toLowerCase());
    if (args.status)      result = result.filter((t) => t.status   === args.status);
    if (args.priority)    result = result.filter((t) => t.priority === args.priority);
    return JSON.stringify(result);
  }

  if (name === "create_task") {
    const newTask: Task = {
      id:          uuidv4(),
      title:       args.title       ?? "",
      description: args.description ?? "",
      assigned_to: args.assigned_to ?? "",
      assigned_by: args.assigned_by ?? "",
      status:      args.status      ?? "todo",
      priority:    args.priority    ?? "medium",
      due_date:    args.due_date    ?? "",
      created_at:  new Date().toISOString(),
      tags:        args.tags        ?? [],
    };
    data.tasks.push(newTask);
    saveData(data);
    return JSON.stringify({ success: true, task: newTask });
  }

  if (name === "update_task") {
    const { task_id, ...rest } = args;
    const idx = data.tasks.findIndex((t) => t.id === task_id);
    if (idx === -1) return JSON.stringify({ error: `Task ${task_id} not found` });
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
    data.tasks[idx] = { ...data.tasks[idx], ...patch };
    saveData(data);
    return JSON.stringify({ success: true, task: data.tasks[idx] });
  }

  if (name === "delete_task") {
    const before = data.tasks.length;
    data.tasks = data.tasks.filter((t) => t.id !== args.task_id);
    if (data.tasks.length === before) return JSON.stringify({ error: `Task ${args.task_id} not found` });
    saveData(data);
    return JSON.stringify({ success: true });
  }

  if (name === "get_summary") {
    const person = args.person as string | null;
    const scope  = person
      ? tasks.filter((t) =>
          t.assigned_to.toLowerCase() === person.toLowerCase() ||
          t.assigned_by.toLowerCase() === person.toLowerCase()
        )
      : tasks;

    const byStatus:   Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const overdue: { id: string; title: string; due_date: string }[] = [];

    scope.forEach((t) => {
      byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      if (t.due_date && t.due_date < today && t.status !== "done") {
        overdue.push({ id: t.id, title: t.title, due_date: t.due_date });
      }
    });
    return JSON.stringify({ by_status: byStatus, by_priority: byPriority, overdue });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ── Agentic loop ───────────────────────────────────────────────────────────────

export async function runAgent(query: string, viewer: string | null): Promise<string> {
  const client     = getClient();
  const today      = new Date().toISOString().split("T")[0];
  const viewerLabel = viewer ?? "all users";

  const systemPrompt = `You are TaskFlow AI, a helpful task-management assistant.
Today is ${today}. Current viewer: ${viewerLabel}.

You have access to tools to list, create, update, delete tasks and get summaries.
Always use the tools to fetch live data before answering questions about tasks.
Be concise. Format task lists as markdown bullets:
  • **Title** · status · priority · due: YYYY-MM-DD · assigned_to → assigned_by
`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system",  content: systemPrompt },
    { role: "user",    content: query },
  ];

  for (let i = 0; i < 10; i++) {
    const response = await client.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o",
      messages,
      tools:       TOOLS,
      tool_choice: "auto",
    });

    const msg = response.choices[0].message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? "";
    }

    // Append assistant turn
    messages.push(msg);

    // Execute tools and feed results back
    for (const tc of msg.tool_calls) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = runTool(fnName, fnArgs as Record<string, any>);
      messages.push({
        role:         "tool",
        tool_call_id: tc.id,
        content:      result,
      });
    }
  }

  return "Agent reached maximum iterations without a final answer.";
}
