from pydantic import BaseModel
from typing import List

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str

class QuizResponse(BaseModel):
    lesson_id: int
    questions: List[QuizQuestion]