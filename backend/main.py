from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_service import ask_nexa
from pydantic import BaseModel
from ai_service import ask_nexa

app = FastAPI(
    
    title="NexaOS AI",
    description="AI-powered productivity workspace",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "NexaOS AI Backend is running 🚀",
        "status": "success"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
from pydantic import BaseModel
from ai_service import ask_nexa


class ChatRequest(BaseModel):
    message: str
    tasks: list[dict] = []


@app.post("/ai/chat")
def ai_chat(data: ChatRequest):

    user_message = data.message.strip()
    message_lower = user_message.lower()

    # ==========================================
    # ADD TASK THROUGH AI
    # ==========================================

    add_keywords = [
        "add task",
        "add a task",
        "create task",
        "create a task",
        "new task",
        "make a task"
    ]

    if any(keyword in message_lower for keyword in add_keywords):

        task_title = ""

        if "called" in message_lower:
            task_title = user_message.split("called", 1)[1].strip()

        elif "named" in message_lower:
            task_title = user_message.split("named", 1)[1].strip()

        elif "to do" in message_lower:
            task_title = user_message.split("to do", 1)[1].strip()

        else:
            for keyword in add_keywords:
                if keyword in message_lower:
                    task_title = user_message.lower().split(keyword, 1)[1].strip()
                    break

        if task_title:

            new_id = max(
                (task.id for task in tasks),
                default=0
            ) + 1

            new_task = Task(
                id=new_id,
                title=task_title,
                completed=False
            )

            tasks.append(new_task)

            return {
                "response": f"✅ Added a new task: {task_title}",
                "action": "added"
            }


    # ==========================================
    # COMPLETE TASK THROUGH AI
    # ==========================================

    complete_keywords = [
        "complete",
        "mark as complete",
        "finish",
        "done with"
    ]

    if any(keyword in message_lower for keyword in complete_keywords):

        matched_task = None

        for task in tasks:
            task_title_lower = task.title.lower()

            if task_title_lower in message_lower:
                matched_task = task
                break

        if matched_task:

            matched_task.completed = True

            return {
                "response": f"✅ Marked '{matched_task.title}' as completed.",
                "action": "completed"
            }


    # ==========================================
    # DELETE TASK THROUGH AI
    # ==========================================

    delete_keywords = [
        "delete",
        "remove"
    ]

    if any(keyword in message_lower for keyword in delete_keywords):

        matched_task = None

        for task in tasks:
            task_title_lower = task.title.lower()

            if task_title_lower in message_lower:
                matched_task = task
                break

        if matched_task:

            tasks.remove(matched_task)

            return {
                "response": f"🗑️ Deleted '{matched_task.title}'.",
                "action": "deleted"
            }


    # ==========================================
    # NORMAL AI CHAT
    # ==========================================

    task_context = ""

    if tasks:

        task_context = "\n\nCurrent user tasks:\n"

        for task in tasks:

            status = (
                "Completed"
                if task.completed
                else "Pending"
            )

            task_context += (
                f"- {task.title} ({status})\n"
            )

    enhanced_message = f"""
You are Nexa AI, an intelligent productivity assistant.

The user's current tasks are provided below.

Use them when answering questions about:
- productivity
- planning
- prioritization
- task management
- daily planning

{task_context}

User message:
{user_message}

Give a helpful, concise and practical response.
"""

    response = ask_nexa(enhanced_message)

    return {
        "response": response,
        "action": None
    }
from typing import List


class Task(BaseModel):
    id: int
    title: str
    completed: bool = False


class TaskCreate(BaseModel):
    title: str

tasks: List[Task] = []


@app.get("/tasks")
def get_tasks():
    return tasks


@app.post("/tasks")
def create_task(task: TaskCreate):
    new_id = max((item.id for item in tasks), default=0) + 1

    new_task = Task(
        id=new_id,
        title=task.title,
        completed=False
    )

    tasks.append(new_task)

    return new_task

@app.patch("/tasks/{task_id}")
def update_task(task_id: int):

    for task in tasks:
        if task.id == task_id:
            task.completed = not task.completed
            return task

    return {"error": "Task not found"}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):

    for task in tasks:
        if task.id == task_id:
            tasks.remove(task)
            return {"message": "Task deleted"}

    return {"error": "Task not found"}