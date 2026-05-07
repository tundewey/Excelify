from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1 import upload

app = FastAPI(title="AI-MCP-LMS")

app.include_router(chat_router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "AI-MCP-LMS is running!"}
