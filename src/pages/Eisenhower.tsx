import { useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import "../styles/eisenhower.css";

/*
TODO LATER: Replace the static Planner page header with a personalized greeting.
TODO LATER: Add a planner summary / dashboard underneath the header.
TODO LATER: Add quick task views.
TODO LATER: Allow users to filter tasks by class / subject.
TODO LATER: Add subtasks / checklists inside tasks.
TODO LATER: Explore connecting Planner tasks with the Flashcards and Study features.
*/

const TASK_STORAGE_KEY = "polyplanner-tasks";
const SESSION_STORAGE_KEY = "polyplanner-study-sessions";

type QuadrantID = "do-now" | "schedule" | "delegate" | "later";
type TaskFilter = "all" | "incomplete" | "completed";

export type PlannerTask = {
  id: string;
  title: string;
  subject: string;
  type: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: string;
  important: boolean;
  urgent: boolean;
  quadrant: QuadrantID;
  completed: boolean;
};

type TaskDraft = Omit<PlannerTask, "id" | "quadrant" | "completed">;

const emptyDraft: TaskDraft = {
  title: "",
  subject: "",
  type: "Homework",
  description: "",
  dueDate: "",
  dueTime: "",
  priority: "",
  important: false,
  urgent: false,
};

const quadrants: { id: QuadrantID; title: string; description: string }[] = [
  { id: "do-now", title: "Do Now", description: "Important and Urgent" },
  { id: "schedule", title: "Schedule", description: "Important but Not Urgent" },
  { id: "delegate", title: "Delegate", description: "Not Important but Urgent" },
  { id: "later", title: "Later", description: "Not Important and Not Urgent" },
];

function quadrantFor(important: boolean, urgent: boolean): QuadrantID {
  if (important && urgent) return "do-now";
  if (important) return "schedule";
  if (urgent) return "delegate";
  return "later";
}

function flagsFor(quadrant: QuadrantID) {
  return {
    important: quadrant === "do-now" || quadrant === "schedule",
    urgent: quadrant === "do-now" || quadrant === "delegate",
  };
}

function readTasks(): PlannerTask[] {
  try {
    const stored = localStorage.getItem(TASK_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as PlannerTask[]) : [];
  } catch {
    return [];
  }
}

function readTaskStudyTotals() {
  const sessions = readStoredSessions();
  return sessions.reduce<Record<string, { seconds: number; pomodoros: number }>>((totals, session) => {
    if (!session.plannerTaskId) return totals;
    const current = totals[session.plannerTaskId] ?? { seconds: 0, pomodoros: 0 };
    totals[session.plannerTaskId] = {
      seconds: current.seconds + (session.focusSeconds ?? 0),
      pomodoros: current.pomodoros + (session.pomodorosCompleted ?? 0),
    };
    return totals;
  }, {});
}

function readStoredSessions(): { plannerTaskId?: string | null; focusSeconds?: number; pomodorosCompleted?: number }[] {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function Eisenhower() {
  const [tasks, setTasks] = useState<PlannerTask[]>(readTasks);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [completedOpen, setCompletedOpen] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const studyTotals = readTaskStudyTotals();

  useEffect(() => {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  function updateDraft<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setDraft(emptyDraft);
    setEditingTaskId(null);
    setIsFormOpen(false);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const taskValues = { ...draft, title, quadrant: quadrantFor(draft.important, draft.urgent) };

    if (editingTaskId) {
      setTasks((current) => current.map((task) => (
        task.id === editingTaskId ? { ...task, ...taskValues } : task
      )));
    } else {
      setTasks((current) => [...current, {
        ...taskValues,
        id: crypto.randomUUID(),
        completed: false,
      }]);
    }
    closeForm();
  }

  function editTask(task: PlannerTask) {
    const { id, quadrant, completed, ...values } = task;
    void id; void quadrant; void completed;
    setDraft(values);
    setEditingTaskId(task.id);
    setIsFormOpen(true);
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function toggleTask(taskId: string) {
    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )));
  }

  function moveTask(taskId: string, quadrant: QuadrantID, beforeTaskId?: string) {
    setTasks((current) => {
      const moving = current.find((task) => task.id === taskId);
      if (!moving) return current;
      const rest = current.filter((task) => task.id !== taskId);
      const updated = { ...moving, ...flagsFor(quadrant), quadrant };
      const targetIndex = beforeTaskId ? rest.findIndex((task) => task.id === beforeTaskId) : -1;
      if (targetIndex < 0) return [...rest, updated];
      return [...rest.slice(0, targetIndex), updated, ...rest.slice(targetIndex)];
    });
    setDraggedTaskId(null);
  }

  function dropOnTask(event: DragEvent<HTMLElement>, target: PlannerTask) {
    event.preventDefault();
    event.stopPropagation();
    if (draggedTaskId && draggedTaskId !== target.id) moveTask(draggedTaskId, target.quadrant, target.id);
  }

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const showMatrix = filter !== "completed";
  const showCompleted = filter !== "incomplete";

  return (
    <main className="planner">
      <header className="planner__header">
        <div><h1>Planner</h1><p>Prioritize your tasks using the Eisenhower Matrix.</p></div>
        <button type="button" onClick={() => setIsFormOpen(true)}>Add task</button>
      </header>

      <nav className="task-filters" aria-label="Task filters">
        {(["all", "incomplete", "completed"] as const).map((value) => (
          <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
            {value === "all" ? "All Tasks" : value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>

      {isFormOpen && (
        <form className="task-form" onSubmit={saveTask}>
          <h2>{editingTaskId ? "Edit task" : "Add task"}</h2>
          <label>Task title<input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} required autoFocus /></label>
          <label>Class / Subject<input value={draft.subject} onChange={(e) => updateDraft("subject", e.target.value)} placeholder="CS 4800, Personal…" /></label>
          <label>Task type<select value={draft.type} onChange={(e) => updateDraft("type", e.target.value)}>{["Homework", "Project", "Study", "Exam", "Quiz", "Personal", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Priority<select value={draft.priority} onChange={(e) => updateDraft("priority", e.target.value)}><option value="">None</option><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label>Due date<input type="date" value={draft.dueDate} onChange={(e) => updateDraft("dueDate", e.target.value)} /></label>
          <label>Due time<input type="time" value={draft.dueTime} onChange={(e) => updateDraft("dueTime", e.target.value)} /></label>
          <label className="task-form__description">Description / Notes<textarea value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} /></label>
          <fieldset>
            <legend>Classification</legend>
            <label><input type="checkbox" checked={draft.important} onChange={(e) => updateDraft("important", e.target.checked)} /> Important</label>
            <label><input type="checkbox" checked={draft.urgent} onChange={(e) => updateDraft("urgent", e.target.checked)} /> Urgent</label>
          </fieldset>
          <div className="task-form__actions"><button type="submit">{editingTaskId ? "Save changes" : "Add task"}</button><button type="button" onClick={closeForm}>Cancel</button></div>
        </form>
      )}

      {showMatrix && (
        <section className="matrix">
          {quadrants.map((quadrant) => {
            const quadrantTasks = incompleteTasks.filter((task) => task.quadrant === quadrant.id);
            return (
              <div key={quadrant.id} className={`matrix__quadrant matrix__quadrant--${quadrant.id}`} onDragOver={(e) => e.preventDefault()} onDrop={() => draggedTaskId && moveTask(draggedTaskId, quadrant.id)}>
                <header><h2>{quadrant.title}</h2><p>{quadrant.description}</p></header>
                <div className="matrix__tasks">
                  {quadrantTasks.length === 0 && <p className="matrix__empty">Drop tasks here</p>}
                  {quadrantTasks.map((task) => (
                    <TaskCard key={task.id} task={task} studyTotal={studyTotals[task.id]} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} onDragStart={setDraggedTaskId} onDrop={dropOnTask} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {showCompleted && (
        <section className="completed-tasks">
          <button type="button" className="completed-tasks__toggle" onClick={() => setCompletedOpen((open) => !open)} aria-expanded={completedOpen}>
            Completed Tasks ({completedTasks.length}) <span>{completedOpen ? "−" : "+"}</span>
          </button>
          {completedOpen && (completedTasks.length === 0 ? <p>No completed tasks yet.</p> : (
            <div className="completed-tasks__list">{completedTasks.map((task) => <TaskCard key={task.id} task={task} studyTotal={studyTotals[task.id]} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />)}</div>
          ))}
        </section>
      )}
    </main>
  );
}

type TaskCardProps = {
  task: PlannerTask;
  studyTotal?: { seconds: number; pomodoros: number };
  onToggle: (id: string) => void;
  onEdit: (task: PlannerTask) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDrop?: (event: DragEvent<HTMLElement>, task: PlannerTask) => void;
};

function TaskCard({ task, studyTotal, onToggle, onEdit, onDelete, onDragStart, onDrop }: TaskCardProps) {
  const details = [task.subject, task.type, task.priority && `${task.priority} priority`, task.dueDate && `Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}`].filter(Boolean);
  return (
    <article className="task-card" draggable={Boolean(onDragStart)} onDragStart={() => onDragStart?.(task.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop?.(e, task)}>
      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} aria-label={`Complete ${task.title}`} />
      <div className="task-card__content"><strong>{task.title}</strong>{details.length > 0 && <small>{details.join(" · ")}</small>}{task.description && <p>{task.description}</p>}{studyTotal && <small className="task-card__study">{studyTotal.pomodoros} Pomodoros · {Math.floor(studyTotal.seconds / 60)} minutes studied</small>}</div>
      <div className="task-card__actions"><button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>Edit</button><button type="button" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}>&times;</button></div>
    </article>
  );
}
