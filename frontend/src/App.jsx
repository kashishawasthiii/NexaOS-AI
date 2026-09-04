import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Development", "Study", "Personal", "Work", "Other"];
const TIMES = [15, 30, 45, 60, 90, 120, 180];

function safeJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function EyeButton({ visible, onClick }) {
  return (
    <button
      type="button"
      className="eye-button"
      onClick={onClick}
      aria-label={visible ? "Hide password" : "Show password"}
      title={visible ? "Hide password" : "Show password"}
    >
      {visible ? "◉" : "◌"}
    </button>
  );
}

function App() {
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("nexaos_token") || ""
  );
  const [currentUser, setCurrentUser] = useState(
    () => safeJson("nexaos_user", null)
  );

  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState(
    () => localStorage.getItem("nexaos_saved_email") || ""
  );
  const [authPassword, setAuthPassword] = useState(
    () => localStorage.getItem("nexaos_saved_password") || ""
  );
  const [rememberPassword, setRememberPassword] = useState(
    () => localStorage.getItem("nexaos_remember") === "true"
  );
  const [showPassword, setShowPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState(
    () => localStorage.getItem("nexaos_saved_email") || ""
  );
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("Development");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Default");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState("");

  const authHeaders = (json = false) => {
    const headers = {};
    if (json) headers["Content-Type"] = "application/json";
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    return headers;
  };

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__nexaToastTimer);
    window.__nexaToastTimer = window.setTimeout(() => setToast(""), 2600);
  };

  const parseResponse = async (response) => {
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }
    if (!response.ok) {
      throw new Error(data?.detail || `Request failed (${response.status})`);
    }
    return data;
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const email = authEmail.trim().toLowerCase();

    if (!email || !authPassword) {
      setAuthError("Please enter your email and password.");
      return;
    }

    if (authMode === "register" && !authUsername.trim()) {
      setAuthError("Please enter a username.");
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "login"
          ? `${API_URL}/auth/login`
          : `${API_URL}/auth/register`;

      const body =
        authMode === "login"
          ? { email, password: authPassword }
          : {
              username: authUsername.trim(),
              email,
              password: authPassword,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await parseResponse(response);

      if (!data?.token) {
        throw new Error("Authentication succeeded but no session token was returned.");
      }

      localStorage.setItem("nexaos_token", data.token);
      localStorage.setItem(
        "nexaos_user",
        JSON.stringify(data.user || { email })
      );

      if (rememberPassword) {
        localStorage.setItem("nexaos_saved_email", email);
        localStorage.setItem("nexaos_saved_password", authPassword);
        localStorage.setItem("nexaos_remember", "true");
      } else {
        localStorage.removeItem("nexaos_saved_password");
        localStorage.setItem("nexaos_saved_email", email);
        localStorage.setItem("nexaos_remember", "false");
      }

      setAuthToken(data.token);
      setCurrentUser(data.user || { email });
      setAuthPassword("");
      setAuthError("");
      setAuthSuccess("");
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRememberChange = (checked) => {
    setRememberPassword(checked);
    localStorage.setItem("nexaos_remember", String(checked));

    if (!checked) {
      localStorage.removeItem("nexaos_saved_password");
    } else if (authEmail && authPassword) {
      localStorage.setItem("nexaos_saved_email", authEmail.trim().toLowerCase());
      localStorage.setItem("nexaos_saved_password", authPassword);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const email = resetEmail.trim().toLowerCase();

    if (!email || !resetPassword || !resetConfirm) {
      setAuthError("Enter your email and both password fields.");
      return;
    }

    if (resetPassword.length < 6) {
      setAuthError("New password must contain at least 6 characters.");
      return;
    }

    if (resetPassword !== resetConfirm) {
      setAuthError("New password and confirmation do not match.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          new_password: resetPassword,
        }),
      });

      const data = await parseResponse(response);

      setAuthSuccess(data?.message || "Password reset successfully. You can log in now.");
      setAuthMode("login");
      setAuthEmail(email);
      setAuthPassword("");
      setResetPassword("");
      setResetConfirm("");
    } catch (error) {
      console.error("Password reset error:", error);
      setAuthError(
        error.message ||
          "Password reset failed. Make sure the backend reset-password endpoint is running."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("nexaos_token");
    localStorage.removeItem("nexaos_user");
    setAuthToken("");
    setCurrentUser(null);
    setTasks([]);
    setChatMessages([]);
  };

  const loadTasks = async () => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await parseResponse(response);
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      notify("Could not load your tasks.");
    }
  };

  useEffect(() => {
    if (authToken) loadTasks();
  }, [authToken]);

  const resetTaskForm = () => {
    setTitle("");
    setPriority("Medium");
    setCategory("Development");
    setDueDate("");
    setEstimatedMinutes(30);
    setEditingTaskId(null);
  };

  const addTask = async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      notify("Give your task a title first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: cleanTitle,
          priority,
          category,
          due_date: dueDate || null,
          estimated_minutes: Number(estimatedMinutes),
        }),
      });

      await parseResponse(response);
      await loadTasks();
      resetTaskForm();
      notify("Task added successfully.");
    } catch (error) {
      console.error("Add task error:", error);
      notify(error.message || "Task could not be added.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ completed: !task.completed }),
      });

      const updated = await parseResponse(response);
      setTasks((items) =>
        items.map((item) => (item.id === updated.id ? updated : item))
      );
      notify(updated.completed ? "Task completed." : "Task reopened.");
    } catch (error) {
      console.error("Toggle task error:", error);
      notify("Could not update the task.");
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task permanently?")) return;

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      await parseResponse(response);
      setTasks((items) => items.filter((task) => task.id !== taskId));
      notify("Task deleted.");
    } catch (error) {
      console.error("Delete task error:", error);
      notify(error.message || "Could not delete the task.");
    }
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title || "");
    setPriority(task.priority || "Medium");
    setCategory(task.category || "Other");

    const rawDate = task.due_date;
    if (rawDate && rawDate !== "string") {
      const parsed = new Date(rawDate);
      setDueDate(
        Number.isNaN(parsed.getTime())
          ? String(rawDate).slice(0, 10)
          : parsed.toISOString().slice(0, 10)
      );
    } else {
      setDueDate("");
    }

    setEstimatedMinutes(Number(task.estimated_minutes || 30));
    document
      .getElementById("task-composer")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const updateTask = async () => {
    if (!editingTaskId || !title.trim()) {
      notify("Give your task a title first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: title.trim(),
          priority,
          category,
          due_date: dueDate || null,
          estimated_minutes: Number(estimatedMinutes),
        }),
      });

      const updated = await parseResponse(response);

      setTasks((items) =>
        items.map((item) => (item.id === updated.id ? updated : item))
      );

      resetTaskForm();
      notify("Task updated.");
    } catch (error) {
      console.error("Update task error:", error);
      notify(error.message || "Task could not be updated.");
    } finally {
      setLoading(false);
    }
  };

  const dateInfo = (value) => {
    if (!value || value === "string") {
      return { label: "No deadline", state: "none", days: null };
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { label: String(value), state: "none", days: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const days = Math.round((target - today) / 86400000);

    if (days < 0) {
      return {
        label: `Overdue · ${target.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        state: "overdue",
        days,
      };
    }

    if (days === 0) return { label: "Due today", state: "today", days };
    if (days === 1) return { label: "Due tomorrow", state: "tomorrow", days };
    if (days <= 7) return { label: `Due in ${days} days`, state: "soon", days };

    return {
      label: target.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      state: "future",
      days,
    };
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = tasks.filter((task) => {
      const searchable = [
        task.title,
        task.category,
        task.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesPriority =
        filterPriority === "All" ||
        String(task.priority || "Medium").toLowerCase() ===
          filterPriority.toLowerCase();
      const matchesCategory =
        filterCategory === "All" ||
        String(task.category || "Other") === filterCategory;
      const matchesStatus =
        filterStatus === "All" ||
        (filterStatus === "Completed"
          ? Boolean(task.completed)
          : !Boolean(task.completed));

      return (
        matchesSearch &&
        matchesPriority &&
        matchesCategory &&
        matchesStatus
      );
    });

    const priorityRank = { High: 1, Medium: 2, Low: 3 };

    return [...result].sort((a, b) => {
      if (sortBy === "Priority") {
        return (
          (priorityRank[a.priority] || 2) -
          (priorityRank[b.priority] || 2)
        );
      }

      if (sortBy === "DueDate") {
        const ad = dateInfo(a.due_date).days ?? 99999;
        const bd = dateInfo(b.due_date).days ?? 99999;
        return ad - bd;
      }

      if (sortBy === "Time") {
        return (
          Number(a.estimated_minutes || 0) -
          Number(b.estimated_minutes || 0)
        );
      }

      if (sortBy === "Newest") {
        return Number(b.id || 0) - Number(a.id || 0);
      }

      return Number(a.id || 0) - Number(b.id || 0);
    });
  }, [
    tasks,
    searchQuery,
    filterPriority,
    filterCategory,
    filterStatus,
    sortBy,
  ]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => Boolean(task.completed)).length;
    const pending = tasks.filter((task) => !task.completed);
    const overdue = pending.filter(
      (task) => dateInfo(task.due_date).state === "overdue"
    );
    const high = pending.filter(
      (task) =>
        String(task.priority || "Medium").toLowerCase() === "high"
    );
    const minutes = pending.reduce(
      (sum, task) => sum + Number(task.estimated_minutes || 0),
      0
    );

    const focus = [...pending].sort((a, b) => {
      const stateRank = {
        overdue: 0,
        today: 1,
        tomorrow: 2,
        soon: 3,
        future: 4,
        none: 5,
      };
      const priorityRank = { High: 0, Medium: 1, Low: 2 };

      const ad = dateInfo(a.due_date);
      const bd = dateInfo(b.due_date);

      return (
        stateRank[ad.state] - stateRank[bd.state] ||
        (priorityRank[a.priority] ?? 1) -
          (priorityRank[b.priority] ?? 1) ||
        (ad.days ?? 99999) - (bd.days ?? 99999)
      );
    })[0];

    return {
      total: tasks.length,
      completed,
      pending: pending.length,
      overdue: overdue.length,
      high: high.length,
      minutes,
      rate: tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0,
      focus,
    };
  }, [tasks]);

  const categoryData = useMemo(
    () =>
      CATEGORIES.map((name) => ({
        name,
        count: tasks.filter(
          (task) => String(task.category || "Other") === name
        ).length,
      })),
    [tasks]
  );

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            !task.completed &&
            dateInfo(task.due_date).days !== null
        )
        .sort(
          (a, b) =>
            dateInfo(a.due_date).days - dateInfo(b.due_date).days
        )
        .slice(0, 4),
    [tasks]
  );

  const sendMessage = async (messageOverride = null) => {
    const message = (
      messageOverride !== null ? messageOverride : chatInput
    ).trim();

    if (!message || aiLoading) return;

    setChatMessages((items) => [
      ...items,
      { role: "user", text: message },
    ]);
    setChatInput("");
    setAiLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ message }),
      });

      const data = await parseResponse(response);

      setChatMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data?.response || "I couldn't generate a response.",
        },
      ]);

      if (
        ["added", "completed", "deleted", "updated"].includes(
          data?.action
        )
      ) {
        await loadTasks();
      }
    } catch (error) {
      console.error("AI error:", error);
      setChatMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "I couldn't connect to Nexa AI right now.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!authToken) {
    const isForgot = authMode === "forgot";

    return (
      <div className="auth-page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-icon">✦</div>
            <div>
              <strong>NEXAOS</strong>
              <span>AI PRODUCTIVITY OS</span>
            </div>
          </div>

          <div className="auth-kicker">
            {isForgot ? "ACCOUNT RECOVERY" : "YOUR WORKSPACE, REIMAGINED"}
          </div>

          <h1>
            {isForgot
              ? "Reset your password."
              : authMode === "login"
              ? "Welcome back."
              : "Build your workspace."}
          </h1>

          <p className="auth-subtitle">
            {isForgot
              ? "Create a new password and get back to your workspace."
              : "A focused space for tasks, planning, productivity insights and AI assistance."}
          </p>

          {!isForgot && (
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                Create account
              </button>
            </div>
          )}

          {isForgot ? (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <Field
                label="EMAIL"
                value={resetEmail}
                onChange={setResetEmail}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />

              <PasswordField
                label="NEW PASSWORD"
                value={resetPassword}
                onChange={setResetPassword}
                visible={showResetPassword}
                onToggle={() =>
                  setShowResetPassword((value) => !value)
                }
                autoComplete="new-password"
              />

              <PasswordField
                label="CONFIRM PASSWORD"
                value={resetConfirm}
                onChange={setResetConfirm}
                visible={showResetConfirm}
                onToggle={() =>
                  setShowResetConfirm((value) => !value)
                }
                autoComplete="new-password"
              />

              {authError && <div className="auth-error">{authError}</div>}
              {authSuccess && (
                <div className="auth-success">{authSuccess}</div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading ? "Resetting…" : "Reset password  →"}
              </button>

              <button
                type="button"
                className="back-link"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                ← Back to login
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <Field
                  label="USERNAME"
                  value={authUsername}
                  onChange={setAuthUsername}
                  placeholder="Your name"
                  autoComplete="username"
                />
              )}

              <Field
                label="EMAIL"
                value={authEmail}
                onChange={setAuthEmail}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />

              <PasswordField
                label="PASSWORD"
                value={authPassword}
                onChange={setAuthPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete={
                  authMode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />

              {authMode === "login" && (
                <div className="auth-options">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={rememberPassword}
                      onChange={(event) =>
                        handleRememberChange(event.target.checked)
                      }
                    />
                    <span>Remember password</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => {
                      setResetEmail(authEmail);
                      setAuthMode("forgot");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {authError && <div className="auth-error">{authError}</div>}
              {authSuccess && (
                <div className="auth-success">{authSuccess}</div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait…"
                  : authMode === "login"
                  ? "Enter NexaOS  →"
                  : "Create workspace  →"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Private workspace · Your tasks stay tied to your account
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!event.target.closest(".calendar-picker-wrap")) setCalendarOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const pickCalendarDate = (date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setDueDate(iso);
    setCalendarDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setCalendarOpen(false);
    notify(`Due date selected: ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
  };

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      <header className="topbar">
        <button className="brand-button" onClick={() => scrollTo("overview")}>
          <span className="brand-icon">✦</span>
          <span>
            <strong>NEXAOS</strong>
            <small>AI PRODUCTIVITY OS</small>
          </span>
        </button>

        <nav className="main-nav">
          <button onClick={() => scrollTo("overview")}>Overview</button>
          <button onClick={() => scrollTo("tasks")}>Tasks</button>
          <button onClick={() => scrollTo("assistant")}>AI Assistant</button>
          <div className="calendar-picker-wrap">
            <button
              type="button"
              className={`nav-calendar-button ${calendarOpen ? "active" : ""}`}
              onClick={() => setCalendarOpen((open) => !open)}
              aria-label="Open calendar"
              title="Calendar"
            >
              <span className="calendar-icon">▣</span>
              <span>Calendar</span>
            </button>
            {calendarOpen && (
              <CompactCalendarPicker
                monthDate={calendarDate}
                tasks={tasks}
                selectedDate={dueDate}
                onMonthChange={setCalendarDate}
                onSelect={pickCalendarDate}
              />
            )}
          </div>
        </nav>

        <div className="user-area">
          <div className="avatar">
            {(currentUser?.username || currentUser?.email || "U")
              .slice(0, 1)
              .toUpperCase()}
          </div>
          <div className="user-details">
            <strong>{currentUser?.username || "User"}</strong>
            <span>{currentUser?.email || ""}</span>
          </div>
          <button className="logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page">
        <section id="overview" className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">PERSONAL COMMAND CENTER</span>
            <h1>
              Get clear.
              <br />
              <em>Get things done.</em>
            </h1>
            <p>
              One calm workspace for your tasks, deadlines and
              AI-powered planning.
            </p>

            <div className="hero-actions">
              <button className="primary" onClick={() => scrollTo("tasks")}>
                ＋ New task
              </button>
              <button
                className="secondary"
                onClick={() =>
                  sendMessage("What should I work on next?")
                }
              >
                ✦ Ask Nexa AI
              </button>
            </div>
          </div>

          <div className="hero-orbit" aria-label={`${stats.rate}% complete`}>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-core">
              <strong>{stats.rate}%</strong>
              <span>COMPLETE</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <Stat
            icon="◌"
            label="Total tasks"
            value={stats.total}
            tone="purple"
            note="Across your workspace"
          />
          <Stat
            icon="✓"
            label="Completed"
            value={stats.completed}
            tone="green"
            note={`${stats.rate}% completion rate`}
          />
          <Stat
            icon="◷"
            label="Needs attention"
            value={stats.pending}
            tone="yellow"
            note={`${stats.high} high priority`}
          />
          <Stat
            icon="!"
            label="Overdue"
            value={stats.overdue}
            tone="red"
            note={
              stats.overdue ? "Needs action today" : "You're on track"
            }
          />
        </section>

        <section className="insight-grid">
          <div className="panel focus-panel">
            <div className="panel-head">
              <div>
                <span className="kicker">FOCUS NEXT</span>
                <h2>Your most important move</h2>
              </div>
              <span className="live">● LIVE</span>
            </div>

            {stats.focus ? (
              <button
                className="focus-task"
                onClick={() => startEditingTask(stats.focus)}
              >
                <div
                  className={`focus-mark ${String(
                    stats.focus.priority || "Medium"
                  ).toLowerCase()}`}
                >
                  ↗
                </div>
                <div className="focus-main">
                  <strong>{stats.focus.title}</strong>
                  <div className="meta-row">
                    <span>{stats.focus.priority || "Medium"} priority</span>
                    <span>{stats.focus.category || "Other"}</span>
                    <span>{stats.focus.estimated_minutes || 30} min</span>
                  </div>
                </div>
                <span
                  className={`deadline ${
                    dateInfo(stats.focus.due_date).state
                  }`}
                >
                  {dateInfo(stats.focus.due_date).label}
                </span>
              </button>
            ) : (
              <div className="empty-focus">
                <div className="empty-icon">✓</div>
                <div>
                  <strong>Everything is done.</strong>
                  <span>Add your next goal when you're ready.</span>
                </div>
              </div>
            )}
          </div>

          <div className="panel workload-panel">
            <div className="panel-head">
              <div>
                <span className="kicker">WORKLOAD</span>
                <h2>Remaining time</h2>
              </div>
              <strong className="workload-total">
                {formatMinutes(stats.minutes)}
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    stats.total
                      ? Math.min(
                          100,
                          Math.round(
                            (stats.completed / stats.total) * 100
                          )
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="progress-labels">
              <span>{stats.completed} completed</span>
              <span>{stats.pending} remaining</span>
            </div>

            <div className="mini-grid">
              <MiniStat label="HIGH PRIORITY" value={stats.high} />
              <MiniStat label="OVERDUE" value={stats.overdue} />
              <MiniStat
                label="CATEGORIES"
                value={
                  categoryData.filter((item) => item.count > 0).length
                }
              />
            </div>
          </div>
        </section>

        <section id="tasks" className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="kicker">WORKSPACE</span>
              <h2>Task manager</h2>
              <p>Capture, organize and finish without the clutter.</p>
            </div>
            <span className="task-count">
              {filteredTasks.length} shown
            </span>
          </div>

          <div id="task-composer" className="composer panel">
            <div className="composer-title">
              <div className="composer-icon">
                {editingTaskId ? "✎" : "+"}
              </div>
              <div>
                <strong>
                  {editingTaskId ? "Edit task" : "Create a task"}
                </strong>
                <span>
                  {editingTaskId
                    ? "Update the details and save."
                    : "Keep it specific and actionable."}
                </span>
              </div>
            </div>

            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to get done?"
              rows={2}
            />

            <div className="composer-fields">
              <FieldSelect
                label="PRIORITY"
                value={priority}
                onChange={setPriority}
                options={PRIORITIES}
              />
              <FieldSelect
                label="CATEGORY"
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
              />
              <div className="field">
                <label>DUE DATE</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <FieldSelect
                label="EST. TIME"
                value={String(estimatedMinutes)}
                onChange={(value) => setEstimatedMinutes(Number(value))}
                options={TIMES.map(String)}
                suffix=" min"
              />
            </div>

            <div className="composer-actions">
              {editingTaskId && (
                <button
                  className="secondary"
                  onClick={resetTaskForm}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
              <button
                className="primary"
                onClick={editingTaskId ? updateTask : addTask}
                disabled={loading}
              >
                {loading
                  ? "Saving…"
                  : editingTaskId
                  ? "Save changes  →"
                  : "＋ Add task"}
              </button>
            </div>
          </div>

          <div className="filters panel">
            <div className="search-box">
              <span>⌕</span>
              <input
                id="task-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks…"
              />
              <kbd>/</kbd>
            </div>

            <select
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value)}
            >
              <option>All</option>
              {PRIORITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <option>All</option>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option>Default</option>
              <option>Newest</option>
              <option>Priority</option>
              <option>DueDate</option>
              <option>Time</option>
            </select>
          </div>

          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-state panel">
                <div className="empty-icon">⌁</div>
                <h3>No tasks match these filters.</h3>
                <p>Clear the filters or create a new task.</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onEdit={startEditingTask}
                  onDelete={deleteTask}
                  dateInfo={dateInfo}
                />
              ))
            )}
          </div>
        </section>

        <section className="distribution-grid">
          <div className="panel distribution">
            <div className="panel-head">
              <div>
                <span className="kicker">DISTRIBUTION</span>
                <h2>By category</h2>
              </div>
            </div>

            <div className="category-bars">
              {categoryData
                .filter((item) => item.count > 0)
                .map((item) => (
                  <div className="category-row" key={item.name}>
                    <span>{item.name}</span>
                    <div className="category-track">
                      <div
                        className="category-fill"
                        style={{
                          width: `${
                            stats.total
                              ? Math.max(
                                  5,
                                  (item.count / stats.total) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <b>{item.count}</b>
                  </div>
                ))}

              {categoryData.every((item) => item.count === 0) && (
                <p className="muted">Your category distribution will appear here.</p>
              )}
            </div>
          </div>

          <div className="panel deadlines-panel">
            <div className="panel-head">
              <div>
                <span className="kicker">UP NEXT</span>
                <h2>Upcoming deadlines</h2>
              </div>
            </div>

            {upcomingTasks.length ? (
              <div className="deadline-list">
                {upcomingTasks.map((task) => (
                  <button
                    className="deadline-row"
                    key={task.id}
                    onClick={() => startEditingTask(task)}
                  >
                    <span
                      className={`deadline-dot ${
                        dateInfo(task.due_date).state
                      }`}
                    />
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.category || "Other"} ·{" "}
                        {dateInfo(task.due_date).label}
                      </span>
                    </div>
                    <b>›</b>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                No dated pending tasks. You're clear.
              </p>
            )}
          </div>
        </section>

        <section id="assistant" className="ai-panel panel">
          <div className="ai-top">
            <div>
              <span className="kicker">INTELLIGENCE LAYER</span>
              <h2>Nexa AI Assistant</h2>
              <p>
                Ask about your workload, planning or what to focus on next.
              </p>
            </div>
            <span className="ai-online">● ONLINE</span>
          </div>

          <div className="ai-body">
            {chatMessages.length === 0 ? (
              <div className="ai-welcome">
                <div className="ai-symbol">✦</div>
                <div>
                  <strong>What would you like to accomplish?</strong>
                  <p>
                    Try “Plan my day”, “What should I work on next?” or
                    ask me to manage a task.
                  </p>
                </div>
              </div>
            ) : (
              <div className="chat-history">
                {chatMessages.map((message, index) => (
                  <div
                    className={`message ${message.role}`}
                    key={`${message.role}-${index}`}
                  >
                    <span className="message-avatar">
                      {message.role === "user" ? "U" : "✦"}
                    </span>
                    <div className="message-bubble">
                      {String(message.text)
                        .split("\n")
                        .map((line, lineIndex) => (
                          <div key={lineIndex}>
                            {line || "\u00a0"}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                {aiLoading && (
                  <div className="message">
                    <span className="message-avatar">✦</span>
                    <div className="message-bubble typing">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="ai-input-row">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Nexa AI…"
                disabled={aiLoading}
              />
              <button
                className="primary small"
                onClick={() => sendMessage()}
                disabled={!chatInput.trim() || aiLoading}
              >
                {aiLoading ? "…" : "Send  →"}
              </button>
            </div>

            <div className="suggestions">
              <button
                onClick={() =>
                  sendMessage("What should I work on next?")
                }
              >
                🎯 What next?
              </button>
              <button
                onClick={() =>
                  sendMessage("Plan my day using my current tasks.")
                }
              >
                ◷ Plan my day
              </button>
              <button
                onClick={() =>
                  sendMessage("Summarize my current workload.")
                }
              >
                ⌁ Summarize workload
              </button>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .calendar-picker-wrap { position: relative; display: inline-flex; align-items: center; }
        .nav-calendar-button { display:flex; align-items:center; gap:7px; border:1px solid transparent; background:transparent; color:inherit; padding:8px 10px; border-radius:10px; cursor:pointer; font:inherit; opacity:.78; }
        .nav-calendar-button:hover, .nav-calendar-button.active { background:rgba(124,84,255,.12); border-color:rgba(124,84,255,.24); opacity:1; }
        .calendar-icon { font-size:14px; line-height:1; }
        .compact-calendar-dropdown { position:absolute; top:calc(100% + 10px); right:0; width:276px; padding:13px; z-index:1000; border:1px solid rgba(255,255,255,.1); border-radius:15px; background:rgba(20,17,32,.98); box-shadow:0 18px 45px rgba(0,0,0,.38); backdrop-filter:blur(18px); }
        .compact-calendar-head { display:grid; grid-template-columns:30px 1fr 30px; align-items:center; gap:6px; margin-bottom:10px; }
        .compact-calendar-head strong { text-align:center; font-size:13px; }
        .compact-calendar-head button { width:30px; height:30px; border:0; border-radius:8px; background:rgba(255,255,255,.06); color:inherit; cursor:pointer; font-size:18px; }
        .compact-calendar-head button:hover { background:rgba(124,84,255,.18); }
        .compact-calendar-weekdays, .compact-calendar-days { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
        .compact-calendar-weekdays { margin-bottom:4px; }
        .compact-calendar-weekdays span { text-align:center; font-size:9px; font-weight:700; opacity:.42; padding:3px 0; }
        .compact-calendar-day { position:relative; height:29px; border:0; border-radius:7px; background:transparent; color:inherit; font-size:11px; cursor:pointer; }
        .compact-calendar-day:hover { background:rgba(124,84,255,.16); }
        .compact-calendar-day.muted { opacity:.24; }
        .compact-calendar-day.today { box-shadow:inset 0 0 0 1px rgba(124,84,255,.7); font-weight:800; }
        .compact-calendar-day.selected { background:linear-gradient(135deg,rgba(124,84,255,.95),rgba(157,109,255,.78)); color:#fff; font-weight:800; }
        .compact-calendar-day i { position:absolute; width:4px; height:4px; border-radius:50%; left:50%; bottom:3px; transform:translateX(-50%); background:#bda7ff; }
        .compact-calendar-day.selected i { background:#fff; }
        .compact-calendar-today { width:100%; margin-top:9px; height:30px; border:1px solid rgba(124,84,255,.24); border-radius:8px; background:rgba(124,84,255,.08); color:inherit; font-size:11px; font-weight:700; cursor:pointer; }
        .compact-calendar-today:hover { background:rgba(124,84,255,.16); }
        @media (max-width: 800px) {
          .compact-calendar-dropdown { right:auto; left:0; width:260px; }
        }
      `}</style>

      <footer className="site-footer">
        <span>NEXAOS AI</span>
        <span>A focused productivity workspace · v2.0</span>
      </footer>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  autoComplete,
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}) {
  return (
    <div className="field password-field">
      <label>{label}</label>
      <div className="password-wrap">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
        />
        <EyeButton visible={visible} onClick={onToggle} />
      </div>
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, suffix = "" }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
            {suffix}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ icon, label, value, tone, note }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, dateInfo }) {
  const deadline = dateInfo(task.due_date);

  return (
    <article className={`task-row panel ${task.completed ? "completed" : ""}`}>
      <button
        className={`task-check ${task.completed ? "checked" : ""}`}
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Reopen task" : "Complete task"}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div className="task-content">
        <div className="task-title-line">
          <h3>{task.title}</h3>
          <span
            className={`priority-pill ${String(
              task.priority || "Medium"
            ).toLowerCase()}`}
          >
            {task.priority || "Medium"}
          </span>
        </div>

        <div className="task-meta">
          <span>⌂ {task.category || "Other"}</span>
          <span>◷ {task.estimated_minutes || 30} min</span>
          <span className={`task-deadline ${deadline.state}`}>
            {deadline.label}
          </span>
        </div>
      </div>

      <div className="task-actions">
        <button onClick={() => onEdit(task)} title="Edit task">
          Edit
        </button>
        <button
          className="danger"
          onClick={() => onDelete(task.id)}
          title="Delete task"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function CompactCalendarPicker({ monthDate, tasks, selectedDate, onMonthChange, onSelect }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const offset = index - firstDay + 1;
    let date;
    let currentMonth = true;
    if (offset < 1) {
      date = new Date(year, month - 1, previousMonthDays + offset);
      currentMonth = false;
    } else if (offset > daysInMonth) {
      date = new Date(year, month + 1, offset - daysInMonth);
      currentMonth = false;
    } else {
      date = new Date(year, month, offset);
    }
    cells.push({ date, currentMonth });
  }

  const key = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const todayKey = key(new Date());
  const taskDates = new Set(
    tasks.filter((task) => task.due_date).map((task) => {
      const d = new Date(task.due_date);
      return Number.isNaN(d.getTime()) ? null : key(d);
    }).filter(Boolean)
  );

  return (
    <div className="compact-calendar-dropdown" role="dialog" aria-label="Calendar date picker">
      <div className="compact-calendar-head">
        <button type="button" onClick={() => onMonthChange(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
        <strong>{monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>
        <button type="button" onClick={() => onMonthChange(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="compact-calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="compact-calendar-days">
        {cells.map(({ date, currentMonth }, index) => {
          const dateKey = key(date);
          const isSelected = selectedDate === dateKey;
          const isToday = todayKey === dateKey;
          const hasTask = taskDates.has(dateKey);
          return (
            <button
              type="button"
              key={`${dateKey}-${index}`}
              className={`compact-calendar-day ${currentMonth ? "" : "muted"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(date)}
              title={hasTask ? "Task due on this date" : "Select date"}
            >
              {date.getDate()}
              {hasTask && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="compact-calendar-today"
        onClick={() => {
          const today = new Date();
          onMonthChange(today);
          onSelect(today);
        }}
      >Today</button>
    </div>
  );
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const mins = value % 60;

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export default App;
