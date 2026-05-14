from fastapi import APIRouter, HTTPException

from app.models.lms_models import Course
from app.db.lms_store import courses

router = APIRouter()

@router.post("/courses")
def create_course(course: Course):

    courses[course.id] = course

    return {
        "message": "Course created",
        "course": course
    }

@router.get("/courses")
def get_courses():

    return list(courses.values())

@router.get("/courses/{course_id}", response_model=Course)
def get_course(course_id: int):
    course = courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

