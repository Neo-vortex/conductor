# Workflow Builder

A full-featured visual workflow builder + runtime manager for the Conductor workflow engine.

## Setup

### 1. Create Next.js project

```bash
npx create-next-app@latest workflow-builder --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd workflow-builder
```

### 2. Install all dependencies

```bash
npm install reactflow zustand uuid daisyui \
  @codemirror/autocomplete \
  @codemirror/commands \
  @codemirror/lang-python \
  @codemirror/language \
  @codemirror/state \
  @codemirror/theme-one-dark \
  @codemirror/view

npm install -D @types/uuid
```

### 3. Copy all files from this zip (maintain directory structure)

### 4. Run

```bash
npm run dev
```

---

## Features

### 🎨 Visual Builder
- Drag-and-drop step palette (EmitLog, Activity, WaitFor, Decide, While, Custom)
- Connect nodes visually, properties panel, resizable layout
- Python expression editor with syntax highlighting + workflow autocomplete (`data.*`, `step.*`)

### ⚡ Runtime Panel (click "⚡ Runtime" in toolbar)

#### Server Connection
- Configure base URL + optional Bearer token
- Test connection via `GET /api/info`
- Status indicator persisted across sessions

#### Deploy & Start Workflows
- **☁ Deploy** — POST current canvas definition to server (`POST /api/definition`)
- **▶ Start** — Optionally deploy first, then start instance with custom initial data
- Multiple instances of different workflows tracked simultaneously

#### Instance Tracker
- All running/completed instances shown in a list
- Live auto-refresh every 3 seconds (toggle per-instance)
- Track any workflow by ID manually
- Status badges: Runnable / Suspended / Complete / Terminated

#### Instance Detail (4 tabs)
- **📋 Overview** — all metadata fields
- **📦 Data** — live workflow data bag as formatted JSON
- **📡 Events** — publish WaitFor events (`POST /api/event/<<name>>/<<key>>`)
- **⚙ Activity** — fetch pending token, submit success/fail, or release

#### Lifecycle Actions (per instance)
- ⏸ Suspend (`PUT /api/workflow/<<id>>/suspend`)
- ▶ Resume (`PUT /api/workflow/<<id>>/resume`)  
- ✕ Terminate (`DELETE /api/workflow/<<id>>`)

#### Global Actions (toolbar buttons)
- **📡 Event** — publish any event to any workflow
- **⚙ Activity** — standalone activity manager
- **🐍 Step** — register/fetch custom Python steps (`POST/GET /api/step/<<id>>`)

---

## All Postman Endpoints Implemented

| Method | Path | Feature |
|--------|------|---------|
| GET | /api/info | Server connection test |
| POST | /api/definition | Deploy definition |
| GET | /api/definition/:id | (via import) |
| POST | /api/workflow/:id | Start workflow |
| GET | /api/workflow/:id | Refresh instance |
| PUT | /api/workflow/:id/suspend | Suspend |
| PUT | /api/workflow/:id/resume | Resume |
| DELETE | /api/workflow/:id | Terminate |
| GET | /api/activity/:name | Fetch pending token |
| POST | /api/activity/success/:token | Submit success |
| POST | /api/activity/fail/:token | Submit failure |
| DELETE | /api/activity/:token | Release token |
| POST | /api/event/:name/:key | Publish event |
| POST | /api/step/:id | Register custom step |
| GET | /api/step/:id | Fetch custom step |
