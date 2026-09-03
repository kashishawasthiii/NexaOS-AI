import os
import json
from datetime import date, datetime

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def ask_nexa(prompt: str) -> str:
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": """You are Nexa AI, an intelligent productivity assistant.
Help users with task management, planning, productivity, learning, coding,
research, writing and summarization.

Be concise and practical. Never claim a database action happened unless
the application actually performed it. Never fabricate task IDs or task data."""
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
        max_tokens=1000
    )
    return response.choices[0].message.content


def analyze_task_action(user_message: str, tasks: list) -> dict:
    task_context = json.dumps(tasks, ensure_ascii=False)

    system_prompt = """You are Nexa AI's task-action parser.

Possible actions: create, complete, delete, update, none.

Return ONLY valid JSON:
{
  "action": "create | complete | delete | update | none",
  "task_id": null,
  "title": null,
  "priority": null,
  "category": null,
  "due_date": null,
  "estimated_minutes": null,
  "response": "short helpful response"
}

Rules:
1. Never invent a task_id.
2. For complete/delete/update, choose task_id ONLY from AVAILABLE TASKS.
3. For create, extract only details actually provided.
4. Priority: High, Medium, Low, or null.
5. Category: Study, Development, Personal, Work, Other, or null.
6. Convert hours to minutes.
7. For update, return only fields the user wants changed.
8. General questions/advice return action = none.
9. Keep response concise.

AVAILABLE TASKS:
""" + task_context

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return {
            "action": result.get("action", "none"),
            "task_id": result.get("task_id"),
            "title": result.get("title"),
            "priority": result.get("priority"),
            "category": result.get("category"),
            "due_date": result.get("due_date"),
            "estimated_minutes": result.get("estimated_minutes"),
            "response": result.get(
                "response",
                "I couldn't determine the requested task action."
            )
        }

    except Exception as e:
        print("AI ACTION ERROR:", e)
        return {
            "action": "none",
            "task_id": None,
            "title": None,
            "priority": None,
            "category": None,
            "due_date": None,
            "estimated_minutes": None,
            "response": "I couldn't process that task action."
        }


def generate_productivity_insights(tasks: list) -> dict:
    """Generate AI productivity insights from the supplied user's tasks."""

    safe_tasks = []

    for task in tasks:
        if isinstance(task, dict):
            safe_tasks.append({
                "id": task.get("id"),
                "title": task.get("title"),
                "completed": bool(task.get("completed", False)),
                "priority": task.get("priority") or "Medium",
                "category": task.get("category") or "Other",
                "due_date": task.get("due_date"),
                "estimated_minutes": task.get("estimated_minutes") or 0,
            })

    total = len(safe_tasks)
    completed = sum(1 for t in safe_tasks if t["completed"])
    pending = [t for t in safe_tasks if not t["completed"]]
    completion_rate = round((completed / total) * 100) if total else 0

    today = date.today()
    overdue = []
    due_today = []

    for task in pending:
        raw_date = task.get("due_date")
        if not raw_date:
            continue

        try:
            due = datetime.fromisoformat(
                str(raw_date).replace("Z", "+00:00")
            ).date()

            if due < today:
                overdue.append(task)
            elif due == today:
                due_today.append(task)
        except (ValueError, TypeError):
            continue

    high_priority = [
        t for t in pending
        if str(t.get("priority", "")).lower() == "high"
    ]

    pending_minutes = sum(
        int(t.get("estimated_minutes") or 0) for t in pending
    )

    context = {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": len(pending),
        "completion_rate": completion_rate,
        "overdue_tasks": overdue,
        "due_today_tasks": due_today,
        "high_priority_tasks": high_priority,
        "estimated_pending_minutes": pending_minutes,
        "all_pending_tasks": pending,
    }

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": """You are Nexa AI's productivity analyst.

Analyze ONLY the supplied task data.

Return ONLY valid JSON:
{
  "summary": "one short overall observation",
  "focus": "one specific task or action to focus on next",
  "warning": "one important warning or empty string",
  "recommendation": "one practical recommendation",
  "score": 0
}

Never invent tasks, deadlines, numbers or facts.
Score must be an integer from 0 to 100.
Keep all text concise."""
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        context, ensure_ascii=False, default=str
                    )
                }
            ],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        try:
            score = int(result.get("score", 0))
        except (TypeError, ValueError):
            score = 0

        score = max(0, min(100, score))

        return {
            "summary": result.get(
                "summary",
                "Keep working through your current tasks."
            ),
            "focus": result.get(
                "focus",
                "Choose the highest-priority pending task."
            ),
            "warning": result.get("warning", ""),
            "recommendation": result.get(
                "recommendation",
                "Work on one important task at a time."
            ),
            "score": score,
            "stats": {
                "total_tasks": total,
                "completed_tasks": completed,
                "pending_tasks": len(pending),
                "completion_rate": completion_rate,
                "overdue_tasks": len(overdue),
                "due_today_tasks": len(due_today),
                "high_priority_tasks": len(high_priority),
                "estimated_pending_minutes": pending_minutes,
            }
        }

    except Exception as e:
        print("PRODUCTIVITY INSIGHTS ERROR:", e)

        if not safe_tasks:
            summary = "You have no tasks yet."
            focus = "Add your first task to start building your workspace."
            warning = ""
            recommendation = "Start with one clear, manageable task."
            score = 0
        else:
            summary = (
                f"You have {len(pending)} pending task"
                f"{'' if len(pending) == 1 else 's'} "
                f"with a {completion_rate}% completion rate."
            )

            if overdue:
                focus = overdue[0]["title"]
                warning = (
                    f"You have {len(overdue)} overdue task"
                    f"{'' if len(overdue) == 1 else 's'}."
                )
            elif high_priority:
                focus = high_priority[0]["title"]
                warning = ""
            elif pending:
                focus = pending[0]["title"]
                warning = ""
            else:
                focus = "All tasks are complete."
                warning = ""

            recommendation = (
                "Focus on one high-impact task before moving to the next."
            )
            score = max(
                0,
                min(100, round(
                    completion_rate * 0.7 + (30 if not overdue else 0)
                ))
            )

        return {
            "summary": summary,
            "focus": focus,
            "warning": warning,
            "recommendation": recommendation,
            "score": score,
            "stats": {
                "total_tasks": total,
                "completed_tasks": completed,
                "pending_tasks": len(pending),
                "completion_rate": completion_rate,
                "overdue_tasks": len(overdue),
                "due_today_tasks": len(due_today),
                "high_priority_tasks": len(high_priority),
                "estimated_pending_minutes": pending_minutes,
            }
        }
