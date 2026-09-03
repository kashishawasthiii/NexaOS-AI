import os
import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

try:
    import bcrypt
except ImportError:
    bcrypt = None
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Task
from ai_service import ask_nexa

# ============================================================
# NEXAOS AI — MAIN BACKEND
# Task CRUD + authentication + per-user task isolation
# ============================================================

app = FastAPI(
    title="NexaOS AI",
    description="AI-powered productivity workspace",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Database
# ------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------
# Simple signed session token
# Uses only Python standard library; no extra JWT package needed.
# ------------------------------------------------------------

TOKEN_SECRET = os.getenv("NEXAOS_TOKEN_SECRET", "nexaos-local-secret-change-me")
TOKEN_TTL_HOURS = 72


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user_id: int) -> str:
    payload = {
        "sub": int(user_id),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
    }
    raw = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(
        TOKEN_SECRET.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{raw}.{signature}"


def decode_token(token: str) -> int:
    try:
        raw, signature = token.split(".", 1)
        expected = hmac.new(
            TOKEN_SECRET.encode(),
            raw.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")

        payload = json.loads(_unb64(raw).decode())

        if int(payload["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("expired")

        return int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")


# ------------------------------------------------------------
# Password hashing
# ------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        200_000,
    )
    return f"pbkdf2_sha256$200000${_b64(salt)}${_b64(derived)}"


def verify_password(password: str, stored: str) -> bool:
    if stored and stored.startswith("pbkdf2_sha256$"):
        try:
            scheme, rounds, salt_b64, hash_b64 = stored.split("$")
            salt = _unb64(salt_b64)
            expected = _unb64(hash_b64)
            actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False

    # Keep accounts created by the earlier bcrypt implementation working.
    if stored and stored.startswith(("$2a$", "$2b$", "$2y$")) and bcrypt is not None:
        try:
            return bool(bcrypt.checkpw(password.encode(), stored.encode()))
        except Exception:
            return False

    return False


# ------------------------------------------------------------
# Schemas
# ------------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=6, max_length=200)


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(min_length=6, max_length=200)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    priority: str = "Medium"
    category: str = "Other"
    due_date: Optional[str] = None
    estimated_minutes: int = Field(default=30, ge=1, le=1440)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    completed: Optional[bool] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

VALID_PRIORITIES = {"Low", "Medium", "High"}
VALID_CATEGORIES = {"Development", "Study", "Personal", "Work", "Other"}


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1].strip()
    user_id = decode_token(token)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")

    return user


def task_dict(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "completed": bool(task.completed),
        "priority": task.priority or "Medium",
        "category": task.category or "Other",
        "due_date": task.due_date,
        "estimated_minutes": int(task.estimated_minutes or 30),
    }


def validate_task_values(priority: Optional[str], category: Optional[str]):
    if priority is not None and priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=422,
            detail=f"Priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}.",
        )

    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail=f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}.",
        )


# ============================================================
# ROOT / HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "message": "NexaOS AI Backend is running 🚀",
        "version": "3.0.0",
        "status": "success",
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.query(User).limit(1).all()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable.")


# ============================================================
# AUTH
# ============================================================

@app.post("/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    username = data.username.strip()
    email = data.email.strip().lower()

    if not username or not email:
        raise HTTPException(status_code=422, detail="Username and email are required.")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "token": create_token(user.id),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "token": create_token(user.id),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    # Local-project recovery flow. Production deployment should use a
    # time-limited email verification token before allowing this change.
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successfully.", "email": user.email}


@app.get("/auth/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
    }


# ============================================================
# TASK CRUD
# ============================================================

@app.get("/tasks")
def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.id.asc())
        .all()
    )
    return [task_dict(task) for task in tasks]


