import React, { useEffect, useRef, useState } from "react";

export default function ProductivityTools({ tasks = [] }) {
  const [mode, setMode] = useState("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const timerRef = useRef(null);

  const durations = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  const modeLabels = {
    focus: "Focus",
    short: "Short Break",
    long: "Long Break",
  };

  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setSeconds((previous) => {
        if (previous <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);

          if (mode === "focus") {
            setSessions((count) => count + 1);
          }

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [running, mode]);

  const changeMode = (newMode) => {
    clearInterval(timerRef.current);
    setRunning(false);
    setMode(newMode);
    setSeconds(durations[newMode]);
  };

  const toggleTimer = () => {
    setRunning((previous) => !previous);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setSeconds(durations[mode]);
  };

  const formatTime = (value) => {
    const minutes = Math.floor(value / 60);
    const secondsValue = value % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secondsValue
    ).padStart(2, "0")}`;
  };

  const exportTasks = () => {
    if (!tasks.length) {
      alert("There are no tasks to export.");
      return;
    }

    const headers = [
      "Title",
      "Priority",
      "Category",
      "Due Date",
      "Estimated Minutes",
      "Status",
    ];

    const rows = tasks.map((task) => [
      task.title || "",
      task.priority || "",
      task.category || "",
      task.due_date || "",
      task.estimated_minutes || "",
      task.completed ? "Completed" : "Pending",
    ]);

    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `nexaos-tasks-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();

        const input =
          document.querySelector("#task-input") ||
          document.querySelector("textarea");

        if (input) {
          input.focus();
          input.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }

      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();

        const timer =
          document.getElementById("focus-timer");

        if (timer) {
          timer.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }

      if (event.key === "Escape" && running) {
        setRunning(false);
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [running]);

  return (
    <section
      id="focus-timer"
      style={{
        margin: "28px 0",
        padding: "24px",
        borderRadius: "18px",
        border: "1px solid rgba(130, 100, 255, 0.35)",
        background:
          "linear-gradient(145deg, rgba(20,18,55,0.96), rgba(12,14,35,0.96))",
        boxShadow: "0 12px 35px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            🍅 Focus Timer
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              opacity: 0.7,
            }}
          >
            Focus deeply, take breaks, and build productive sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={exportTasks}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(130,100,255,0.5)",
            background: "rgba(100,70,220,0.25)",
            color: "inherit",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📥 Export Tasks
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        {Object.keys(durations).map((timerMode) => (
          <button
            key={timerMode}
            type="button"
            onClick={() => changeMode(timerMode)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border:
                mode === timerMode
                  ? "1px solid rgba(150,120,255,0.9)"
                  : "1px solid rgba(255,255,255,0.12)",
              background:
                mode === timerMode
                  ? "rgba(110,80,255,0.35)"
                  : "rgba(255,255,255,0.04)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {timerMode === "focus" && "🎯 "}
            {timerMode === "short" && "☕ "}
            {timerMode === "long" && "🧘 "}
            {modeLabels[timerMode]}
          </button>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            opacity: 0.65,
            marginBottom: "8px",
          }}
        >
          {modeLabels[mode]} Session
        </div>

        <div
          style={{
            fontSize: "64px",
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "2px",
            margin: "18px 0",
          }}
        >
          {formatTime(seconds)}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={toggleTimer}
            style={{
              minWidth: "120px",
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6d4aff, #8b5cf6)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {running ? "⏸ Pause" : "▶ Start"}
          </button>

          <button
            type="button"
            onClick={resetTimer}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            ↻ Reset
          </button>
        </div>

        <div
          style={{
            marginTop: "18px",
            opacity: 0.7,
            fontSize: "13px",
          }}
        >
          Completed focus sessions:{" "}
          <strong>{sessions}</strong>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          flexWrap: "wrap",
          fontSize: "12px",
          opacity: 0.6,
        }}
      >
        <span>⌨️ Ctrl + K — Add Task</span>
        <span>⌨️ Ctrl + Shift + F — Focus Timer</span>
        <span>⌨️ Esc — Pause</span>
      </div>
    </section>
  );
}