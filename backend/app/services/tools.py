import re

from app.services.rag_service import answer_question
from app.services.mcp_client import execute_mcp_tool

def summarize_tool(text: str) -> str:
    return f"Summary: {text[:150]}"


def quiz_tool(text: str):
    return "Final Answer: Quiz - What is the main topic discussed?"

def calculator_tool(text: str):

    numbers = [int(s) for s in text.split() if s.isdigit()]

    if len(numbers) < 2:
        return "Final Answer: Need two numbers"

    # print("Calling MCP calculator...", {"a": numbers[0], "b": numbers[1]})

    # result = execute_mcp_tool(
    #     "calculator",
    #     {
    #         "a": numbers[0],
    #         "b": numbers[1]
    #     }
    # )

    # # result = execute_mcp_tool("calculator", {"a": numbers[0], "b": numbers[1]})
    # # print("MCP response:", result)

    # return f"Final Answer: {result['result']}"

    try:
        result = execute_mcp_tool(
            "calculator",
            {
                "a": numbers[0],
                "b": numbers[1],
            },
        )
        return f"Final Answer: {result['result']}"
    except Exception as e:
        return f"Final Answer: MCP calculator unavailable ({e})"

def echo_tool(text: str) -> str:
    try:
        result = execute_mcp_tool("echo", {"text": text})
        return f"Final Answer: {result['result']}"
    except Exception as e:
        return f"Final Answer: MCP echo unavailable ({e})"

def uppercase_tool(text: str) -> str:
    try:
        result = execute_mcp_tool("uppercase", {"text": text})
        return f"Final Answer: {result['result']}"
    except Exception as e:
        return f"Final Answer: MCP uppercase unavailable ({e})"

def run_python_tool(text: str):

    code = re.sub(r"(?is)(run|execute)\s+python\s*:?\s*", "", text).strip()
    # code = text.replace("run python", "").strip()

    result = execute_mcp_tool(
        "run_python",
        {
            "code": code
        }
    )

    if "error" in result:
        return f"Final Answer: Error - {result['error']}"

    return f"Final Answer: {result['result']}"

TOOLS = {
    "rag_search": answer_question,
    "summarize": summarize_tool,
    "quiz_tool": quiz_tool,
    "calculator": calculator_tool,
    "echo": echo_tool,
    "uppercase": uppercase_tool,
    "calculator_tool": calculator_tool,
    "run_python_tool": run_python_tool,
}


