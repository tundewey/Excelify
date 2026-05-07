# Excelify

AI-powered learning stack with a **FastAPI** backend: ingest documents, embed them with **Sentence Transformers**, store vectors in **FAISS**, and answer questions with **RAG** via **OpenRouter** (OpenAI-compatible API).

## Features

- **Document upload** — text files chunked and embedded (`all-MiniLM-L6-v2`, 384-dim vectors).
- **Semantic search** — FAISS `IndexFlatL2` for nearest-neighbor retrieval.
- **Chat / RAG** — retrieve top-k chunks, build a prompt, complete with a configured model (e.g. `openai/gpt-4o-mini`).
- **Shared vector store** — single in-process `VectorStore` for upload and chat.

## Repository layout

```
ai-mcp-lms/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/v1/    # HTTP routes (chat, upload)
│   │   ├── db/        # FAISS store + shared instance
│   │   ├── services/  # RAG, embeddings
│   │   └── utils/     # Text chunking
│   ├── requirements.txt
│   ├── .env           # create locally (not committed)
│   └── .env.example   # template
└── README.md
```

Add a `frontend/` folder here when you wire a UI; this repo is ready for a typical monorepo layout.

## Prerequisites

- **Python 3.10+**
- An [OpenRouter](https://openrouter.ai/) API key
- Optional: Windows **Developer Mode** (or accept Hugging Face hub symlink warnings) for model cache

## Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy environment template and add your key:

```powershell
copy .env.example .env
# Edit .env and set OPENROUTER_API_KEY
```

## Run the API

From `backend` with the virtual environment activated:

```powershell
uvicorn app.main:app --reload
```

- **API root:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter secret key |
| `OPENROUTER_SITE_URL` | No | Optional header for OpenRouter |
| `OPENROUTER_APP_NAME` | No | Optional header for OpenRouter |

## API (v1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health-style message |
| `GET` | `/api/v1/chat` | Simple ping |
| `POST` | `/api/v1/chat` | JSON `{"question": "..."}` → RAG answer |
| `POST` | `/api/v1/upload` | Multipart file upload → chunk, embed, index |

**RAG flow:** Upload at least one document before `POST /api/v1/chat` so the vector store has context. The store is **in-memory**; restarting the server clears the index unless you add persistence.

## Configuration tips (OpenRouter)

- Set a modest **`max_tokens`** on chat completions to avoid large default completion budgets and credit issues on free tiers.
- Prefer smaller/cheaper models (e.g. `openai/gpt-4o-mini`) for development.

## Tech stack

- **FastAPI**, **Uvicorn**
- **sentence-transformers**, **PyTorch** (transitive)
- **faiss-cpu**, **NumPy**
- **openai** Python SDK (base URL `https://openrouter.ai/api/v1`)
- **python-dotenv**, **python-multipart**

## Contributing

Issues and pull requests are welcome on [github.com/tundewey/Excelify](https://github.com/tundewey/Excelify).

## License

This project is provided as-is for learning and extension. Add a `LICENSE` file if you need a specific license.
