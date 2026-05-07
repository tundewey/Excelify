from app.services.tools import TOOLS
from app.services.tool_selector import choose_tool

MAX_STEPS = 3


def run_agent(user_input: str):

    history = []

    current_input = user_input

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

    return {"history": history, "final_response": history[-1]["result"]}
