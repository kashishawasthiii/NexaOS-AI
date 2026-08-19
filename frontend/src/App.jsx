import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // =========================
  // GET TASKS
  // =========================
  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`);

      if (!response.ok) {
        throw new Error("Unable to load tasks");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Load tasks error:", error);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // =========================
  // ADD TASK
  // =========================
  // =========================
// ADD TASK
// =========================
const addTask = async () => {
  const taskTitles = title
    .split(/\r?\n/)
    .map((task) => task.trim())
    .filter((task) => task.length > 0);

  if (taskTitles.length === 0) {
    return;
  }

  setLoading(true);

  try {
    for (const taskTitle of taskTitles) {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: taskTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create task");
      }
    }

    setTitle("");
    await loadTasks();
  } catch (error) {
    console.error("Add task error:", error);
  } finally {
    setLoading(false);
  }
};

  
  // =========================
  // COMPLETE / UNCOMPLETE
  // =========================
  const toggleTask = async (task) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update task");
      }

      await loadTasks();
    } catch (error) {
      console.error("Update task error:", error);
    }
  };

  // =========================
  // DELETE TASK
  // =========================
  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete task");
      }

      await loadTasks();
    } catch (error) {
      console.error("Delete task error:", error);
    }
  };
  // =========================
// AI CHAT
// =========================
const sendChat = async (customMessage = chatMessage) => {
  const message = customMessage.trim();

  if (!message) {
    return;
  }

  setChatLoading(true);

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to get AI response");
    }

    const data = await response.json();

    setChatResponse(
  data.response || "No response received from Nexa AI."
);
setChatMessage("");
  } catch (error) {
    console.error("AI chat error:", error);
    setChatResponse(
      "Sorry, Nexa AI is currently unavailable. Please try again."
    );
  } finally {
    setChatLoading(false);
  }
};
  // =========================
// AI ASSISTANT
// =========================
const askAI = async (message = aiMessage) => {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    return;
  }

  setAiLoading(true);

  try {
    

    const response = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: cleanMessage,
        tasks: tasks,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to contact Nexa AI");
    }

    const data = await response.json();

if (data.action) {
  await loadTasks();
}

setChatMessages((previousMessages) => [
  ...previousMessages,
  {
    role: "user",
    content: cleanMessage,
  },
  {
    role: "assistant",
    content:
      data.response || "No response received from Nexa AI.",
  },
]);

setAiMessage("");
  } catch (error) {
    console.error("AI error:", error);

    setChatResponse(
  "Sorry, Nexa AI is currently unavailable. Please try again."
);
  } finally {
    setAiLoading(false);
  }
};
  // =========================
  // STATISTICS
  // =========================
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  return (
    <div className="app">

      {/* ================= HEADER ================= */}
      <header className="hero">

        <div className="hero-content">

          <div className="brand">
            NexaOS AI
          </div>

          <h1>
            Your AI Productivity
            <br />
            Workspace
          </h1>

          <p>
            Manage tasks and interact with your AI-powered
            productivity assistant.
          </p>

        </div>

        {/* ================= QUICK ACTIONS ================= */}

        <aside className="quick-panel">

          <h2>Quick Actions</h2>

          <button
            className="quick-button"
            onClick={() => {
              document
                .getElementById("task-input")
                ?.focus();
            }}
          >
            <span>▥</span>
            Build NexaOS dashboard
          </button>

          <button
            className="add-button"
            onClick={() => {
              document
                .getElementById("task-input")
                ?.focus();
            }}
          >
            <span>＋</span>
            Add Task
          </button>

          <div className="divider"></div>

          <h3>Summary</h3>

          <div className="summary-box blue">
            <strong>{totalTasks}</strong>
            <span>Total Tasks</span>
          </div>

          <div className="summary-box green">
            <strong>{completedTasks}</strong>
            <span>Completed</span>
          </div>

          <div className="summary-box yellow">
            <strong>{pendingTasks}</strong>
            <span>Pending</span>
          </div>

          <div className="tip-box">
            <h3>💡 Productivity Tip</h3>

            <p>
              Break down large tasks into smaller,
              manageable steps for better productivity!
            </p>
          </div>

        </aside>

      </header>

      {/* ================= MAIN DASHBOARD ================= */}

      <main className="dashboard">

        <section className="task-card">

          <div className="task-header">

            <div>
              <h2>
                📋 Task Manager
              </h2>

              <p>
                Create and manage your tasks
              </p>
            </div>

            <div className="task-badge">
              {totalTasks}{" "}
              {totalTasks === 1 ? "Task" : "Tasks"}
            </div>

          </div>

          {/* ================= INPUT ================= */}

          <div className="task-input-area">

            <textarea
  id="task-input"
  placeholder={"Enter a new task...\nYou can paste multiple tasks, one per line."}
  value={title}
  onChange={(event) => setTitle(event.target.value)}
  rows={3}
/>

            <button
              className="add-task-button"
              onClick={addTask}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Task"}
            </button>

          </div>

          {/* ================= TASK LIST ================= */}

          <div className="task-list">

            {tasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📝
                </div>

                <h3>No tasks yet</h3>

                <p>
                  Create your first task above.
                </p>

              </div>

            ) : (

              tasks.map((task) => (

                <div
                  className={`task-row ${
                    task.completed
                      ? "task-completed"
                      : ""
                  }`}
                  key={task.id}
                >

                  <div className="task-info">

                    <input
                      type="checkbox"
                      checked={Boolean(task.completed)}
                      onChange={() =>
                        toggleTask(task)
                      }
                    />

                    <span>
                      {task.title}
                    </span>

                  </div>

                  <div className="task-actions">

                    <button
                      className="complete-button"
                      onClick={() =>
                        toggleTask(task)
                      }
                    >
                      {task.completed
                        ? "↩ Undo"
                        : "✓ Complete"}
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        deleteTask(task.id)
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        </section>

      </main>
                  {/* ================= AI ASSISTANT ================= */}

      <section className="ai-section">

        <div className="ai-card">

          <div className="ai-header">
            <div>
              <div className="ai-title">
                🤖 Nexa AI Assistant
              </div>

              <p>
                Ask Nexa AI about your tasks, productivity, planning and more.
              </p>
            </div>

            <div className="ai-status">
              ● AI Online
            </div>
          </div>

          <div className="ai-chat-box">

            <div className="ai-welcome">
              <div className="ai-icon">
                ✨
              </div>

              <div className="ai-response">
  {chatMessages.length === 0 ? (
    <>
      <h3>How can I help you?</h3>
      <p>
        Ask me to plan your day, organize your tasks,
        improve productivity or answer a question.
      </p>
    </>
  ) : (
    <div className="chat-history">
      {chatMessages.map((message, index) => (
        <div
          key={index}
          className={`chat-message ${message.role}`}
        >
          <strong>
            {message.role === "user" ? "You" : "Nexa AI"}
          </strong>

          <p>{message.content}</p>
        </div>
      ))}

      {aiLoading && (
        <div className="chat-message assistant">
          <strong>Nexa AI</strong>
          <p>Thinking...</p>
        </div>
      )}
    </div>
  )}
</div>
            </div>

            {chatResponse && (
              <div className="ai-response">
                <div className="response-label">
                  🤖 Nexa AI
                </div>

                <p>
                  {chatResponse}
                </p>
              </div>
            )}

          </div>

          <div className="ai-input-area">

            <input
  type="text"
  placeholder="Ask Nexa AI something..."
  value={aiMessage}
  onChange={(event) => setAiMessage(event.target.value)}
  onKeyDown={(event) => {
    if (event.key === "Enter") {
      askAI();
    }
  }}
/>

            <button
  onClick={() => askAI()}
  disabled={aiLoading}
>
  {aiLoading ? "Thinking..." : "Send ✨"}
</button>

          </div>

          <div className="ai-suggestions">

            <button onClick={() => askAI("Plan my day based on my current tasks.")}>
  📋 Plan my day
            </button>

            <button
  onClick={() =>
    askAI("Give me practical ways to improve my productivity.")
  }
>
  ⚡ Improve productivity
</button>

            <button
  onClick={() =>
    askAI("Help me prioritize my current tasks.")
  }
>
  🎯 Prioritize tasks
</button>

          </div>

        </div>

      </section>
      {/* ================= FOOTER ================= */}

      <footer>
        © 2026 NexaOS AI. All rights reserved.
      </footer>

    </div>
  );
}

export default App;