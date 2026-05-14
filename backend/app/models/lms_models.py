from pydantic import BaseModel
from typing import List, Optional

class Lesson(BaseModel):
    id: int
    title: str
    content: str


class LessonCreate(BaseModel):
    """Create a lesson; omit id to auto-assign the next integer id across all lessons."""

    title: str
    content: str
    id: Optional[int] = None


class Course(BaseModel):
    id: int
    title: str
    description: str
    lessons: List[Lesson] = []


class CourseCreate(BaseModel):
    """Create a course; omit id to auto-assign the next integer id."""

    title: str
    description: str
    id: Optional[int] = None