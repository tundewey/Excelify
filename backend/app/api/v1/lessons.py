from fastapi import APIRouter, HTTPException
from app.models.lms_models import Lesson, LessonCreate
from app.db.lms_store import courses

router = APIRouter()


def _next_lesson_id() -> int:
    max_id = 0
    for c in courses.values():
        for les in c.lessons:
            if les.id > max_id:
                max_id = les.id
    return max_id + 1 if max_id else 1


@router.post("/courses/{course_id}/lessons")
def create_lesson(course_id: int, lesson_in: LessonCreate):
    if course_id not in courses:
        raise HTTPException(status_code=404, detail="Course not found")

    lid = lesson_in.id if lesson_in.id is not None else _next_lesson_id()
    for c in courses.values():
        for existing in c.lessons:
            if existing.id == lid:
                raise HTTPException(
                    status_code=409,
                    detail=f"Lesson id {lid} already exists",
                )

    lesson = Lesson(
        id=lid,
        title=lesson_in.title,
        content=lesson_in.content,
    )
    courses[course_id].lessons.append(lesson)

    return {
        "message": "Lesson created",
        "lesson": lesson,
    }
@router.get("/courses/{course_id}/lessons", response_model=list[Lesson])
def get_course_lessons(course_id: int):
    course = courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course.lessons
    