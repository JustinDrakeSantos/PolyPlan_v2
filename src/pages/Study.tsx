import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { PlannerTask } from "./Eisenhower";
import "../styles/study.css";

/*
TODO LATER: Allow users to launch a Study Session directly from a Planner task.
TODO LATER: Add study streak tracking.
TODO LATER: Add an optional timer completion sound.
TODO LATER: Add browser notifications when a Focus or Break session ends.
TODO LATER: Allow users to configure notification and timer sound preferences.
TODO LATER: Persist the currently active Study Session when navigating between pages.
TODO LATER: Persist an active timer through page refreshes.
TODO LATER: Connect Study data with the Planner and Flashcards pages.
*/

const SESSION_STORAGE_KEY = "polyplanner-study-sessions";
const TASK_STORAGE_KEY = "polyplanner-tasks";

const courses = [{ id: "course-1", name: "Calculus I" }, { id: "course-2", name: "Computer Science" }];
const studySets = [{ id: "study-set-1", name: "Calculus I Formulas" }, { id: "study-set-2", name: "React Concepts" }];

type StudyMode = "pomodoro" | "stopwatch" | "flashcards";
type PomodoroPhase = "focus" | "short-break" | "long-break";
type SessionStatus = "idle" | "running" | "paused";
type SessionGoal = { id: string; text: string; completed: boolean };
type PomodoroSettings = { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakAfter: number; autoStartBreaks: boolean; autoStartFocus: boolean };

type StudySession = {
  id: string;
  startedAt: string;
  completedAt: string;
  studyItemId: string;
  plannerTaskId: string | null;
  mode: StudyMode;
  durationSeconds: number;
  focusSeconds: number;
  breakSeconds: number;
  pomodorosCompleted: number;
  cardsReviewed: number;
  goals: SessionGoal[];
  notes: string;
};

const defaultSettings: PomodoroSettings = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 20, longBreakAfter: 4, autoStartBreaks: false, autoStartFocus: false };

