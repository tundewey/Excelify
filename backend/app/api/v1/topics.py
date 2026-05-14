from fastapi import APIRouter, HTTPException

from app.models.topic_models import TopicRequest, TopicResponse
from app.services.topic_service import generate_topic

router = APIRouter()


@router.post("/lessons/{lesson_id}/generate-topic", response_model=TopicResponse)
def generate_lesson_topic(lesson_id: int, body: TopicRequest):
    data = generate_topic(lesson_id, body.prompt)
    if data.get("raw_error") == "Lesson not found.":
        raise HTTPException(status_code=404, detail="Lesson not found")
    return TopicResponse(**data)
