# Excelify (AI-MCP-LMS)

Excelify is a learning-focused AI backend that combines:
- retrieval-augmented generation (RAG) with FAISS + sentence-transformers,
- an OpenRouter-powered tool-selection agent loop,
- and a lightweight local MCP-style tool server used for calculator/utility calls.

Repository: [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify)

## What this project does

- Upload text documents and index them into an in-memory vector store.
- Answer questions from uploaded context using OpenRouter.
- Route user requests through an agent that selects a tool (`rag_search`, `summarize`, `quiz_tool`, `calculator_tool`).
- Call local MCP-style tools (for example, calculator) from the backend.

## Architecture at a glance

1. `POST /api/v1/upload` receives a text file.
2. File content is chunked and embedded with `all-MiniLM-L6-v2`.
3. Embeddings are stored in a shared FAISS-backed in-memory store.
4. `POST /api/v1/chat` runs an agent loop (`MAX_STEPS = 3`):
   - choose tool with OpenRouter (`tool` + `reasoning` JSON),
   - execute selected tool,
   - return step-by-step `history` and `final_response`.
5. `calculator_tool` calls the local MCP server at `http://127.0.0.1:9000`.

Note: the vector store is in memory. Restarting the backend clears uploaded embeddings.

## Project structure

```text
ai-mcp-lms/
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/v1/            # chat and upload routes
│   │   ├── db/                # vector store + shared instance
│   │   ├── models/            # Pydantic schemas
│   │   ├── services/          # agent, router, tools, MCP client, RAG
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
- `GET /tools` -> lists available tools
- `POST /execute` -> executes a tool with arguments

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
| `POST` | `/api/v1/chat` | Runs agent loop for `{"question": "..."}` |
| `POST` | `/api/v1/upload` | Upload and index a text file |

## Quick test flow

1. Start backend (`:8000`) and MCP server (`:9000`).
2. Upload a `.txt` file in Swagger (`/docs`) via `POST /api/v1/upload`.
3. Ask a question with `POST /api/v1/chat`.
4. Try a math prompt (for example: "Add 7 and 5") to trigger `calculator_tool`.

## Tech stack

- FastAPI, Uvicorn, Pydantic
- sentence-transformers (`all-MiniLM-L6-v2`), NumPy, faiss-cpu
- OpenAI Python SDK with OpenRouter `base_url`
- python-dotenv, python-multipart, requests

## Known limitations

- No persistent vector DB yet (in-memory only).
- MCP server is a local development service.
- `frontend/` is currently a placeholder.

## Contributing

Pull requests and issues are welcome: [tundewey/Excelify](https://github.com/tundewey/Excelify)
