# Excelify (AI-MCP-LMS)

Excelify is a learning-focused **full stack** app:

- **Next.js** frontend (chat UI, document upload, agent step timeline) on `http://localhost:3000`
- **FastAPI** backend with RAG (**FAISS** + **sentence-transformers**), an **OpenRouter** tool router, and **per-session memory**
- Optional **MCP-style** tool server (`mcp_server`) on `http://127.0.0.1:9000` for calculator, echo, uppercase, and `run_python`

Repository: [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify)

## What this project does

- Upload text documents and index them into an in-memory vector store (API or UI).
- Answer questions from uploaded context using OpenRouter (`rag_search`).
- Route requests through an agent that picks a tool from the backend registry (see **Tools** below).
- Call MCP-backed tools over HTTP when the MCP server is running.
- Persist **session-scoped** user and assistant entries in `memory_store` (in-process). The **router** uses the current turn text (clipped for token limits); tools receive the same `current_input` flow as before multi-step continuation.

## Architecture at a glance

1. `POST /api/v1/upload` receives a text file.
2. File content is chunked and embedded with `all-MiniLM-L6-v2`.
3. Embeddings are stored in a shared FAISS-backed in-memory store.
4. `POST /api/v1/chat` accepts **`session_id`** and **`question`**. The agent records the user message, runs up to **`MAX_STEPS = 3`**: clip routing input (see `ROUTER_INPUT_MAX_CHARS` in `agent_service.py`), **`choose_tool`** returns JSON (`tool`, `reasoning`), then the selected tool runs. Assistant lines are appended to memory during multi-step runs and once with the final reply.
5. MCP-backed tools call `http://127.0.0.1:9000` via `mcp_client`.

The tool router builds its prompt from **`TOOLS` keys** merged with **`GET /tools`** descriptions from the MCP server when it is reachable (fallback text is used if the MCP server is down).

The backend enables **CORS** for `http://localhost:3000` and `http://127.0.0.1:3000` so the Next.js app can call the API.

Note: the vector store and **`memory_store`** are in memory. Restarting the backend clears uploaded embeddings and all session transcripts.

## Tools

Backend registry (`backend/app/services/tools.py`):

| Tool name | Role |
|-----------|------|
| `rag_search` | RAG answers from uploaded chunks (FAISS + OpenRouter). |
| `summarize` | Short inline summary of the user text. |
| `quiz_tool` | Quiz-style response. |
| `calculator` / `calculator_tool` | Same MCP calculator (two names; `calculator_tool` kept as an alias). |
| `echo` | MCP echo. |
| `uppercase` | MCP uppercase. |
| `run_python_tool` | Runs Python via MCP `run_python` (stdout captured). |

MCP server (`mcp_server/main.py`): `calculator`, `echo`, `uppercase`, `run_python` exposed on `GET /tools` and `POST /execute`.

**Security:** `run_python` executes arbitrary code with full `__builtins__`. Use only on trusted networks and never expose the MCP port publicly without hardening.

## Project structure

```text
ai-mcp-lms/
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/v1/            # chat and upload routes
│   │   ├── db/                # vector store + shared instance
│   │   ├── models/            # Pydantic schemas
│   │   ├── services/          # agent, memory_store, router, tools, MCP client, RAG
│   │   └── utils/             # chunking helpers
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                   # local only, not committed
├── mcp_server/
│   └── main.py                # local MCP-style tool server
└── frontend/                  # Next.js (App Router) + Tailwind
    ├── app/                   # UI: `page.tsx` (API base `http://localhost:8000`)
    ├── package.json
    └── ...
```

## Prerequisites

- Python 3.10+
- **Node.js 20+** (recommended for Next.js 16)
- An [OpenRouter](https://openrouter.ai/) API key
- Windows PowerShell (commands below use PowerShell syntax)

## 1) Backend setup and run

From project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENROUTER_API_KEY` inside `backend/.env`, then start backend:

```powershell
uvicorn app.main:app --reload
```

Backend URLs:
- API root: <http://127.0.0.1:8000>
- Swagger docs: <http://127.0.0.1:8000/docs>

## 2) MCP server setup and run (optional)

Open a second terminal:

```powershell
cd mcp_server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn pydantic
uvicorn main:app --port 9000 --reload
```

MCP server endpoints:
- `GET /tools` — tool catalog (names and descriptions for the router)
- `POST /execute` — body `{"tool": "<name>", "arguments": { ... } }` (for example `run_python` with `{"code": "print(1+1)"}`)

Without the MCP server, tools that call it will return a friendly “unavailable” style message from the backend.

## 3) Frontend setup and run

From project root:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The UI posts to **`http://localhost:8000`** (see `frontend/app/page.tsx`). Keep the backend running on port **8000**.

The demo UI uses a fixed **`session_id`** (`student_1` in code today). Change that in `page.tsx` if you need multiple isolated browser tabs or users.

## Environment variables

In `backend/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key used by router and RAG services |
| `OPENROUTER_SITE_URL` | No | Optional OpenRouter attribution header value |
| `OPENROUTER_APP_NAME` | No | Optional app name header value |

## API endpoints (backend)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health message |
| `GET` | `/api/v1/chat` | Chat endpoint ping |
| `POST` | `/api/v1/chat` | Runs agent loop: `{"session_id": "any-stable-id", "question": "..."}` |
| `POST` | `/api/v1/upload` | Upload and index a text file |

## Quick test flow

**Option A — UI**

1. Start backend (`:8000`), optional MCP (`:9000`), then `npm run dev` in `frontend/` (`:3000`).
2. Upload a `.txt` file in the app, then chat and inspect agent steps in the thread.

**Option B — Swagger**

1. Start backend and optional MCP.
2. Upload via `POST /api/v1/upload`.
3. Chat via `POST /api/v1/chat` with `{"session_id": "demo-1", "question": "..."}`.

Then try a math prompt (for example: “Add 7 and 5”) for `calculator` / `calculator_tool`, or echo / uppercase / `run_python_tool` only in a **trusted local** setup.

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Backend:** FastAPI, Uvicorn, Pydantic
- sentence-transformers (`all-MiniLM-L6-v2`), NumPy, faiss-cpu
- OpenAI Python SDK with OpenRouter `base_url`
- python-dotenv, python-multipart, requests

## Known limitations

- No persistent vector DB yet (in-memory only).
- Session memory is a single-process dict (`memory_store`); it does not scale across workers or survive restarts.
- MCP server is a local development service; `run_python` is inherently unsafe if exposed.
- The bundled UI uses a demo `session_id`; production apps should generate or authenticate sessions.

## Contributing

Pull requests and issues are welcome: [tundewey/Excelify](https://github.com/tundewey/Excelify)
