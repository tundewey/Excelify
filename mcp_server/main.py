from fastapi import FastAPI
from pydantic import BaseModel

import contextlib
import io


app = FastAPI(title="MCP Server")

TOOLS = {
    "calculator": {
        "description": "Adds two numbers"
    },
    "echo": {
        "description": "Echoes input text"
    },
    "uppercase": {
        "description": "Converts text to uppercase"
    },
    "run_python": {
        "description": "Executes Python code"
    },
}

@app.get("/tools")
def list_tools():
    return TOOLS


class ToolRequest(BaseModel):
    tool: str
    arguments: dict


@app.post("/execute")
def execute_tool(req: ToolRequest):

    if req.tool == "calculator":
        a = req.arguments.get("a", 0)
        b = req.arguments.get("b", 0)

        return {
            "result": a + b
        }

    elif req.tool == "echo":
        text = req.arguments.get("text", "")

        return {
            "result": text
        }

    elif req.tool == "uppercase":
        text = req.arguments.get("text", "")

        return {
            "result": str(text).upper()
        }

    # elif req.tool == "run_python":

    #     code = req.arguments.get("code", "")

    #     try:
    #         local_scope = {}

    #         exec(code, {}, local_scope)

    #         return {
    #             "result": local_scope
    #         }

    #     except Exception as e:
    #         return {
    #             "error": str(e)
    #         }

    elif req.tool == "run_python":

        code = req.arguments.get("code", "")

        stdout_buf = io.StringIO()
        try:
            globals_dict = {"__builtins__": __builtins__}
            local_scope: dict = {}

            with contextlib.redirect_stdout(stdout_buf):
                exec(code, globals_dict, local_scope)

            return {
                "result": stdout_buf.getvalue(),
            }

        except Exception as e:
            return {
                "error": str(e),
            }

    return {
        "error": "Unknown tool"
    }