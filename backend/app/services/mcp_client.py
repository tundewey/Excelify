import requests

MCP_BASE_URL = "http://127.0.0.1:9000"

session = requests.Session()
session.trust_env = False

# def get_available_tools():

#     response = session.get(f"{MCP_BASE_URL}/tools")

#     return response.json()

def get_available_tools():
    response = session.get(f"{MCP_BASE_URL}/tools", timeout=(2, 10))
    response.raise_for_status()
    return response.json()

def execute_mcp_tool(tool: str, arguments: dict):

    payload = {
        "tool": tool,
        "arguments": arguments
    }

    # response = session.post(
    #     f"{MCP_BASE_URL}/execute",
    #     json=payload,
    #     timeout=(2, 15)
    # )
    # response.raise_for_status()
    # return response.json()

    try:
        response = session.post(
            f"{MCP_BASE_URL}/execute",
            json=payload,
            timeout=(2, 15),
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise RuntimeError(f"MCP request failed: {e}") from e

