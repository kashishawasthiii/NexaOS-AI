import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function Analytics() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("nexa_token");

            const response = await fetch(`${API_BASE}/tasks`, {
                headers: token
                    ? {
                          Authorization: `Bearer ${token}`,
                      }
                    : {},
            });

            if (!response.ok) {
                throw new Error("Failed to load analytics data");
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setTasks(data);
            } else if (Array.isArray(data.tasks)) {
                setTasks(data.tasks);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error("Analytics error:", err);
            setTasks([]);
            setError("Unable to load productivity data.");
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const total = tasks.length;

        const completed = tasks.filter(
            (task) => task.completed === true
        ).length;

        const pending = total - completed;

        const completionRate =
            total > 0
                ? Math.round((completed / total) * 100)
                : 0;

        const high = tasks.filter(
            (task) => task.priority === "High"
        ).length;

        const medium = tasks.filter(
            (task) => task.priority === "Medium"
        ).length;

        const low = tasks.filter(
            (task) => task.priority === "Low"
        ).length;

        const study = tasks.filter(
            (task) => task.category === "Study"
        ).length;

        const development = tasks.filter(
            (task) => task.category === "Development"
        ).length;

        const personal = tasks.filter(
            (task) => task.category === "Personal"
        ).length;

        const work = tasks.filter(
            (task) => task.category === "Work"
        ).length;

        const other = tasks.filter(
            (task) =>
                !["Study", "Development", "Personal", "Work"].includes(
                    task.category
                )
        ).length;

        const estimatedMinutes = tasks.reduce(
            (sum, task) =>
                sum + (Number(task.estimated_minutes) || 0),
            0
        );

        const completedMinutes = tasks
            .filter((task) => task.completed === true)
            .reduce(
                (sum, task) =>
                    sum + (Number(task.estimated_minutes) || 0),
                0
            );

        const pendingMinutes = estimatedMinutes - completedMinutes;

        const estimatedHours =
            Math.round((estimatedMinutes / 60) * 10) / 10;

        const completedHours =
            Math.round((completedMinutes / 60) * 10) / 10;

        const pendingHours =
            Math.round((pendingMinutes / 60) * 10) / 10;

        return {
            total,
            completed,
            pending,
            completionRate,
            high,
            medium,
            low,
            study,
            development,
            personal,
            work,
            other,
            estimatedMinutes,
            completedMinutes,
            pendingMinutes,
            estimatedHours,
            completedHours,
            pendingHours,
        };
    }, [tasks]);

    const insights = useMemo(() => {
        const result = [];

        if (stats.total === 0) {
            return [
                "Start by adding your first task to generate productivity insights.",
            ];
        }

        if (stats.completionRate >= 80) {
            result.push(
                "Excellent productivity! You are completing most of your tasks."
            );
        } else if (stats.completionRate >= 50) {
            result.push(
                "Good progress. Focus on your remaining pending tasks."
            );
        } else {
            result.push(
                "You have a significant number of pending tasks. Consider prioritizing today's most important work."
            );
        }

        if (stats.high > 0) {
            result.push(
                `${stats.high} high-priority task${
                    stats.high === 1 ? "" : "s"
                } require attention.`
            );
        }

        if (stats.pendingHours > 0) {
            result.push(
                `${stats.pendingHours} hours of estimated work remain pending.`
            );
        }

        const categoryValues = [
            ["Study", stats.study],
            ["Development", stats.development],
            ["Personal", stats.personal],
            ["Work", stats.work],
            ["Other", stats.other],
        ];

        const dominantCategory = categoryValues.reduce(
            (best, current) =>
                current[1] > best[1] ? current : best,
            ["None", 0]
        );

        if (dominantCategory[1] > 0) {
            result.push(
                `${dominantCategory[0]} is currently your largest task category.`
            );
        }

        return result.slice(0, 4);
    }, [stats]);

    const priorityData = [
        {
            label: "High",
            value: stats.high,
        },
        {
            label: "Medium",
            value: stats.medium,
        },
        {
            label: "Low",
            value: stats.low,
        },
    ];

    const categoryData = [
        {
            label: "Study",
            value: stats.study,
        },
        {
            label: "Development",
            value: stats.development,
        },
        {
            label: "Personal",
            value: stats.personal,
        },
        {
            label: "Work",
            value: stats.work,
        },
        {
            label: "Other",
            value: stats.other,
        },
    ];

    const maxPriority = Math.max(
        ...priorityData.map((item) => item.value),
        1
    );

    const maxCategory = Math.max(
        ...categoryData.map((item) => item.value),
        1
    );

    if (loading) {
        return (
            <div
                style={{
                    padding: "30px",
                    textAlign: "center",
                }}
            >
                <h2>Productivity Analytics</h2>
                <p>Loading productivity data...</p>
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
                padding: "24px",
                boxSizing: "border-box",
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    marginBottom: "25px",
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: "28px",
                        }}
                    >
                        Productivity Analytics
                    </h2>

                    <p
                        style={{
                            marginTop: "8px",
                            opacity: 0.7,
                        }}
                    >
                        Understand your workload, progress and
                        productivity patterns.
                    </p>
                </div>

                <button
                    onClick={loadAnalytics}
                    style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(120,80,255,0.18)",
                        color: "inherit",
                        cursor: "pointer",
                    }}
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div
                    style={{
                        padding: "14px",
                        marginBottom: "20px",
                        borderRadius: "10px",
                        background: "rgba(255,70,70,0.12)",
                        border: "1px solid rgba(255,70,70,0.3)",
                    }}
                >
                    {error}
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "15px",
                    marginBottom: "22px",
                }}
            >
                <SummaryCard
                    title="Total Tasks"
                    value={stats.total}
                    subtitle="All tasks"
                />

                <SummaryCard
                    title="Completed"
                    value={stats.completed}
                    subtitle={`${stats.completionRate}% completion`}
                />

                <SummaryCard
                    title="Pending"
                    value={stats.pending}
                    subtitle="Tasks remaining"
                />

                <SummaryCard
                    title="Workload"
                    value={`${stats.estimatedHours}h`}
                    subtitle="Estimated total"
                />
            </div>

            {/* PROGRESS */}
            <section
                style={{
                    padding: "20px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    marginBottom: "22px",
                }}
            >
                <h3 style={{ marginTop: 0 }}>
                    Overall Progress
                </h3>

                <div
                    style={{
                        height: "14px",
                        width: "100%",
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${stats.completionRate}%`,
                            height: "100%",
                            background:
                                "linear-gradient(90deg, #7c3aed, #22c55e)",
                            borderRadius: "20px",
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "10px",
                        fontSize: "14px",
                        opacity: 0.75,
                    }}
                >
                    <span>
                        {stats.completed} completed
                    </span>

                    <strong>
                        {stats.completionRate}%
                    </strong>

                    <span>
                        {stats.pending} pending
                    </span>
                </div>
            </section>

            {/* WORKLOAD */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "15px",
                    marginBottom: "22px",
                }}
            >
                <MiniCard
                    title="Completed Work"
                    value={`${stats.completedHours}h`}
                    text="Estimated completed workload"
                />

                <MiniCard
                    title="Pending Work"
                    value={`${stats.pendingHours}h`}
                    text="Estimated remaining workload"
                />

                <MiniCard
                    title="High Priority"
                    value={stats.high}
                    text="Tasks requiring attention"
                />
            </div>

            {/* CHARTS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "20px",
                    marginBottom: "22px",
                }}
            >
                {/* PRIORITY */}
                <section
                    style={{
                        padding: "20px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.12)",
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>
                        Priority Distribution
                    </h3>

                    {priorityData.map((item) => (
                        <BarRow
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            max={maxPriority}
                        />
                    ))}
                </section>

                {/* CATEGORY */}
                <section
                    style={{
                        padding: "20px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.12)",
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>
                        Category Distribution
                    </h3>

                    {categoryData.map((item) => (
                        <BarRow
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            max={maxCategory}
                        />
                    ))}
                </section>
            </div>

            {/* INSIGHTS */}
            <section
                style={{
                    padding: "20px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    marginBottom: "22px",
                }}
            >
                <h3 style={{ marginTop: 0 }}>
                    Productivity Insights
                </h3>

                <div
                    style={{
                        display: "grid",
                        gap: "10px",
                    }}
                >
                    {insights.map((insight, index) => (
                        <div
                            key={index}
                            style={{
                                padding: "13px 15px",
                                borderRadius: "9px",
                                background:
                                    "rgba(124,58,237,0.09)",
                                border:
                                    "1px solid rgba(124,58,237,0.18)",
                            }}
                        >
                            <span
                                style={{
                                    marginRight: "8px",
                                }}
                            >
                                ✦
                            </span>

                            {insight}
                        </div>
                    ))}
                </div>
            </section>

            {/* BREAKDOWN */}
            <section
                style={{
                    padding: "20px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.12)",
                }}
            >
                <h3 style={{ marginTop: 0 }}>
                    Productivity Breakdown
                </h3>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                    }}
                >
                    <Breakdown
                        label="Total Tasks"
                        value={stats.total}
                    />

                    <Breakdown
                        label="Completed"
                        value={stats.completed}
                    />

                    <Breakdown
                        label="Pending"
                        value={stats.pending}
                    />

                    <Breakdown
                        label="High Priority"
                        value={stats.high}
                    />

                    <Breakdown
                        label="Medium Priority"
                        value={stats.medium}
                    />

                    <Breakdown
                        label="Low Priority"
                        value={stats.low}
                    />

                    <Breakdown
                        label="Estimated Hours"
                        value={`${stats.estimatedHours}h`}
                    />

                    <Breakdown
                        label="Remaining Hours"
                        value={`${stats.pendingHours}h`}
                    />
                </div>
            </section>
        </div>
    );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ title, value, subtitle }) {
    return (
        <div
            style={{
                padding: "20px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
            }}
        >
            <div
                style={{
                    fontSize: "13px",
                    opacity: 0.65,
                    marginBottom: "10px",
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: "30px",
                    fontWeight: "700",
                }}
            >
                {value}
            </div>

            <div
                style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    opacity: 0.55,
                }}
            >
                {subtitle}
            </div>
        </div>
    );
}


/* =========================================================
   MINI CARD
========================================================= */

function MiniCard({ title, value, text }) {
    return (
        <div
            style={{
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            <div
                style={{
                    fontSize: "13px",
                    opacity: 0.65,
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    marginTop: "7px",
                }}
            >
                {value}
            </div>

            <div
                style={{
                    fontSize: "12px",
                    opacity: 0.5,
                    marginTop: "5px",
                }}
            >
                {text}
            </div>
        </div>
    );
}


/* =========================================================
   BAR ROW
========================================================= */

function BarRow({ label, value, max }) {
    const percentage =
        max > 0 ? Math.round((value / max) * 100) : 0;

    return (
        <div
            style={{
                marginBottom: "17px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    fontSize: "13px",
                }}
            >
                <span>{label}</span>
                <strong>{value}</strong>
            </div>

            <div
                style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "20px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background:
                            "linear-gradient(90deg, #7c3aed, #6366f1)",
                        borderRadius: "20px",
                        transition: "width 0.4s ease",
                    }}
                />
            </div>
        </div>
    );
}


/* =========================================================
   BREAKDOWN
========================================================= */

function Breakdown({ label, value }) {
    return (
        <div
            style={{
                padding: "14px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.035)",
            }}
        >
            <div
                style={{
                    fontSize: "12px",
                    opacity: 0.55,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    marginTop: "5px",
                    fontSize: "19px",
                    fontWeight: "600",
                }}
            >
                {value}
            </div>
        </div>
    );
}