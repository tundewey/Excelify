# Excelify (AI-MCP-LMS)

Excelify is a learning-focused **full stack** app:

- **Next.js** frontend: course catalog (`/`), course detail (`/courses/[courseId]`), per-lesson chat and material upload (`/lessons/[lessonId]`)
- **FastAPI** backend: in-memory **courses & lessons**, **lesson-scoped** FAISS indexes for RAG, an **OpenRouter** agent router, optional **quiz generation** from lesson materials, and **per-session chat memory**
- Optional **MCP-style** tool server (`mcp_server`) on `http://127.0.0.1:9000` for calculator, echo, uppercase, and `run_python`

Repository: [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify)

## What this project does

- **LMS (demo):** create courses and lessons via API; the UI lists courses and drills into lessons.
- **Lesson materials:** upload a `.txt` file for a given **`lesson_id`**; chunks are embedded and stored in **`lesson_vector_stores[lesson_id]`** (separate FAISS index per lesson).
- **Chat:** `POST /api/v1/chat` with `session_id`, **`lesson_id`**, and `question`. The agent routes tools; **`rag_search`** answers from vectors for that lesson only.
- **Quiz:** `GET /api/v1/quiz/{lesson_id}` retrieves chunks from the lesson index and asks OpenRouter for three multiple-choice questions (JSON).
- **MCP tools:** calculator, echo, uppercase, Python runner (when `mcp_server` is running).
- **Memory:** `memory_store` keeps per-session transcript lines (in-process); the router still uses a **clipped** current input for token limits (`ROUTER_INPUT_MAX_CHARS` in `agent_service.py`).

## Architecture at a glance

1. **Courses / lessons** live in `app/db/lms_store.py` (`courses` dict). APIs under `/api/v1/courses` and `/api/v1/courses/{id}/lessons`.
2. **Upload:** `POST /api/v1/upload/{lesson_id}` → chunk → embed → `lesson_vector_stores[lesson_id]`.
3. **RAG:** `answer_question(lesson_id, question)` searches that lesson’s store only.
4. **Chat:** `run_agent(session_id, lesson_id, question)` → `choose_tool` → tools; `rag_search` receives `lesson_id`.
5. **Quiz:** sample chunks from the lesson store (query embedding for `"Generate quiz"`) → `generate_quiz(context)` → parsed JSON `questions`.
6. **MCP:** HTTP client to `http://127.0.0.1:9000` for non-RAG tools.

The backend enables **CORS** for `http://localhost:3000` and `http://127.0.0.1:3000`.

**Persistence:** `courses`, `lesson_vector_stores`, and `memory_store` are all **in memory**. Restarting the backend clears them.

## Tools

Registry: `backend/app/services/tools.py`

| Tool name | Role |
|-----------|------|
| `rag_search` | RAG for **`lesson_id`** (lesson-scoped FAISS + OpenRouter). |
| `summarize` | Short summary of the user text. |
| `quiz_tool` | Simple canned quiz line (separate from HTTP quiz API). |
| `calculator` / `calculator_tool` | MCP addition. |
| `echo` / `uppercase` | MCP utilities. |
| `run_python_tool` | MCP `run_python` (stdout). |

**Security:** `run_python` is arbitrary code with full `__builtins__`. Do not expose the MCP port publicly.

## Project structure

```text
ai-mcp-lms/
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/v1/            # chat, upload, courses, lessons, quiz
│   │   ├── db/                # vector_store, store, lms_store, vector_registry
│   │   ├── models/            # schemas, lms_models, quiz_models
│   │   ├── services/          # agent, memory, tools, RAG, quiz, MCP client, …
│   │   └── utils/
│   ├── requirements.txt
│   └── .env.example
├── mcp_server/
│   └── main.py
└── frontend/
    ├── app/
    │   ├── page.tsx                    # course list
    │   ├── courses/[courseId]/         # course + lessons
    │   └── lessons/[lessonId]/         # upload + chat (lesson_id scoped)
    └── package.json
```

## Prerequisites

- Python 3.10+
- Node.js 20+ (recommended for Next.js 16)
- [OpenRouter](https://openrouter.ai/) API key
- Windows PowerShell (examples below)

## 1) Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENROUTER_API_KEY` in `backend/.env`, then:

```powershell
uvicorn app.main:app --reload
```

- API: <http://127.0.0.1:8000>
- Docs: <http://127.0.0.1:8000/docs>

## 2) MCP server (optional)

```powershell
cd mcp_server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn pydantic
uvicorn main:app --port 9000 --reload
```

## 3) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. Pages call **`http://127.0.0.1:8000`** (see `frontend/app/page.tsx` and lesson page). Run the API on **port 8000** or update `API_BASE` in the lesson page.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter key (chat, RAG, router, quiz) |
| `OPENROUTER_SITE_URL` | No | Optional attribution |
| `OPENROUTER_APP_NAME` | No | Optional app title |

## API reference (v1)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health |
| `GET` | `/api/v1/chat` | Chat ping |
| `POST` | `/api/v1/chat` | Agent: `{"session_id": "...", "lesson_id": 1, "question": "..."}` |
| `POST` | `/api/v1/upload/{lesson_id}` | Multipart file → index under that lesson |
| `POST` | `/api/v1/courses` | Create course (body: `Course`) |
| `GET` | `/api/v1/courses` | List courses |
| `GET` | `/api/v1/courses/{course_id}` | Get one course |
| `POST` | `/api/v1/courses/{course_id}/lessons` | Add lesson to course |
| `GET` | `/api/v1/courses/{course_id}/lessons` | List lessons |
| `GET` | `/api/v1/quiz/{lesson_id}` | MCQ JSON from lesson vectors (requires prior upload) |

Create sample data via Swagger or `curl`, then open a lesson URL in the UI that matches a **lesson `id`** you created.

## Quick test

1. Start backend (and optional MCP).
2. `POST /api/v1/courses` with a course that includes at least one lesson (`id`, `title`, `content`).
3. Open the app home → course → lesson, or go directly to `/lessons/{lessonId}`.
4. Upload a `.txt` lesson material file, then chat; optional: `GET /api/v1/quiz/{lesson_id}` in Swagger.

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, TypeScript  
- **Backend:** FastAPI, Uvicorn, Pydantic, sentence-transformers, faiss-cpu, OpenAI SDK → OpenRouter, requests, python-dotenv, python-multipart  

## Known limitations

- No database: courses, vectors, and chat memory vanish on restart.
- Lesson IDs must stay consistent between LMS data, uploads, chat, and quiz (no server-side join validation beyond 404s).
- Demo `session_id` in the lesson UI; use real session handling in production.
- `run_python` / MCP must stay on trusted networks only.

## Contributing

Issues and PRs: [tundewey/Excelify](https://github.com/tundewey/Excelify)
