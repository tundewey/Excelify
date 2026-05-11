# Excelify (AI-MCP-LMS)

Excelify is a learning-focused AI backend that combines:
- retrieval-augmented generation (RAG) with FAISS + sentence-transformers,
- an OpenRouter-powered tool-selection agent loop,
- and a lightweight local MCP-style tool server used for calculator/utility calls.

Repository: [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify)

## What this project does

- Upload text documents and index them into an in-memory vector store.
- Answer questions from uploaded context using OpenRouter.
- Route user requests through an agent that selects a tool from the backend registry (see **Tools** below).
- Call local MCP-style tools (`calculator`, `echo`, `uppercase`, `run_python`) from the backend over HTTP.
- Keep **per-session chat memory** in process (user turns and assistant tool results) so follow-up questions can see prior context.

## Architecture at a glance

1. `POST /api/v1/upload` receives a text file.
2. File content is chunked and embedded with `all-MiniLM-L6-v2`.
3. Embeddings are stored in a shared FAISS-backed in-memory store.
4. `POST /api/v1/chat` accepts a **`session_id`** and **`question`**. The agent loads **`memory_store`** for that session, appends the user message, and passes conversation history plus the current question into the router and tools. After each agent step it can append an assistant memory entry (last step result).
5. The agent loop runs up to **`MAX_STEPS = 3`**: choose tool with OpenRouter (`tool` + `reasoning` JSON), run the tool, return `history` and `final_response`.
6. MCP-backed tools call the local server at `http://127.0.0.1:9000` (`mcp_client`).

The tool router builds its prompt from **`TOOLS` keys** merged with **`GET /tools`** descriptions from the MCP server when it is reachable (fallback text is used if the MCP server is down).

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
└── frontend/                  # placeholder for UI work
```

## Prerequisites

- Python 3.10+
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

## 2) MCP server setup and run

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

1. Start backend (`:8000`) and MCP server (`:9000`).
2. Upload a `.txt` file in Swagger (`/docs`) via `POST /api/v1/upload`.
3. Ask a question with `POST /api/v1/chat` using a fixed `session_id` (for example `demo-1`) so memory accrues across turns.
4. Try a math prompt (for example: "Add 7 and 5") to trigger `calculator` or `calculator_tool`.
5. Optional: try echo / uppercase, or a guarded `run_python_tool` prompt only in a safe local setup.

## Tech stack

- FastAPI, Uvicorn, Pydantic
- sentence-transformers (`all-MiniLM-L6-v2`), NumPy, faiss-cpu
- OpenAI Python SDK with OpenRouter `base_url`
- python-dotenv, python-multipart, requests

## Known limitations

- No persistent vector DB yet (in-memory only).
- Session memory is a single-process dict (`memory_store`); it does not scale across workers or survive restarts.
- MCP server is a local development service; `run_python` is inherently unsafe if exposed.
- `frontend/` is currently a placeholder.

## Contributing

Pull requests and issues are welcome: [tundewey/Excelify](https://github.com/tundewey/Excelify)
