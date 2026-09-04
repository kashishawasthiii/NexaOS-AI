# NexaOS AI 🚀

> AI-powered productivity workspace for task management, planning, prioritization, and intelligent productivity assistance.

NexaOS AI is a full-stack productivity workspace that combines a modern React frontend, FastAPI backend, and Groq-powered AI capabilities to help users organize tasks, manage priorities, track productivity, and interact with an AI assistant through natural language.

---

## ✨ Features

### 📋 Task Management

- Create and manage tasks
- Add multiple tasks
- Mark tasks as completed
- Undo completed tasks
- Delete tasks
- View pending and completed tasks
- Search tasks
- Filter tasks by priority, category, and status
- Sort tasks
- Track task statistics
- Visualize task workload and completion progress

### 🤖 Nexa AI Assistant

Nexa AI provides natural-language productivity assistance directly inside the workspace.

- Ask productivity-related questions
- Get task-management assistance
- Prioritize tasks
- Organize daily tasks
- Generate productivity recommendations
- Plan daily work
- Summarize workload
- Get assistance with task-related operations

### ⚡ AI-Powered Task Operations

Nexa AI can assist with task operations through natural-language interaction:

- ➕ Add tasks
- ✅ Complete tasks
- ↩️ Undo completed tasks
- 🗑️ Delete tasks
- 🎯 Prioritize tasks
- 📋 Organize tasks
- 🧠 Provide productivity suggestions

### 📊 Productivity Dashboard

The dashboard provides a centralized overview of the user's productivity workspace.

- Total task count
- Completed task count
- Pending task count
- Overdue task count
- Completion percentage
- High-priority task overview
- Focus task recommendation
- Remaining workload
- Workload summary
- Task distribution by category
- Upcoming deadlines
- Integrated task management
- Integrated Nexa AI Assistant

### 📅 Task Calendar

NexaOS includes a compact calendar interface for working with task dates and deadlines.

- Calendar-based date selection
- View task-related dates
- Select dates through a compact calendar interface
- Quickly open and close the calendar
- Integrated with task management workflow

### 🔎 Task Search & Filtering

The Task Manager provides controls to quickly find and organize tasks.

- Search tasks by title/content
- Filter by priority
- Filter by category
- Filter by status
- Sort tasks
- View task metadata such as priority, category, duration, and deadline

### 📱 Responsive Productivity Interface

- Modern dark-themed interface
- Productivity-focused dashboard
- Responsive layout
- Interactive task controls
- Compact calendar interaction
- Integrated AI assistant
- Clear visual task statistics
- Consistent UI across the workspace

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Fetch API

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn
- SQLite

### Artificial Intelligence

- Groq API
- OpenAI GPT-OSS 120B

### Development Tools

- Visual Studio Code
- Git
- GitHub

---

## 🏗️ System Architecture

NexaOS AI follows a full-stack architecture consisting of three primary layers:

```text
┌──────────────────────────────┐
│        React Frontend        │
│                              │
│ Dashboard                    │
│ Task Management              │
│ Calendar                     │
│ Nexa AI Assistant            │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       FastAPI Backend        │
│                              │
│ Task Operations              │
│ Data Validation              │
│ API Endpoints                │
│ AI Service Integration       │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌─────────────┐ ┌─────────────┐
│   SQLite    │ │   Groq API  │
│  Database   │ │   AI Model  │
└─────────────┘ └─────────────┘