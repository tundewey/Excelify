from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import answer_question

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


@router.get("/chat")
def chat():
    return {"response": "Chat endpoint working!"}


@router.post("/chat")
def chat(req: ChatRequest):
    answer = answer_question(req.question)
    return {"answer": answer}
