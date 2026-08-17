import { useState } from "react";
import "../styles/flashcards.css";

type StudySet = {
  id: string;
  title: string;
  description?: string;
};

type Flashcard = {
  id: string;
  studySetId: string;
  question: string;
  answer: string;
};

// Temporary data until Supabase is connected.
const initialStudySets: StudySet[] = [];
const initialFlashcards: Flashcard[] = [];

export default function Flashcards() {
  const [studySets, setStudySets] = useState<StudySet[]>(initialStudySets);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [isStudySetFormOpen, setIsStudySetFormOpen] = useState(false);
  const [isFlashcardFormOpen, setIsFlashcardFormOpen] = useState(false);

  const [selectedStudySetId, setSelectedStudySetId] = useState<string | null>(
    initialStudySets[0]?.id ?? null,
  );

  const selectedStudySet = studySets.find(
    (studySet) => studySet.id === selectedStudySetId,
  );

  const selectedFlashcards = flashcards.filter(
    (flashcard) => flashcard.studySetId === selectedStudySetId,
  );

  function openStudySetForm() {
    setIsStudySetFormOpen(true);
  }

  function createStudySet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title) return;

    const studySet: StudySet = {
      id: crypto.randomUUID(),
      title,
      description: description || undefined,
    };

    setStudySets((currentStudySets) => [...currentStudySets, studySet]);
    setSelectedStudySetId(studySet.id);
    setIsStudySetFormOpen(false);
  }

  function openFlashcardForm() {
    if (selectedStudySetId) setIsFlashcardFormOpen(true);
  }

  function createFlashcard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStudySetId) return;

    const form = new FormData(event.currentTarget);
    const question = String(form.get("question") ?? "").trim();
    const answer = String(form.get("answer") ?? "").trim();

    if (!question || !answer) return;

    setFlashcards((currentFlashcards) => [
      ...currentFlashcards,
      {
        id: crypto.randomUUID(),
        studySetId: selectedStudySetId,
        question,
        answer,
      },
    ]);
    setIsFlashcardFormOpen(false);
  }

  return (
    <main className="flashcards-page">
      <header className="flashcards-page__header">
        <div>
          <h1>Flashcards</h1>
          <p>Create and organize flashcards into study sets.</p>
        </div>

        <div className="flashcards-page__actions">
          <button type="button" onClick={openStudySetForm}>
            Create New Study Set
          </button>

          <button
            type="button"
            onClick={openFlashcardForm}
            disabled={!selectedStudySet}
          >
            Create Flashcard
          </button>
        </div>
      </header>

      {isStudySetFormOpen && (
        <dialog open aria-labelledby="create-study-set-title">
          <form method="dialog" onSubmit={createStudySet}>
            <h2 id="create-study-set-title">Create Study Set</h2>

            <label>
              Title
              <input name="title" required autoFocus />
            </label>

            <label>
              Description
              <textarea name="description" />
            </label>

            <div>
              <button
                type="button"
                onClick={() => setIsStudySetFormOpen(false)}
              >
                Cancel
              </button>
              <button type="submit">Create</button>
            </div>
          </form>
        </dialog>
      )}

      {isFlashcardFormOpen && (
        <dialog open aria-labelledby="create-flashcard-title">
          <form method="dialog" onSubmit={createFlashcard}>
            <h2 id="create-flashcard-title">Create Flashcard</h2>

            <label>
              Question
              <textarea name="question" required autoFocus />
            </label>

            <label>
              Answer
              <textarea name="answer" required />
            </label>

            <div>
              <button
                type="button"
                onClick={() => setIsFlashcardFormOpen(false)}
              >
                Cancel
              </button>
              <button type="submit">Create</button>
            </div>
          </form>
        </dialog>
      )}

      <section className="flashcards-workspace">
        <aside
          className="study-sets-panel"
          aria-labelledby="study-sets-title"
        >
          <header>
            <h2 id="study-sets-title">Study Sets</h2>
          </header>

          <div className="study-sets-panel__list">
            {studySets.length === 0 ? (
              <p className="study-sets-panel__empty">
                Create your first study set to get started.
              </p>
            ) : (
              studySets.map((studySet) => {
                const cardCount = flashcards.filter(
                  (flashcard) => flashcard.studySetId === studySet.id,
                ).length;

                const isSelected =
                  studySet.id === selectedStudySetId;

                return (
                  <button
                    key={studySet.id}
                    type="button"
                    className={
                      isSelected
                        ? "study-set-item study-set-item--selected"
                        : "study-set-item"
                    }
                    onClick={() => setSelectedStudySetId(studySet.id)}
                  >
                    <span>{studySet.title}</span>
                    <small>{cardCount} cards</small>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className="flashcards-panel"
          aria-labelledby="flashcards-panel-title"
        >
          <header className="flashcards-panel__header">
            <div>
              <h2 id="flashcards-panel-title">
                {selectedStudySet?.title ?? "Flashcards"}
              </h2>

              {selectedStudySet?.description && (
                <p>{selectedStudySet.description}</p>
              )}
            </div>

            {selectedStudySet && (
              <span>{selectedFlashcards.length} cards</span>
            )}
          </header>

          {!selectedStudySet ? (
            <p className="flashcards-panel__empty">
              Select or create a study set to view its flashcards.
            </p>
          ) : selectedFlashcards.length === 0 ? (
            <p className="flashcards-panel__empty">
              This study set does not have any flashcards yet.
            </p>
          ) : (
            <div className="flashcards-grid">
              {selectedFlashcards.map((flashcard) => (
                <article
                  key={flashcard.id}
                  className="flashcard-item"
                >
                  <h3>{flashcard.question}</h3>
                  <p>{flashcard.answer}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
