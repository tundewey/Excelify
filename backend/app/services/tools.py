from app.services.rag_service import answer_question


def summarize_tool(text: str) -> str:
    return f"Summary: {text[:150]}"


def quiz_tool(text: str):
    return "Final Answer: Quiz - What is the main topic discussed?"


TOOLS = {
    "rag_search": answer_question,
    "summarize": summarize_tool,
    "quiz_tool": quiz_tool,
}
