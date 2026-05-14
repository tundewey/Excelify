from pydantic import BaseModel
from typing import List

class Lesson(BaseModel):
    id: int
    title: str
    content: str

class Course(BaseModel):
    id: int
    title: str
    description: str
    lessons: List[Lesson] = []