function readJson<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function formatTime(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function phaseLabel(phase: PomodoroPhase) {
  return { focus: "Focus", "short-break": "Short Break", "long-break": "Long Break" }[phase];
}

function startOfDay(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function startOfWeek() { const date = startOfDay(); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function startOfMonth() { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); }

function sessionSummary(sessions: StudySession[], since: Date) {
  return sessions.filter((session) => new Date(session.completedAt) >= since).reduce((total, session) => ({
    sessions: total.sessions + 1,
    focusSeconds: total.focusSeconds + (session.focusSeconds ?? session.durationSeconds ?? 0),
    breakSeconds: total.breakSeconds + (session.breakSeconds ?? 0),
    pomodoros: total.pomodoros + (session.pomodorosCompleted ?? 0),
    cards: total.cards + (session.cardsReviewed ?? 0),
    goals: total.goals + (session.goals ?? []).filter((goal) => goal.completed).length,
  }), { sessions: 0, focusSeconds: 0, breakSeconds: 0, pomodoros: 0, cards: 0, goals: 0 });
}

function Study() {
  const [selectedStudyItem, setSelectedStudyItem] = useState("");
  const [plannerTaskId, setPlannerTaskId] = useState("");
  const [studyMode, setStudyMode] = useState<StudyMode>("pomodoro");
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSettings.focusMinutes * 60);
  const [cyclePomodoros, setCyclePomodoros] = useState(0);
  const [sessionPomodoros, setSessionPomodoros] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [goals, setGoals] = useState<SessionGoal[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>(() => readJson(SESSION_STORAGE_KEY, []));
  const plannerTasks = readJson<PlannerTask[]>(TASK_STORAGE_KEY, []).filter((task) => !task.completed);

  const phaseDuration = (target: PomodoroPhase) => ({ focus: settings.focusMinutes, "short-break": settings.shortBreakMinutes, "long-break": settings.longBreakMinutes }[target] * 60);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => {
      if (studyMode === "pomodoro") {
        setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
        if (phase === "focus") setFocusSeconds((seconds) => seconds + 1);
        else setBreakSeconds((seconds) => seconds + 1);
      } else {
        setFocusSeconds((seconds) => seconds + 1);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, studyMode, phase]);

  useEffect(() => {
    if (studyMode !== "pomodoro" || status !== "running" || remainingSeconds !== 0) return;
    advancePhase(true);
    // advancePhase intentionally reacts only when the active timer reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, status, studyMode]);

  const today = useMemo(() => sessionSummary(sessions, startOfDay()), [sessions]);
  const week = useMemo(() => sessionSummary(sessions, startOfWeek()), [sessions]);
  const month = useMemo(() => sessionSummary(sessions, startOfMonth()), [sessions]);
  const modeStats = useMemo(() => ({
    pomodoro: sessionSummary(sessions.filter((session) => session.mode === "pomodoro"), new Date(0)),
    stopwatch: sessionSummary(sessions.filter((session) => session.mode === "stopwatch"), new Date(0)),
    flashcards: sessionSummary(sessions.filter((session) => session.mode === "flashcards"), new Date(0)),
  }), [sessions]);
  const totalDuration = focusSeconds + breakSeconds;

  const dailyChart = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(); date.setDate(date.getDate() - (6 - index));
    const next = new Date(date); next.setDate(next.getDate() + 1);
    const daySessions = sessions.filter((session) => { const completed = new Date(session.completedAt); return completed >= date && completed < next; });
    const summary = sessionSummary(daySessions, new Date(0));
    return { label: date.toLocaleDateString(undefined, { weekday: "short" }), minutes: Math.floor(summary.focusSeconds / 60), pomodoros: summary.pomodoros };
  }), [sessions]);
  const chartMax = Math.max(...dailyChart.map((day) => day.minutes), 1);

  function advancePhase(naturalCompletion: boolean) {
    let nextPhase: PomodoroPhase;
    if (phase === "focus") {
      const completed = naturalCompletion ? cyclePomodoros + 1 : cyclePomodoros;
      if (naturalCompletion) { setCyclePomodoros(completed); setSessionPomodoros((count) => count + 1); }
      nextPhase = completed >= settings.longBreakAfter ? "long-break" : "short-break";
    } else {
      if (phase === "long-break") setCyclePomodoros(0);
      nextPhase = "focus";
    }
    setPhase(nextPhase);
    setRemainingSeconds(phaseDuration(nextPhase));
    const shouldAutoStart = nextPhase === "focus" ? settings.autoStartFocus : settings.autoStartBreaks;
    setStatus(shouldAutoStart ? "running" : "paused");
  }

  function startOrPause() {
    if (status !== "running" && !selectedStudyItem) { setError("Choose a study item, General Study, or Personal before starting."); return; }
    setError("");
    if (!startedAt) setStartedAt(new Date().toISOString());
    setStatus((current) => current === "running" ? "paused" : "running");
  }

  function resetPhase() {
    setStatus("idle");
    if (studyMode === "pomodoro") setRemainingSeconds(phaseDuration(phase));
    else { setFocusSeconds(0); setCardsReviewed(0); setStartedAt(null); }
  }

  function resetWholeSession() {
    setStatus("idle"); setPhase("focus"); setRemainingSeconds(settings.focusMinutes * 60); setCyclePomodoros(0); setSessionPomodoros(0); setFocusSeconds(0); setBreakSeconds(0); setCardsReviewed(0); setStartedAt(null);
  }

  function changeMode(mode: StudyMode) { setStudyMode(mode); resetWholeSession(); }

  function updateSetting<K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "focusMinutes" && phase === "focus") setRemainingSeconds(Number(value) * 60);
    if (key === "shortBreakMinutes" && phase === "short-break") setRemainingSeconds(Number(value) * 60);
    if (key === "longBreakMinutes" && phase === "long-break") setRemainingSeconds(Number(value) * 60);
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const text = String(new FormData(event.currentTarget).get("goal") ?? "").trim(); if (!text) return;
    setGoals((current) => [...current, { id: crypto.randomUUID(), text, completed: false }]); event.currentTarget.reset();
  }

  function finishSession() {
    if (!selectedStudyItem) { setError("Choose what you studied before finishing the session."); return; }
    if (totalDuration === 0 && cardsReviewed === 0) return;
    const completedSession: StudySession = { id: crypto.randomUUID(), startedAt: startedAt ?? new Date().toISOString(), completedAt: new Date().toISOString(), studyItemId: selectedStudyItem, plannerTaskId: plannerTaskId || null, mode: studyMode, durationSeconds: totalDuration, focusSeconds, breakSeconds, pomodorosCompleted: sessionPomodoros, cardsReviewed, goals, notes: notes.trim() };
    const updated = [...sessions, completedSession]; setSessions(updated); localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    setGoals([]); setNotes(""); setError(""); resetWholeSession();
  }

  return (
    <main className="study-page">
      <header className="study-page__header"><h1>Study</h1><p>Choose a focus and start a study session.</p></header>

      <section className="study-setup" aria-labelledby="study-setup-title">
        <h2 id="study-setup-title">Set Up Your Session</h2>
        <label>What are you studying?
          <select value={selectedStudyItem} onChange={(e) => { const value = e.target.value; setSelectedStudyItem(value); if (value.startsWith("planner:")) setPlannerTaskId(value.slice(8)); setError(""); }}>
            <option value="" disabled>Select a study item</option><option value="general">General Study</option><option value="personal">Personal</option>
            <optgroup label="Courses">{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</optgroup>
            <optgroup label="Flashcard Study Sets">{studySets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}</optgroup>
            {plannerTasks.length > 0 && <optgroup label="Planner Tasks">{plannerTasks.map((task) => <option key={task.id} value={`planner:${task.id}`}>{task.title}</option>)}</optgroup>}
          </select>
        </label>
        <label>Planner task (optional)
          <select value={plannerTaskId} onChange={(e) => setPlannerTaskId(e.target.value)}><option value="">No linked task</option>{plannerTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
        </label>
        <fieldset><legend>Study mode</legend>{([["pomodoro", "Pomodoro"], ["stopwatch", "Stopwatch"], ["flashcards", "Flashcard Review"]] as const).map(([mode, label]) => <label key={mode}><input type="radio" checked={studyMode === mode} onChange={() => changeMode(mode)} />{label}</label>)}</fieldset>
        {error && <p className="study-error" role="alert">{error}</p>}
      </section>

      {studyMode === "pomodoro" && (
        <details className="pomodoro-settings"><summary>Pomodoro settings</summary><div>
          <label>Focus (minutes)<input type="number" min="1" value={settings.focusMinutes} onChange={(e) => updateSetting("focusMinutes", Math.max(1, Number(e.target.value)))} /></label>
          <label>Short break<input type="number" min="1" value={settings.shortBreakMinutes} onChange={(e) => updateSetting("shortBreakMinutes", Math.max(1, Number(e.target.value)))} /></label>
          <label>Long break<input type="number" min="1" value={settings.longBreakMinutes} onChange={(e) => updateSetting("longBreakMinutes", Math.max(1, Number(e.target.value)))} /></label>
          <label>Long break after<input type="number" min="1" max="10" value={settings.longBreakAfter} onChange={(e) => updateSetting("longBreakAfter", Math.max(1, Number(e.target.value)))} /></label>
          <label className="setting-check"><input type="checkbox" checked={settings.autoStartBreaks} onChange={(e) => updateSetting("autoStartBreaks", e.target.checked)} /> Auto-start breaks</label>
          <label className="setting-check"><input type="checkbox" checked={settings.autoStartFocus} onChange={(e) => updateSetting("autoStartFocus", e.target.checked)} /> Auto-start focus</label>
        </div></details>
      )}

      <div className="study-workspace">
        <section className="study-session" aria-labelledby="current-session-title">
          <header><h2 id="current-session-title">Current Session</h2><span aria-live="polite">{{ idle: "Not started", running: "In progress", paused: "Paused" }[status]}</span></header>
          {studyMode === "pomodoro" ? <>
            <div className="pomodoro-phase">{phaseLabel(phase)}</div><div className="study-timer">{formatTime(remainingSeconds)}</div>
            <div className="pomodoro-cycle" aria-label={`${cyclePomodoros} of ${settings.longBreakAfter} Pomodoros completed`}><div>{Array.from({ length: settings.longBreakAfter }, (_, i) => <span key={i} className={i < cyclePomodoros ? "complete" : ""} />)}</div><small>{cyclePomodoros} / {settings.longBreakAfter} Pomodoros</small></div>
          </> : studyMode === "flashcards" ? <div className="flashcard-review"><strong>{cardsReviewed}</strong><span>cards reviewed</span><button type="button" onClick={() => setCardsReviewed((count) => count + 1)}>Mark card reviewed</button></div> : <div className="study-timer">{formatTime(focusSeconds)}</div>}

          <div className="study-session__actions"><button type="button" onClick={startOrPause}>{status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start"}</button><button type="button" onClick={resetPhase}>Reset</button>{studyMode === "pomodoro" && <button type="button" onClick={() => advancePhase(false)}>Skip Session</button>}<button type="button" onClick={finishSession} disabled={totalDuration === 0 && cardsReviewed === 0}>Finish Session</button></div>

          <div className="session-field"><span>Session goals</span><form className="session-goal-form" onSubmit={addGoal}><input name="goal" placeholder="Example: Review 20 flashcards" aria-label="New session goal" /><button>Add</button></form>{goals.length > 0 && <ul className="session-goals">{goals.map((goal) => <li key={goal.id}><label><input type="checkbox" checked={goal.completed} onChange={() => setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))} /><span>{goal.text}</span></label></li>)}</ul>}</div>
          <label>Session notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write down key ideas or questions..." /></label>
        </section>

        <aside className="study-progress"><h2>Today&apos;s Progress</h2><dl><div><dt>Pomodoros</dt><dd>{today.pomodoros}</dd></div><div><dt>Minutes focused</dt><dd>{Math.floor(today.focusSeconds / 60)}</dd></div><div><dt>Cards reviewed</dt><dd>{today.cards}</dd></div><div><dt>Goals completed</dt><dd>{today.goals}</dd></div><div><dt>Sessions</dt><dd>{today.sessions}</dd></div></dl></aside>
      </div>

      <section className="study-summaries" aria-label="Study summaries">
        <article><h2>This Week</h2><strong>{week.pomodoros} Pomodoros</strong><span>{Math.floor(week.focusSeconds / 60)} focused minutes</span><span>{week.cards} cards · {week.sessions} sessions</span></article>
        <article><h2>This Month</h2><strong>{month.pomodoros} Pomodoros</strong><span>{Math.floor(month.focusSeconds / 60)} focused minutes</span><span>{month.cards} cards · {month.sessions} sessions</span></article>
      </section>

      <section className="mode-statistics" aria-labelledby="mode-statistics-title">
        <h2 id="mode-statistics-title">All-Time Productivity by Mode</h2>
        <div>
          <article><h3>Pomodoro</h3><strong>{modeStats.pomodoro.pomodoros} completed</strong><span>{Math.floor(modeStats.pomodoro.focusSeconds / 60)} focus minutes</span></article>
          <article><h3>Stopwatch</h3><strong>{Math.floor(modeStats.stopwatch.focusSeconds / 60)} minutes</strong><span>{modeStats.stopwatch.sessions} sessions</span></article>
          <article><h3>Flashcards</h3><strong>{modeStats.flashcards.cards} cards</strong><span>{Math.floor(modeStats.flashcards.focusSeconds / 60)} review minutes</span></article>
        </div>
      </section>

      <section className="study-chart" aria-labelledby="study-chart-title"><h2 id="study-chart-title">Focus Minutes — Last 7 Days</h2><div className="study-chart__bars">{dailyChart.map((day, index) => <div key={`${day.label}-${index}`}><span className="study-chart__value">{day.minutes}</span><span className="study-chart__bar" style={{ height: `${Math.max((day.minutes / chartMax) * 100, 3)}%` }} title={`${day.minutes} minutes, ${day.pomodoros} Pomodoros`} /><small>{day.label}</small></div>)}</div></section>
    </main>
  );
}

export default Study;
