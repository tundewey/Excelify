from app.services.tools import TOOLS
from app.services.tool_selector import choose_tool
from app.services.memory_store import (save_memory, get_memory)

MAX_STEPS = 3


def run_agent(session_id: str, user_input: str):

    save_memory(session_id, "user", user_input)
    
    conversation_history = get_memory(session_id)

    history = []

    # current_input = user_input

    current_input = f"""
        Conversation History:
        {conversation_history}

        Current User Input:
        {user_input}
        """

    for step in range(MAX_STEPS):
        print(f"STEP {step + 1}")
        # THINK

        try:
            # tool_name = choose_tool(current_input)
            decision = choose_tool(current_input)
        except Exception as e:
            return {
                "error": str(e)
            }
        
        tool_name = decision.tool
        
        print(f"REASONING: {decision.reasoning}")
        print(f"TOOL: {tool_name}")

        if tool_name not in TOOLS:
            return {"error": f"Unknown tool: {tool_name}"}

        # ACT
        tool = TOOLS[tool_name]

        result = tool(current_input)

        # OBSERVE
        history.append({"step": step + 1, "tool": tool_name,"reasoning": decision.reasoning,"result": result})

        # STOP CONDITION
        if "final answer" in result.lower():
            break

        # CONTINUE THINKING
        current_input = f"""
        Previous result:
        {result}

        Decide next action.
        """

        save_memory(
            session_id,
            "assistant",
            history[-1]["result"]
        )

    return {"history": history, "final_response": history[-1]["result"]}
