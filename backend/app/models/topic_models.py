from typing import Optional

from pydantic import BaseModel, Field


class TopicRequest(BaseModel):
    """User instruction for what topic to generate within the lesson."""

    prompt: str = Field(..., min_length=1, max_length=4000)


class TopicResponse(BaseModel):
    topic_title: str
    summary: str
    key_points: list[str] = Field(default_factory=list)
    suggested_activities: list[str] = Field(default_factory=list)
    raw_error: Optional[str] = None
