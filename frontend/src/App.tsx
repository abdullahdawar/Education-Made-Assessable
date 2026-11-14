import { useState } from 'react'
import './App.css'

const grades = [1, 2, 3, 4, 5, 6]

const subjects = [
  'Mathematics',
  'English',
  'Urdu',
  'Pakistan Studies',
  'Islamiyat',
  'Science',
]

function App() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)

  const availableSubjects =
    selectedGrade === null
      ? []
      : selectedGrade >= 4
        ? [...subjects, 'Computer Science']
        : subjects

  return (
    <main className="app">
      <header className="header">
        <div className="brand">📚 Education Made Assessable</div>
        <span className="header-label">Learning Platform</span>
      </header>

      <section className="hero">
        <p className="eyebrow">WELCOME TO YOUR LEARNING SPACE</p>
        <h1>Learning made simple. Progress made visible.</h1>
        <p>
          Explore lessons, practice worksheets, and assessments
          designed for students in Grades 1–6.
        </p>
      </section>

      <section className="content">
        <h2>Choose your grade</h2>
        <div className="grade-grid">
          {grades.map((grade) => (
            <button
              key={grade}
              className={`grade-card ${selectedGrade === grade ? 'active' : ''}`}
              onClick={() => setSelectedGrade(grade)}
              aria-pressed={selectedGrade === grade}
            >
              <span className="grade-icon">🎒</span>
              <strong>Grade {grade}</strong>
              <small>Explore subjects</small>
            </button>
          ))}
        </div>

        {selectedGrade !== null && (
          <section className="subjects">
            <h2>Grade {selectedGrade} Subjects</h2>
            <div className="subject-grid">
              {availableSubjects.map((subject) => (
                <div className="subject-card" key={subject}>
                  <span>📖</span>
                  <strong>{subject}</strong>
                  <small>Lessons coming soon</small>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
