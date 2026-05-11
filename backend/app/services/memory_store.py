from datetime import datetime, timezone

memory = {}

def save_memory(session_id: str, role: str, content: str):

    if session_id not in memory:
        memory[session_id] = []

    memory[session_id].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


def get_memory(session_id: str):

    return memory.get(session_id, [])