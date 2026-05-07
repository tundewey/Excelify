# Excelify

AI-powered learning stack: **FastAPI** backend with **RAG** (Sentence Transformers + **FAISS**), an **agent loop** that routes to tools via **OpenRouter**, and room to grow toward **MCP-style** tool calling.

**Repository:** [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify)

## Features

- **Document upload** — Text files are chunked, embedded with `all-MiniLM-L6-v2` (384-dim), and added to a shared **FAISS** index.
- **RAG** — `rag_search` retrieves top-k chunks and answers with an LLM through [OpenRouter](https://openrouter.ai/) (OpenAI-compatible SDK).
- **Agent loop** — Up to multiple steps: the router chooses a tool, runs it, and can iterate (observe → decide → act).
- **Tool registry** — Central `TOOLS` map: `rag_search`, `summarize`, `quiz_tool` (extend with new entries as you learn).
- **Debuggable routing** — The router returns structured JSON validated by Pydantic: **`tool`** + **`reasoning`** (why that tool). Step logs and chat **history** include reasoning for troubleshooting.

## How it flows

1. **Upload** (`POST /api/v1/upload`) → chunk → embed → `vector_store.add(...)`.
2. **Chat** (`POST /api/v1/chat`) → `run_agent` → **`choose_tool`** (LLM picks tool + reasoning) → run `TOOLS[tool]` → append to **history** until stop condition or max steps.

The vector store is **in-memory** and **shared** across routes in one process (`app/db/store.py`). Restarting the server clears embeddings unless you add persistence.

## Repository layout

```
ai-mcp-lms/
├── README.md
└── backend/
    ├── app/
    │   ├── api/v1/           # chat, upload
    │   ├── db/               # VectorStore + shared instance
    │   ├── models/           # schemas (e.g. ToolDecision)
    │   ├── services/         # RAG, embeddings, agent, tools, tool_selector
    │   └── utils/             # text chunker
    ├── requirements.txt
    ├── pyrightconfig.json
    ├── .env.example
    └── .env                   # local only — not committed
```

Add a **`frontend/`** folder when you connect a UI; this layout fits a typical monorepo.

## Prerequisites

- **Python 3.10+**
- **[OpenRouter](https://openrouter.ai/)** API key (chat + router calls)
- First run downloads the embedding model (Hugging Face cache); on Windows you may see symlink cache warnings unless Developer Mode is on.

## Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Set OPENROUTER_API_KEY in .env
```

## Run the API

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

- **Root:** http://127.0.0.1:8000  
- **Swagger:** http://127.0.0.1:8000/docs  

`app/main.py` loads `.env` from `backend/` before importing routes so keys are available on startup.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter secret key |
| `OPENROUTER_SITE_URL` | No | Optional header for OpenRouter |
| `OPENROUTER_APP_NAME` | No | Optional header (e.g. `Excelify`) |

## API (v1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Smoke message |
| `GET` | `/api/v1/chat` | Ping |
| `POST` | `/api/v1/chat` | `{"question": "..."}` → agent result: `history` (steps with `tool`, `reasoning`, `result`), `final_response`; or `{ "error": "..." }` |
| `POST` | `/api/v1/upload` | Multipart file → chunk, embed, index |

**Suggested flow:** Upload a `.txt` (or decoded text) document, then ask a question so `rag_search` has vectors to query.

## OpenRouter tips

- Use a **modest `max_tokens`** on long completions so free-tier credits are not exhausted by default large caps (`rag_service`).
- Prefer **`openai/gpt-4o-mini`** where possible for routing and experimentation.
- The tool router expects **pure JSON** with `tool` and `reasoning`; tightening the prompt reduces parse errors.

## Tech stack

- **FastAPI**, **Uvicorn**, **Pydantic**
- **sentence-transformers** (embedding), **faiss-cpu**, **NumPy**
- **openai** SDK → `base_url=https://openrouter.ai/api/v1`
- **python-dotenv**, **python-multipart**

## Roadmap ideas

- Tool payloads: `arguments: { ... }` per tool (closer to full tool calling / **MCP**).
- Persist FAISS + metadata to disk or a hosted vector DB.
- Frontend for upload + chat UX.

## Contributing

Issues and pull requests are welcome on **[tundewey/Excelify](https://github.com/tundewey/Excelify)**.

## License

Provided as-is for learning. Add a `LICENSE` file when you settle on terms.
