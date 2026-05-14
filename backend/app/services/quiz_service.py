from openai import OpenAI
import os
import json

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

def generate_quiz(context: str):

    prompt = f"""
    Generate 3 multiple-choice quiz questions.

    Return ONLY valid JSON.

    Format:
    {{
      "questions": [
        {{
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "..."
        }}
      ]
    }}

    Context:
    {context}
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    content = response.choices[0].message.content

    return json.loads(content)