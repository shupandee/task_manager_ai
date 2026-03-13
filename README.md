# TaskFlow — Next.js

A full-stack team task manager with AI assistant, built with Next.js 14 App Router.  
Replaces the original Python FastAPI + HTML setup entirely.

---

## Project Structure

```
taskflow/
├── app/
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── route.ts          # GET (list) + POST (create)
│   │   │   └── [id]/route.ts     # PATCH (update) + DELETE
│   │   ├── people/route.ts       # GET known names
│   │   └── ai-query/route.ts     # POST AI agent
│   ├── globals.css               # All styles (exact port from original)
│   ├── layout.tsx
│   └── page.tsx                  # Full React UI (all 4 views + modal)
├── lib/
│   ├── store.ts                  # File-based JSON storage (tasks_data.json)
│   └── ai.ts                     # Azure OpenAI agentic loop
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Azure OpenAI

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-01
```

> The AI Assistant tab requires these credentials.  
> All other features (list, kanban, calendar, CRUD) work without them.

### 3. Run development server

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Testing

### Manual testing checklist

#### Basic CRUD
- [ ] Open app → seed data loads (5 tasks visible)
- [ ] Click **＋ New Task** → fill title, assign to, assigned by → Create
- [ ] Click a task card → Edit modal opens → change priority → Save
- [ ] Click the circle checkbox → task toggles done/todo
- [ ] Hover a task → click ✕ → confirm → task deleted

#### Views & Filters
- [ ] Sidebar → **Kanban Board** → 3 columns with correct tasks
- [ ] Sidebar → **Calendar** → tasks appear on due date cells
- [ ] Search box → type a name or title → tasks filter live
- [ ] Filter buttons → "Urgent" → only urgent tasks shown

#### Viewer Mode
- [ ] Type "Alice Johnson" in the "Viewing as" box → click Go
- [ ] Badge next to "Assigned to Me" updates
- [ ] Click "Assigned to Me" → only Alice's tasks
- [ ] Click "Assigned by Me" → only tasks assigned by Alice

#### AI Assistant (requires Azure credentials)
- [ ] Sidebar → **AI Assistant**
- [ ] Click a chip like "Tasks due today" → AI responds
- [ ] Type a custom question: "How many tasks does Bob have?"

### API testing with curl

```bash
# List all tasks
curl http://localhost:3000/api/tasks

# List tasks assigned to Alice
curl "http://localhost:3000/api/tasks?viewer=Alice+Johnson&role=assigned_to"

# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"New task","assigned_to":"Alice Johnson","assigned_by":"Bob Smith","priority":"high"}'

# Update a task (replace TASK_ID)
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID

# Get known names
curl http://localhost:3000/api/people

# AI query (requires Azure credentials in .env.local)
curl -X POST http://localhost:3000/api/ai-query \
  -H "Content-Type: application/json" \
  -d '{"query":"Show overdue tasks","viewer":null}'
```

---

## Production build

```bash
npm run build
npm start
```

---

## Notes

- **Data storage**: Tasks are saved to `tasks_data.json` in the project root (same format as the Python backend). If this file already exists from the Python app, it will be reused automatically.
- **No database needed**: For production with multiple instances, swap `lib/store.ts` with a proper database (e.g. Postgres via Prisma).
- **AI without Azure**: To use standard OpenAI instead, update `lib/ai.ts` — change `getClient()` to use `new OpenAI({ apiKey })` and remove the Azure-specific `baseURL`/`defaultQuery`/`defaultHeaders`.