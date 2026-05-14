from fastapi import APIRouter, HTTPException
from app.models.lms_models import Lesson
from app.db.lms_store import courses

router = APIRouter()

@router.post("/courses/{course_id}/lessons")
def create_lesson(course_id: int, lesson: Lesson):

    # if course_id not in courses:
    #     return {
    #         "error": "Course not found"
    #     }

    if course_id not in courses:
        raise HTTPException(status_code=404, detail="Course not found")

    courses[course_id].lessons.append(lesson)

    return {
        "message": "Lesson created",
        "lesson": lesson
    }

@router.get("/courses/{course_id}/lessons", response_model=list[Lesson])
def get_course_lessons(course_id: int):
    course = courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course.lessons
    