import { useState } from "react";
import type { DragEvent, FormEvent } from "react";
import "../styles/eisenhower.css";

type QuadrantID = 
    | "do-now"
    | "schedule"
    | "delegate"
    | "later";

type Task = {
    id: string;
    title: string;
    quadrant: QuadrantID;
    completed: boolean;
};

type Quadrant = {
    id: QuadrantID;
    title: string;
    description: string;
};

const quadrants: Quadrant[] = [
    {
        id: "do-now",
        title: "Do Now",
        description: "Important and Urgent",

    },

    {
        id: "schedule",
        title: "Schedule",
        description: "Important but Not Urgent",

    },

    {
        id: "delegate",
        title: "Delegate",
        description: "Not Important but Urgent",
    },

    {
        id: "later",
        title: "Later",
        description: "Not Important and Not Urgent",
    },
];

export default function Eisenhower() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskTitle, setTaskTitle] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    function addTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedTitle = taskTitle.trim();

        if (!trimmedTitle) return;

        const newTask: Task = {
            id: crypto.randomUUID(),
            title: trimmedTitle,
            quadrant: "later",
            completed: false,
        };

        setTasks((currentTasks) => [...currentTasks, newTask]);
        setTaskTitle("");
        setIsFormOpen(false);
    }

    function deleteTask(taskId: string) {
        setTasks((currentTasks) =>
            currentTasks.filter((task) => task.id !== taskId),
          );
    }

    function toggleTask(taskId: string) {
        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === taskId
              ? { ...task, completed: !task.completed }
              : task,
          ),
        );
      }

      function handleDragStart(taskId: string) {
        setDraggedTaskId(taskId);
      }
    
      function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
      }

      function handleDragEnd() {
        setDraggedTaskId(null);
      }
    
      function handleDrop(quadrantId: QuadrantID) {
        if (!draggedTaskId) return;
    
        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === draggedTaskId
              ? { ...task, quadrant: quadrantId }
              : task,
          ),
        );
    
        setDraggedTaskId(null);
      }
    
      return (
        <main className="planner">
          <header className="planner__header">
            <div>
              <h1>Planner</h1>
              <p>Prioritize your tasks using the Eisenhower Matrix.</p>
            </div>
    
            <button type="button" onClick={() => setIsFormOpen(true)}>
              Add task
            </button>
          </header>
    
          {isFormOpen && (
            <form className="task-form" onSubmit={addTask}>
              <label htmlFor="task-title">Task title</label>
    
              <input
                id="task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="What do you need to do?"
                autoFocus
              />
    
              <button type="submit">Add task</button>
    
              <button type="button" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
            </form>
          )}
    
          <section className="matrix">
            {quadrants.map((quadrant) => {
              const quadrantTasks = tasks.filter(
                (task) => task.quadrant === quadrant.id,
              );
    
              return (
                <div
                  key={quadrant.id}
                  className={`matrix__quadrant matrix__quadrant--${quadrant.id}`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(quadrant.id)}
                >
                  <header>
                    <h2>{quadrant.title}</h2>
                    <p>{quadrant.description}</p>
                  </header>
    
                  <div className="matrix__tasks">
                    {quadrantTasks.length === 0 && (
                      <p className="matrix__empty">Drop tasks here</p>
                    )}
    
                    {quadrantTasks.map((task) => (
                      <article
                        key={task.id}
                        className="task-card"
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          aria-label={`Complete ${task.title}`}
                        />
    
                        <span>{task.title}</span>
    
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          aria-label={`Delete ${task.title}`}
                        >
                          &times;
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      );
}
