from fastapi import APIRouter, HTTPException

from app.models.lms_models import Course, CourseCreate
from app.db.lms_store import courses

router = APIRouter()

def _next_course_id() -> int:
    if not courses:
        return 1
    return max(courses.keys()) + 1


@router.post("/courses")
def create_course(course_in: CourseCreate):
    cid = course_in.id if course_in.id is not None else _next_course_id()
    if cid in courses:
        raise HTTPException(status_code=409, detail=f"Course id {cid} already exists")
    course = Course(
        id=cid,
        title=course_in.title,
        description=course_in.description,
        lessons=[],
    )
    courses[cid] = course
    return {"message": "Course created", "course": course}

@router.get("/courses")
def get_courses():

    return list(courses.values())

@router.get("/courses/{course_id}", response_model=Course)
def get_course(course_id: int):
    course = courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

