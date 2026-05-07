from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import run_agent

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


@router.get("/chat")
def chat():
    return {"response": "Chat endpoint working!"}


@router.post("/chat")
def chat(req: ChatRequest):
    # answer = answer_question(req.question)
    # return {"answer": answer}
    result = run_agent(req.question)
    return result
