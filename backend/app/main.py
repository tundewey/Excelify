import os
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1 import upload
from app.api.v1 import courses
from app.api.v1 import lessons
from app.api.v1 import quiz
from app.api.v1 import topics


app = FastAPI(title="AI-MCP-LMS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://excelify-gamma.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(lessons.router, prefix="/api/v1")
app.include_router(quiz.router, prefix="/api/v1")
app.include_router(topics.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "AI-MCP-LMS is running!"}
