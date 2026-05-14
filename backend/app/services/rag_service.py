import os
from openai import OpenAI

from app.services.embedding_service import embed_texts
from app.db.vector_registry import lesson_vector_stores

# from app.db.vector_store import VectorStore
from app.db.store import vector_store

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# Optional — OpenRouter uses these for app listings / rankings (recommended in their docs).
# Uncomment if you set them in the environment:
# client = OpenAI(
#     api_key=os.getenv("OPENROUTER_API_KEY"),
#     base_url="https://openrouter.ai/api/v1",
#     default_headers={
#         "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", ""),
#         "X-Title": os.getenv("OPENROUTER_APP_NAME", "AI-MCP-LMS"),
#     },
# )

# vector_store = VectorStore(dim=384)


def answer_question(lesson_id: int, question: str):
    if lesson_id not in lesson_vector_stores:
        return "No materials found for this lesson."

    vector_store = lesson_vector_stores[lesson_id]

    query_embedding = embed_texts([question])[0]
    relevant_chunks = vector_store.search(query_embedding, k=3)

    context = "\n".join(relevant_chunks)

    prompt = f"""
    Use the context below to answer the question.

    Context:
    {context}

    Question:
    {question}
    """

    response = client.chat.completions.create(
        model="openai/gpt-4o",  # use any model id shown on OpenRouter, e.g. anthropic/claude-3.5-haiku
        messages=[{"role": "user", "content": prompt}],
        # max_tokens=512,
        max_tokens=47,
        # extra_headers={  # alternative to default_headers on the client
        #     "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:8000"),
        #     "X-Title": os.getenv("OPENROUTER_APP_NAME", "AI-MCP-LMS"),
        # },
    )

    return response.choices[0].message.content
