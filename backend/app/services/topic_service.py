"""Generate structured teaching topics from lesson text and/or uploaded chunks."""
from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import OpenAI

from app.db.lms_store import courses
from app.db.vector_registry import lesson_vector_stores
from app.models.lms_models import Course, Lesson
from app.models.topic_models import TopicResponse
from app.services.embedding_service import embed_texts


def _find_lesson(lesson_id: int) -> tuple[Course | None, Lesson | None]:
    for course in courses.values():
        for lesson in course.lessons:
            if lesson.id == lesson_id:
                return course, lesson
    return None, None


def _build_context(lesson_id: int, user_prompt: str, lesson: Lesson, course: Course) -> str:
    parts: list[str] = [
        f"Course: {course.title}",
        f"Lesson title: {lesson.title}",
        f"Lesson body:\n{lesson.content}",
    ]

    if lesson_id in lesson_vector_stores:
        store = lesson_vector_stores[lesson_id]
        q_emb = embed_texts([user_prompt])[0]
        chunks = store.search(q_emb, k=5)
        if chunks:
            parts.append("Relevant excerpts from uploaded materials:\n" + "\n---\n".join(chunks))

    return "\n\n".join(parts)


def _strip_json_fence(text: str) -> str:
    text = (text or "").strip()
    m = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text)
    if m:
        return m.group(1).strip()
    return text


def generate_topic(lesson_id: int, user_prompt: str) -> dict[str, Any]:
    course, lesson = _find_lesson(lesson_id)
    if lesson is None or course is None:
        return TopicResponse(
            topic_title="",
            summary="",
            key_points=[],
            suggested_activities=[],
            raw_error="Lesson not found.",
        ).model_dump()

    context = _build_context(lesson_id, user_prompt.strip(), lesson, course)

    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
    )

    system_user = f"""
You are an instructional designer for an LMS. Given context and a user request, propose ONE teaching topic.

Return ONLY valid JSON (no markdown fences) with exactly these keys:
- "topic_title": string (short title)
- "summary": string (2-4 sentences)
- "key_points": array of 3-6 short strings
- "suggested_activities": array of 2-4 short strings (classroom or self-study)

User request:
{user_prompt.strip()}

Context:
{context}
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": system_user}],
            max_tokens=900,
        )
        raw = response.choices[0].message.content
        text = _strip_json_fence(raw or "")
        data = json.loads(text)
        return TopicResponse(
            topic_title=str(data.get("topic_title", "")).strip() or "Generated topic",
            summary=str(data.get("summary", "")).strip(),
            key_points=[str(x).strip() for x in data.get("key_points", []) if str(x).strip()],
            suggested_activities=[
                str(x).strip()
                for x in data.get("suggested_activities", [])
                if str(x).strip()
            ],
        ).model_dump()
    except Exception as e:
        return TopicResponse(
            topic_title="",
            summary="",
            key_points=[],
            suggested_activities=[],
            raw_error=str(e),
        ).model_dump()
