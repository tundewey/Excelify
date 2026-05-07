import os
import json

from openai import OpenAI
from app.models.schemas import ToolDecision

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

AVAILABLE_TOOLS = [
    "rag_search",
    "summarize",
    "quiz_tool",
]


def choose_tool(user_input: str) -> ToolDecision:
    prompt = f"""
    You are an AI agent.

    Available tools:
    {AVAILABLE_TOOLS}

    Return ONLY valid JSON.
    Your output must be a single JSON object only; no markdown, no code fences, and no explanation or any text before or after the JSON.

    The JSON object must include exactly two string fields:
    - "tool": one of the tool names listed above.
    - "reasoning": one short sentence explaining why that tool fits the user input (for debugging).

    Example:
    {{
      "tool": "rag_search",
      "reasoning": "The user is asking about information that should come from uploaded documents."

    }}

    Semantic rules:
    - Use rag_search for knowledge/document questions
    - Use summarize for summaries
    - Use quiz_tool for quizzes

    User Input:
    {user_input}
    """

    response = client.chat.completions.create(
        model="openai/gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )

    # return response.choices[0].message.content.strip()
    
    content = response.choices[0].message.content.strip()
    # print(f"CONTENT: {content}")
    data = json.loads(content)
    # print(f"DATA: {data}")
    # validated = ToolDecision(**data)
    # print(f"VALIDATED: {validated} {validated.tool}")
    # return validated.tool
    return ToolDecision(**data)
