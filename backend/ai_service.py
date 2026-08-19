import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def ask_nexa(prompt: str) -> str:

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": """
You are Nexa AI, an intelligent productivity assistant.

Help users with:
- productivity
- planning
- task management
- learning
- coding
- project ideas
- writing
- summarization

Be concise, practical and helpful.
"""
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_tokens=1000
    )

    return response.choices[0].message.content