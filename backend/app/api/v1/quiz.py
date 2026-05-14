from fastapi import APIRouter
from app.services.quiz_service import generate_quiz
from app.db.vector_registry import (
    lesson_vector_stores
)
from app.services.embedding_service import (
    embed_texts
)

router = APIRouter()

@router.get("/quiz/{lesson_id}")
def create_quiz(lesson_id: int):

    if lesson_id not in lesson_vector_stores:
        return {
            "error": "Lesson materials not found"
        }

    vector_store = lesson_vector_stores[
        lesson_id
    ]

    query_embedding = embed_texts(
        ["Generate quiz"]
    )[0]

    chunks = vector_store.search(
        query_embedding,
        k=3
    )

    context = "\n".join(chunks)

    quiz = generate_quiz(context)

    return quiz