@app.post("/tasks")
def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Task title cannot be empty.")

    validate_task_values(data.priority, data.category)

    task = Task(
        title=title,
        priority=data.priority,
        category=data.category,
        due_date=data.due_date or None,
        estimated_minutes=data.estimated_minutes,
        completed=False,
        user_id=current_user.id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task_dict(task)


@app.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    validate_task_values(data.priority, data.category)

    changes = data.model_dump(exclude_unset=True)

    if "title" in changes:
        title = (changes["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=422, detail="Task title cannot be empty.")
        task.title = title

    if "priority" in changes and changes["priority"] is not None:
        task.priority = changes["priority"]

    if "category" in changes and changes["category"] is not None:
        task.category = changes["category"]

    if "due_date" in changes:
        task.due_date = changes["due_date"] or None

    if "estimated_minutes" in changes and changes["estimated_minutes"] is not None:
        task.estimated_minutes = int(changes["estimated_minutes"])

    if "completed" in changes and changes["completed"] is not None:
        task.completed = bool(changes["completed"])

    db.commit()
    db.refresh(task)

    return task_dict(task)


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    db.delete(task)
    db.commit()

    return {
        "message": "Task deleted successfully.",
        "id": task_id,
    }



# ============================================================
# PRODUCTIVITY ANALYTICS
# ============================================================

def _parse_due_date(value):
    """Parse NexaOS's supported due-date formats into a date."""
    if not value:
        return None

    value = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


@app.get("/analytics")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return live productivity analytics for the authenticated user.

    This endpoint is read-only:
    - It does not create, update, or delete tasks.
    - It uses the existing Task schema, so no database migration is required.
    """
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.id.asc())
        .all()
    )

    today = datetime.now().date()

    total = len(tasks)
    completed = sum(1 for task in tasks if bool(task.completed))
    pending = total - completed

    overdue = 0
    due_today = 0
    due_tomorrow = 0
    due_this_week = 0

    total_estimated_minutes = 0
    pending_estimated_minutes = 0
    completed_estimated_minutes = 0

    by_priority = {"High": 0, "Medium": 0, "Low": 0}
    by_category = {}

    for task in tasks:
        minutes = int(task.estimated_minutes or 30)
        total_estimated_minutes += minutes

        if task.completed:
            completed_estimated_minutes += minutes
        else:
            pending_estimated_minutes += minutes

        priority = task.priority if task.priority in VALID_PRIORITIES else "Medium"
        by_priority[priority] += 1

        category = task.category if task.category in VALID_CATEGORIES else "Other"
        by_category[category] = by_category.get(category, 0) + 1

        due = _parse_due_date(task.due_date)

        if due and not task.completed:
            delta = (due - today).days

            if delta < 0:
                overdue += 1
            elif delta == 0:
                due_today += 1
                due_this_week += 1
            elif delta == 1:
                due_tomorrow += 1
                due_this_week += 1
            elif 0 < delta <= 7:
                due_this_week += 1

    completion_rate = round((completed / total) * 100, 2) if total else 0.0

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "overdue_tasks": overdue,
        "due_today": due_today,
        "due_tomorrow": due_tomorrow,
        "due_this_week": due_this_week,
        "completion_rate": completion_rate,
        "total_estimated_minutes": total_estimated_minutes,
        "pending_estimated_minutes": pending_estimated_minutes,
        "completed_estimated_minutes": completed_estimated_minutes,
        "by_priority": by_priority,
        "by_category": by_category,
    }


# ============================================================
# AI ASSISTANT
# ============================================================

@app.post("/ai/chat")
def ai_chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = data.message.strip()

    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.id.asc())
        .all()
    )

    # --------------------------------------------------------
    # Lightweight deterministic task actions.
    # This guarantees that AI task actions modify the database
    # only after a real matching task has been identified.
    # --------------------------------------------------------

    lower = message.lower()

    # CREATE: "add/create a task called ..."
    create_words = ("add task", "add a task", "create task", "create a task", "new task")
    if any(word in lower for word in create_words):
        title = None

        for marker in ("called", "named", "to do"):
            if marker in lower:
                title = message.split(marker, 1)[1].strip()
                break

        if not title:
            for word in create_words:
                if word in lower:
                    title = message.split(word, 1)[1].strip()
                    break

        if title:
            priority = "Medium"
            category = "Other"

            if "high priority" in lower:
                priority = "High"
            elif "low priority" in lower:
                priority = "Low"

            for category_name in VALID_CATEGORIES:
                if category_name.lower() in lower:
                    category = category_name
                    break

            task = Task(
                title=title,
                priority=priority,
                category=category,
                due_date=None,
                estimated_minutes=30,
                completed=False,
                user_id=current_user.id,
            )
            db.add(task)
            db.commit()
            db.refresh(task)

            return {
                "response": f"Added “{task.title}”.",
                "action": "added",
                "task": task_dict(task),
            }

    # COMPLETE
    if any(word in lower for word in ("complete ", "finish ", "mark ", "done with ")):
        for task in tasks:
            if task.title.lower() in lower:
                task.completed = True
                db.commit()
                db.refresh(task)
                return {
                    "response": f"Marked “{task.title}” as completed.",
                    "action": "completed",
                    "task": task_dict(task),
                }

    # DELETE
    if any(word in lower for word in ("delete ", "remove ")):
        for task in tasks:
            if task.title.lower() in lower:
                db.delete(task)
                db.commit()
                return {
                    "response": f"Deleted “{task.title}”.",
                    "action": "deleted",
                    "task": None,
                }

    # NORMAL AI CHAT
    context_lines = []
    for task in tasks:
        status = "Completed" if task.completed else "Pending"
        context_lines.append(
            f"- {task.title} | {status} | {task.priority or 'Medium'} priority | "
            f"{task.category or 'Other'} | {task.estimated_minutes or 30} min | "
            f"due {task.due_date or 'none'}"
        )

    task_context = "\n".join(context_lines) if context_lines else "No tasks yet."

    prompt = f"""
You are Nexa AI, the productivity assistant inside NexaOS.

User's current tasks:
{task_context}

User message:
{message}

Give a concise, practical response. If discussing tasks, use only the task
information provided above. Do not claim that a database action happened
unless the backend has returned an action.
"""

    try:
        response = ask_nexa(prompt)
    except Exception as exc:
        print("AI CHAT ERROR:", exc)
        raise HTTPException(
            status_code=503,
            detail="Nexa AI is temporarily unavailable.",
        )

    return {
        "response": response,
        "action": None,
    }
