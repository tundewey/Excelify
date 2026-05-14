from app.services.tools import TOOLS
from app.services.tool_selector import choose_tool
from app.services.memory_store import (save_memory, get_memory)

MAX_STEPS = 3

# Full transcript in the router prompt blows OpenRouter free-tier caps; keep routing small.
ROUTER_INPUT_MAX_CHARS = 1800


def _clip(text: str, max_chars: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


def run_agent(session_id: str, lesson_id: int, user_input: str):

    save_memory(session_id, "user", user_input)

    # Optional: still load history if you add features that need it later.
    get_memory(session_id)

    history = []

    user_clean = (user_input or "").strip()
    # First step: router + tools use the live question only (better for RAG retrieval too).
    current_input = user_clean

    for step in range(MAX_STEPS):
        print(f"STEP {step + 1}")
        # THINK — small prompt for OpenRouter tool routing
        routing_input = _clip(current_input, ROUTER_INPUT_MAX_CHARS)

        try:
            decision = choose_tool(routing_input)
        except Exception as e:
            return {
                "error": str(e)
            }

        tool_name = decision.tool

        print(f"REASONING: {decision.reasoning}")
        print(f"TOOL: {tool_name}")

        if tool_name not in TOOLS:
            return {"error": f"Unknown tool: {tool_name}"}

        # ACT — first turn: user question; later turns: prior-result continuation block
        tool = TOOLS[tool_name]

        # result = tool(current_input)

        if tool_name == "rag_search":
            result = tool(lesson_id, current_input)
        else:
            result = tool(current_input)

        result_text = result if isinstance(result, str) else ("" if result is None else str(result))
        
        # OBSERVE
        history.append({"step": step + 1, "tool": tool_name, "reasoning": decision.reasoning, "result": result_text})

        # STOP CONDITION
        if "final answer" in result_text.lower():
            break

        # Tutor UX: one retrieval + one answer — avoid summarize/quiz chaining on the same question.
        if tool_name == "rag_search":
            break

        # CONTINUE THINKING
        current_input = f"""
        Previous result:
        {result_text}

        Decide next action.
        """

        save_memory(
            session_id,
            "assistant",
            history[-1]["result"]
        )

    final = history[-1]["result"] if history else ""
    save_memory(session_id, "assistant", final)

    return {"history": history, "final_response": final}


# from app.services.tools import TOOLS
# from app.services.tool_selector import choose_tool
# from app.services.memory_store import (save_memory, get_memory)

# MAX_STEPS = 3


# def run_agent(session_id: str, user_input: str):

#     save_memory(session_id, "user", user_input)
    
#     conversation_history = get_memory(session_id)

#     history = []

#     # current_input = user_input

#     current_input = f"""
#         Conversation History:
#         {conversation_history}

#         Current User Input:
#         {user_input}
#         """

#     for step in range(MAX_STEPS):
#         print(f"STEP {step + 1}")
#         # THINK

#         try:
#             # tool_name = choose_tool(current_input)
#             decision = choose_tool(current_input)
#         except Exception as e:
#             return {
#                 "error": str(e)
#             }
        
#         tool_name = decision.tool
        
#         print(f"REASONING: {decision.reasoning}")
#         print(f"TOOL: {tool_name}")

#         if tool_name not in TOOLS:
#             return {"error": f"Unknown tool: {tool_name}"}

#         # ACT
#         tool = TOOLS[tool_name]

#         result = tool(current_input)

#         # OBSERVE
#         history.append({"step": step + 1, "tool": tool_name,"reasoning": decision.reasoning,"result": result})

#         # STOP CONDITION
#         if "final answer" in result.lower():
#             break

#         # CONTINUE THINKING
#         current_input = f"""
#         Previous result:
#         {result}

#         Decide next action.
#         """

#         save_memory(
#             session_id,
#             "assistant",
#             history[-1]["result"]
#         )

#     return {"history": history, "final_response": history[-1]["result"]}
