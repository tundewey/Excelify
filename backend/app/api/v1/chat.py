from fastapi import APIRouter

from app.models.schemas import ChatRequest
from app.services.agent_service import run_agent

router = APIRouter()


@router.get("/chat")
def chat():
    return {"response": "Chat endpoint working!"}


@router.post("/chat")
def chat(req: ChatRequest):
    # answer = answer_question(req.question)
    # return {"answer": answer}
    result = run_agent(req.session_id, req.lesson_id, req.question)
    return result
