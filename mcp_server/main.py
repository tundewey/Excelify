from fastapi import FastAPI
from pydantic import BaseModel

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
    }
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

    return {
        "error": "Unknown tool"
    }