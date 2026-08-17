import { useState } from "react";
import "../styles/study.css";

const courses = [
    {
        id: "course-1", 
        name: "Calculus I",
    },
    {
        id: "course-2",
        name: "Computer Science"
    },

];

const studySets = [
    {
        id: "study-set-1",
        name: "Calculus I Formulas",
    },
    {
        id: "study-set-2",
        name: "React Concepts",
    },
];

function Study() {
  return (
    <main className="study-page">
      <header className="study-page__header">
        <div>
          <h1>Study</h1>
          <p>Choose a focus and start a study session.</p>
        </div>
      </header>

      <section className="study-setup" aria-labelledby="study-setup-title">
        <h2 id="study-setup-title">Set Up Your Session</h2>

        <label>
          What are you studying?
          <select defaultValue="">
            const [selectedStudyItem, setSelectedStudyItem] = useState("");
            <option value="" disabled>
              Select a course or study set
            </option>
            <optgroup label="Courses">
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Flashcard Study Sets">
              {studySets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <fieldset>
          <legend>Study mode</legend>
          {/* TODO: Use this value to render the appropriate study tool. */}
          <label>
            <input type="radio" name="study-mode" value="pomodoro" defaultChecked />
            Pomodoro
          </label>
          <label>
            <input type="radio" name="study-mode" value="stopwatch" />
            Stopwatch
          </label>
          <label>
            <input type="radio" name="study-mode" value="flashcards" />
            Flashcard Review
          </label>
        </fieldset>
      </section>

      <div className="study-workspace">
        <section className="study-session" aria-labelledby="current-session-title">
          <header>
            <h2 id="current-session-title">Current Session</h2>
            <span>Not started</span>
          </header>

          {/* TODO: Replace with the timer or flashcard-review component. */}
          <div className="study-timer" aria-label="Study timer">
            25:00
          </div>

          <div className="study-session__actions">
            {/* TODO: Add start, pause, reset, and finish-session handlers. */}
            <button type="button">Start Session</button>
            <button type="button">Reset</button>
          </div>

          <label>
            Session goals
            {/* TODO: Save goals and allow users to mark them complete. */}
            <textarea placeholder="Example: Review 20 flashcards" />
          </label>

          <label>
            Session notes
            {/* TODO: Save notes with the completed study session. */}
            <textarea placeholder="Write down key ideas or questions..." />
          </label>
        </section>

        <aside className="study-progress" aria-labelledby="study-progress-title">
          <h2 id="study-progress-title">Today&apos;s Progress</h2>
          {/* TODO: Calculate these values from saved study sessions. */}
          <dl>
            <div>
              <dt>Minutes studied</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>Cards reviewed</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>Goals completed</dt>
              <dd>0</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

export default Study;
