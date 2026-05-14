import json
import os

from openai import OpenAI

from app.models.schemas import ToolDecision
from app.services.mcp_client import get_available_tools
from app.services.tools import TOOLS

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# AVAILABLE_TOOLS = [
#     "rag_search",
#     "summarize",
#     "quiz_tool",
#     "calculator_tool"
# ]

LOCAL_TOOL_DESCRIPTIONS: dict[str, str] = {
    "rag_search": "Answer using retrieved context from uploaded documents (RAG).",
    "summarize": "Produce a short summary of the user text.",
    "quiz_tool": "Return a quiz-style response about the topic.",
    "calculator_tool": "Add two numbers from the user text (alias of calculator; MCP-backed).",
    "run_python_tool": "Execute Python code.",
}

def _build_available_tools_prompt() -> str:
    try:
        mcp_catalog = get_available_tools() or {}
    except Exception:
        mcp_catalog = {}
    lines: list[str] = []
    for name in sorted(TOOLS.keys()):
        if name in mcp_catalog and isinstance(mcp_catalog[name], dict):
            desc = mcp_catalog[name].get("description") or ""
        else:
            desc = LOCAL_TOOL_DESCRIPTIONS.get(name, "Backend tool.")
        lines.append(f"- {name}: {desc}")
    return "\n".join(lines)

# def choose_tool(user_input: str) -> ToolDecision:
#     prompt = f"""
#     You are an AI agent.

#     Available tools:
#     {AVAILABLE_TOOLS}

#     Return ONLY valid JSON.
#     Your output must be a single JSON object only; no markdown, no code fences, and no explanation or any text before or after the JSON.

#     The JSON object must include exactly two string fields:
#     - "tool": one of the tool names listed above.
#     - "reasoning": one short sentence explaining why that tool fits the user input (for debugging).

#     Example:
#     {{
#       "tool": "rag_search",
#       "reasoning": "The user is asking about information that should come from uploaded documents."

#     }}

#     Semantic rules:
#     - Use rag_search for knowledge/document questions
#     - Use summarize for summaries
#     - Use quiz_tool for quizzes
#     - Use calculator_tool for math/addition questions

#     User Input:
#     {user_input}
#     """

#     response = client.chat.completions.create(
#         model="openai/gpt-4o",
#         messages=[{"role": "user", "content": prompt}],
#         max_tokens=256,
#     )

#     # return response.choices[0].message.content.strip()
    
#     content = response.choices[0].message.content.strip()
#     # print(f"CONTENT: {content}")
#     data = json.loads(content)
#     # print(f"DATA: {data}")
#     # validated = ToolDecision(**data)
#     # print(f"VALIDATED: {validated} {validated.tool}")
#     # return validated.tool
#     return ToolDecision(**data)

def choose_tool(user_input: str) -> ToolDecision:
    tools_block = _build_available_tools_prompt()

    prompt = f"""
    You are an AI agent router.
    Available tools (names must match exactly):

    {tools_block}
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

    Routing rules (follow strictly — this powers an LMS tutor):
    - rag_search: DEFAULT for teaching questions — explain, what is, how does, define, describe,
      "according to", "lesson material", "document", "uploaded", "this lesson", "variables",
      "functions", concepts, or any factual question that should use course materials.
    - quiz_tool: ONLY when the user clearly asks for a quiz, test, exam, practice questions,
      MCQ, or "quiz me".
    - summarize: ONLY when the user explicitly asks to summarize, recap, TL;DR, or "in bullet points"
      (not for general "what is it about?" — use rag_search for that).
    - calculator / calculator_tool: arithmetic, add/multiply numbers, "what is N + M".
    - echo / uppercase: only when the user asks to echo or uppercase text.
    - run_python_tool: only when the user wants to run or execute Python code.

    User Input:

    {user_input}
    """
    response = client.chat.completions.create(
        model="openai/gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )
    content = response.choices[0].message.content.strip()
    data = json.loads(content)
    decision = ToolDecision(**data)
    if decision.tool not in TOOLS:
        raise ValueError(
            f"Model chose unknown tool {decision.tool!r}; allowed: {sorted(TOOLS.keys())}"
        )
    return decision
