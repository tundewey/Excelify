from pydantic import BaseModel

class ToolDecision(BaseModel):
    tool: str
    reasoning: str

class ChatRequest(BaseModel):
    session_id: str
    question: str
    lesson_id: int