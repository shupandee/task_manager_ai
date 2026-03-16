"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────── Types ────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string;
  created_at: string;
  tags: string[];
}

interface AiMessage {
  role: "user" | "bot";
  content: string;
  loading?: boolean;
}

// ─────────────────────────── Utils ────────────────────────────────────────────
const PILL_COLORS = [
  { bg: "rgba(124,92,252,.2)", dot: "#7c5cfc" },
  { bg: "rgba(232,86,122,.2)", dot: "#e8567a" },
  { bg: "rgba(245,159,0,.2)",  dot: "#f59f00" },
  { bg: "rgba(56,217,169,.2)", dot: "#38d9a9" },
  { bg: "rgba(99,180,255,.2)", dot: "#63b4ff" },
  { bg: "rgba(255,136,80,.2)", dot: "#ff8850" },
];

const colorCache: Record<string, typeof PILL_COLORS[0]> = {};
let colorIdx = 0;
function nameColor(name: string) {
  const k = (name || "").trim().toLowerCase();
  if (!colorCache[k]) colorCache[k] = PILL_COLORS[colorIdx++ % PILL_COLORS.length];
  return colorCache[k];
}

function stLabel(s: string) {
  return { todo: "To Do", in_progress: "In Progress", done: "Done" }[s] ?? s;
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function NamePill({ name, label }: { name: string; label?: string }) {
  const col = nameColor(name);
  return (
    <span className="name-pill" style={{ background: col.bg }}>
      <span className="name-dot" style={{ background: col.dot }} />
      {label ? `${label}: ${name}` : name}
    </span>
  );
}

// ─────────────────────────── List View ────────────────────────────────────────
function ListView({
  tasks, onEdit, onDelete, onToggle, statusFilter, priorityFilter,
  setStatusFilter, setPriorityFilter,
}: {
  tasks: Task[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, status: Task["status"]) => void;
  statusFilter: string;
  priorityFilter: string;
  setStatusFilter: (s: string) => void;
  setPriorityFilter: (p: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const overCnt = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card s1"><div className="stat-num">{tasks.length}</div><div className="stat-label">Total Tasks</div></div>
        <div className="stat-card s2"><div className="stat-num">{tasks.filter((t) => t.status === "in_progress").length}</div><div className="stat-label">In Progress</div></div>
        <div className="stat-card s3"><div className="stat-num">{overCnt}</div><div className="stat-label">Overdue</div></div>
        <div className="stat-card s4"><div className="stat-num">{tasks.filter((t) => t.status === "done").length}</div><div className="stat-label">Completed</div></div>
      </div>

      <div className="filter-bar">
        {(["all","todo","in_progress","done"] as const).map((s) => (
          <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : stLabel(s)}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        <button className={`filter-btn ${priorityFilter === "urgent" ? "active" : ""}`} style={{ color: "var(--urgent)" }} onClick={() => setPriorityFilter("urgent")}>Urgent</button>
        <button className={`filter-btn ${priorityFilter === "high" ? "active" : ""}`}   style={{ color: "var(--high)"   }} onClick={() => setPriorityFilter("high")}>High</button>
        <button className={`filter-btn ${priorityFilter === "all" ? "active" : ""}`}    onClick={() => setPriorityFilter("all")}>All Priorities</button>
      </div>

      <div className="tasks-grid">
        {tasks.length === 0 && (
          <div className="empty-state"><div className="empty-icon">📋</div><p>No tasks found</p></div>
        )}
        {tasks.map((t) => {
          const ov = t.due_date && t.due_date < today && t.status !== "done";
          return (
            <div key={t.id} className={`task-card priority-${t.priority}`} onClick={() => onEdit(t.id)}>
              <button className={`chk ${t.status === "done" ? "done" : ""}`}
                onClick={(e) => { e.stopPropagation(); onToggle(t.id, t.status); }}>
                {t.status === "done" ? "✓" : ""}
              </button>
              <div className="task-body">
                <div className="task-title" style={t.status === "done" ? { textDecoration: "line-through", color: "var(--text3)" } : {}}>
                  {t.title}
                </div>
                {t.description && <div className="task-desc">{t.description}</div>}
                <div className="task-meta">
                  <span className={`tag tag-status-${t.status}`}>{stLabel(t.status)}</span>
                  <span className={`tag tag-priority-${t.priority}`}>{t.priority}</span>
                  <NamePill name={t.assigned_to} label="→" />
                  <NamePill name={t.assigned_by} label="by" />
                  {t.due_date && (
                    <span className={`task-date ${ov ? "overdue" : ""}`}>
                      {ov ? "⚠ " : ""}{fmtDate(t.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(t.id)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(t.id)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────── Kanban View ──────────────────────────────────────
function KanbanView({ tasks, onEdit }: { tasks: Task[]; onEdit: (id: string) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const cols = [
    { key: "todo" as const,        label: "To Do",       color: "var(--text3)" },
    { key: "in_progress" as const, label: "In Progress", color: "var(--inprog)" },
    { key: "done" as const,        label: "Done",        color: "var(--done)" },
  ];
  return (
    <div className="kanban-board">
      {cols.map((col) => {
        const ct = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="kanban-col">
            <div className="kanban-header" style={{ color: col.color }}>
              {col.label}<span className="kanban-count">{ct.length}</span>
            </div>
            <div className="kanban-tasks">
              {ct.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--text3)", fontSize: 12 }}>No tasks</div>}
              {ct.map((t) => {
                const ov = t.due_date && t.due_date < today && t.status !== "done";
                return (
                  <div key={t.id} className="kanban-card" onClick={() => onEdit(t.id)}>
                    <div className="kanban-card-title">{t.title}</div>
                    <div className="kanban-meta"><span className={`tag tag-priority-${t.priority}`}>{t.priority}</span></div>
                    <div className="kanban-names">→ {t.assigned_to || "—"}<br />by {t.assigned_by || "—"}</div>
                    {t.due_date && <div style={{ fontSize: 10, marginTop: 5, color: ov ? "var(--urgent)" : "var(--text3)" }}>Due {fmtDate(t.due_date)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Calendar View ────────────────────────────────────
function CalendarView({ allTasks, onEdit }: { allTasks: Task[]; onEdit: (id: string) => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear]   = useState(now.getFullYear());

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOWS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const todayStr = now.toISOString().split("T")[0];

  function nav(d: number) {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMonth(m); setYear(y);
  }

  // Build date → tasks map
  const tbd: Record<string, Task[]> = {};
  allTasks.forEach((t) => {
    if (t.due_date) {
      if (!tbd[t.due_date]) tbd[t.due_date] = [];
      tbd[t.due_date].push(t);
    }
  });

  // Build calendar cells
  const startDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  let day = 1 - startDay;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const date = new Date(year, month, day);
      cells.push({ date, inMonth: date.getMonth() === month });
      day++;
    }
    if (day > lastDate && row >= 4) break;
  }

  return (
    <div className="calendar-wrapper">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => nav(-1)}>‹</button>
        <div className="cal-title">{MONTHS[month]} {year}</div>
        <button className="cal-nav" onClick={() => nav(1)}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>Today</button>
      </div>
      <div className="cal-grid">
        {DOWS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map(({ date, inMonth }, i) => {
          const ds = date.toISOString().split("T")[0];
          const isToday = ds === todayStr;
          const dt = tbd[ds] ?? [];
          return (
            <div key={i} className={`cal-day ${!inMonth ? "other-month" : ""} ${isToday ? "today" : ""}`}>
              <div className="cal-day-num">{date.getDate()}</div>
              {dt.slice(0, 2).map((t) => {
                const bg  = t.priority === "urgent" ? "rgba(232,86,122,.25)" : t.priority === "high" ? "rgba(245,159,0,.2)" : "rgba(124,92,252,.2)";
                const col = t.priority === "urgent" ? "var(--urgent)" : t.priority === "high" ? "var(--high)" : "var(--accent)";
                return (
                  <div key={t.id} className="cal-task-dot" style={{ background: bg, color: col }}
                    onClick={() => onEdit(t.id)} title={t.assigned_to}>{t.title}</div>
                );
              })}
              {dt.length > 2 && <div className="cal-more">+{dt.length - 2} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────── AI View ──────────────────────────────────────────
function AIView({ viewerName }: { viewerName: string }) {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "bot", content: "Hi! I can answer questions about tasks, workloads, deadlines, assignees, and more. What would you like to know?" },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function send(q?: string) {
    const query = (q ?? input).trim();
    if (!query) return;
    setInput("");
    const newHistory = [...history, { role: "user" as const, content: query }];
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);
    try {
      const res  = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, viewer: viewerName || null, history }),
      });
      const data = await res.json();
      const reply = data.response ?? data.error ?? "No response";
      setHistory([...newHistory, { role: "assistant" as const, content: reply }]);
      setMessages((prev) => [...prev, { role: "bot", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", content: "Could not reach the AI endpoint." }]);
    }
    setLoading(false);
  }

  const CHIPS = ["Tasks due today","Show overdue tasks","High priority tasks","Summarize all tasks","Who has the most tasks?","Tasks due this week"];

  return (
    <div className="ai-panel" style={{ height: "calc(100vh - 108px)" }}>
      <div className="ai-chips">
        {CHIPS.map((c) => <div key={c} className="ai-chip" onClick={() => send(c)}>{c}</div>)}
      </div>
      <div className="ai-messages" ref={msgsRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role}`}>
            <div className={`ai-av ${m.role === "bot" ? "bot" : "usr"}`}>{m.role === "bot" ? "✦" : "✎"}</div>
            <div className="ai-bubble" dangerouslySetInnerHTML={{
              __html: m.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />"),
            }} />
          </div>
        ))}
        {loading && (
          <div className="ai-message bot">
            <div className="ai-av bot">✦</div>
            <div className="ai-bubble"><div className="loader"><span /><span /><span /></div></div>
          </div>
        )}
      </div>
      <div className="ai-input-area">
        <textarea className="ai-input" rows={2} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your tasks…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn btn-primary" onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}

// ─────────────────────────── Modal ────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  editing: Task | null;
  onClose: () => void;
  onSave: (payload: Partial<Task>, id?: string) => void;
  viewerName: string;
  knownNames: string[];
}

function TaskModal({ open, editing, onClose, onSave, viewerName, knownNames }: ModalProps) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [assignee, setAssignee] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [status, setStatus]     = useState<Task["status"]>("todo");
  const [dueDate, setDueDate]   = useState("");
  const [tags, setTags]         = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setDesc(editing.description);
        setAssignee(editing.assigned_to);
        setAssignedBy(editing.assigned_by);
        setPriority(editing.priority);
        setStatus(editing.status);
        setDueDate(editing.due_date);
        setTags((editing.tags ?? []).join(", "));
      } else {
        setTitle(""); setDesc(""); setAssignee(""); setDueDate(""); setTags("");
        setPriority("medium"); setStatus("todo");
        setAssignedBy(viewerName);
      }
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, editing, viewerName]);

  function handleSave() {
    if (!title.trim())      { alert("Task title is required"); return; }
    if (!assignee.trim())   { alert('"Assign To" name is required'); return; }
    if (!assignedBy.trim()) { alert('"Assigned By" name is required'); return; }
    onSave({
      title: title.trim(),
      description:  desc,
      assigned_to:  assignee.trim(),
      assigned_by:  assignedBy.trim(),
      due_date:     dueDate,
      priority,
      status,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
    }, editing?.id);
  }

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">{editing ? "Edit Task" : "Create New Task"}</div>

        <div className="form-group">
          <label className="form-label">Task Title *</label>
          <input ref={titleRef} className="form-input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?" onKeyDown={(e) => e.key === "Enter" && handleSave()} />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add more details…" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Assign To * <span>type any name</span></label>
            <input className="form-input" list="name-list" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. Sarah Connor" autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned By * <span>type any name</span></label>
            <input className="form-input" list="name-list" value={assignedBy} onChange={(e) => setAssignedBy(e.target.value)} placeholder="e.g. John Doe" autoComplete="off" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as Task["status"])}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags <span>comma separated</span></label>
            <input className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, bug, api…" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{editing ? "Save Changes" : "Create Task"}</button>
        </div>
      </div>
      <datalist id="name-list">
        {knownNames.map((n) => <option key={n} value={n} />)}
      </datalist>
    </div>
  );
}

// ─────────────────────────── Root App ─────────────────────────────────────────
export default function TaskFlowApp() {
  const [allTasks, setAllTasks]       = useState<Task[]>([]);
  const [knownNames, setKnownNames]   = useState<string[]>([]);
  const [viewerName, setViewerName]   = useState("");
  const [viewerInput, setViewerInput] = useState("");
  const [currentView, setCurrentView] = useState<"all" | "assigned-to" | "assigned-by">("all");
  const [currentLayout, setCurrentLayout] = useState<"list" | "kanban" | "calendar" | "ai">("list");
  const [searchQ, setSearchQ]         = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fetch tasks (with optional viewer + role filters)
  const loadTasks = useCallback(async (viewer = viewerName, view = currentView) => {
    const params = new URLSearchParams();
    if (viewer) {
      params.set("viewer", viewer);
      if (view === "assigned-to")  params.set("role", "assigned_to");
      if (view === "assigned-by")  params.set("role", "assigned_by");
    }
    const res   = await fetch(`/api/tasks?${params}`);
    const tasks = await res.json() as Task[];
    setAllTasks(tasks);

    // Also refresh known names from people endpoint
    const pRes   = await fetch("/api/people");
    const pData  = await pRes.json();
    const seen   = new Set<string>([...(pData.names ?? [])]);
    tasks.forEach((t) => { if (t.assigned_to) seen.add(t.assigned_to); if (t.assigned_by) seen.add(t.assigned_by); });
    setKnownNames([...seen].sort());
  }, [viewerName, currentView]);

  useEffect(() => { loadTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyViewer() {
    setViewerName(viewerInput.trim());
    loadTasks(viewerInput.trim(), currentView);
  }

  function handleSetView(view: typeof currentView) {
    setCurrentView(view);
    loadTasks(viewerName, view);
  }

  // Filtered tasks for views
  const filtered = allTasks.filter((t) => {
    const ms = !searchQ ||
      (t.title ?? "").toLowerCase().includes(searchQ) ||
      (t.description ?? "").toLowerCase().includes(searchQ) ||
      (t.assigned_to ?? "").toLowerCase().includes(searchQ) ||
      (t.assigned_by ?? "").toLowerCase().includes(searchQ);
    return ms &&
      (statusFilter === "all"   || t.status   === statusFilter) &&
      (priorityFilter === "all" || t.priority === priorityFilter);
  });

  async function handleSave(payload: Partial<Task>, id?: string) {
    if (id) {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setModalOpen(false);
    setEditingTask(null);
    await loadTasks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  }

  async function handleToggle(id: string, status: Task["status"]) {
    const ns = status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
    await loadTasks();
  }

  function openEdit(id: string) {
    const t = allTasks.find((x) => x.id === id);
    if (t) { setEditingTask(t); setModalOpen(true); }
  }

  // Badge counts
  const vl = viewerName.toLowerCase();
  const badgeTome = viewerName ? allTasks.filter((t) => t.assigned_to.toLowerCase() === vl).length : null;
  const badgeByme = viewerName ? allTasks.filter((t) => t.assigned_by.toLowerCase() === vl).length : null;

  const pageTitle = {
    all: "All Tasks",
    "assigned-to":  "Assigned to Me",
    "assigned-by":  "Assigned by Me",
    list:     "Task List",
    kanban:   "Kanban Board",
    calendar: "Calendar",
    ai:       "AI Assistant",
  }[currentLayout === "list" || currentLayout === "kanban" || currentLayout === "calendar" ? currentView : currentLayout] ?? "Tasks";

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">T</div>
          <span className="logo-text">TaskFlow</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Views</div>
          {([["all","☰","All Tasks"],["assigned-to","📥","Assigned to Me"],["assigned-by","📤","Assigned by Me"]] as const).map(([v,icon,label]) => (
            <div key={v} className={`nav-item ${currentView === v && currentLayout !== "ai" && currentLayout !== "calendar" && currentLayout !== "kanban" ? "active" : ""}`}
              onClick={() => { setCurrentLayout("list"); handleSetView(v); }}>
              <span className="nav-icon">{icon}</span> {label}
              <span className="nav-badge">
                {v === "all" ? allTasks.length : v === "assigned-to" ? (badgeTome ?? "—") : (badgeByme ?? "—")}
              </span>
            </div>
          ))}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <div className="sidebar-label">Layout</div>
          {([["list","≡","List View"],["kanban","⊞","Kanban Board"],["calendar","📅","Calendar"]] as const).map(([l,icon,label]) => (
            <div key={l} className={`nav-item ${currentLayout === l ? "active" : ""}`}
              onClick={() => setCurrentLayout(l)}>
              <span className="nav-icon">{icon}</span> {label}
            </div>
          ))}
        </div>

        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <div className={`nav-item ${currentLayout === "ai" ? "active" : ""}`} onClick={() => setCurrentLayout("ai")}>
            <span className="nav-icon">✦</span> AI Assistant
          </div>
        </div>

        <div className="viewer-section">
          <div className="viewer-card">
            <div className="viewer-label">Viewing as</div>
            <div className="viewer-row">
              <input className="viewer-input" list="name-list-sidebar" value={viewerInput}
                onChange={(e) => setViewerInput(e.target.value)}
                placeholder="Type your name…" autoComplete="off"
                onKeyDown={(e) => e.key === "Enter" && applyViewer()} />
              <button className="viewer-btn" onClick={applyViewer}>Go</button>
            </div>
            <div className="viewer-hint" style={{ color: viewerName ? "var(--accent3)" : "var(--text3)" }}>
              {viewerName ? `Showing tasks for "${viewerName}"` : "Leave blank to see all tasks"}
            </div>
          </div>
          <datalist id="name-list-sidebar">
            {knownNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-actions">
            <input className="search-input" type="text" placeholder="🔍  Search tasks…"
              value={searchQ} onChange={(e) => setSearchQ(e.target.value.toLowerCase())} />
            <button className="btn btn-primary" onClick={() => { setEditingTask(null); setModalOpen(true); }}>＋ New Task</button>
          </div>
        </div>

        <div className="content">
          {currentLayout === "list" && (
            <ListView tasks={filtered} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle}
              statusFilter={statusFilter} priorityFilter={priorityFilter}
              setStatusFilter={setStatusFilter} setPriorityFilter={setPriorityFilter} />
          )}
          {currentLayout === "kanban" && (
            <KanbanView tasks={filtered} onEdit={openEdit} />
          )}
          {currentLayout === "calendar" && (
            <CalendarView allTasks={allTasks} onEdit={openEdit} />
          )}
          {currentLayout === "ai" && (
            <AIView viewerName={viewerName} />
          )}
        </div>
      </div>

      <TaskModal open={modalOpen} editing={editingTask} onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSave={handleSave} viewerName={viewerName} knownNames={knownNames} />
    </>
  );
}
