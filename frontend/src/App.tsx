import { useEffect, useState } from 'react'
import './App.css'

interface CurriculumItem {
  id: number
  name: string
}

async function fetchItems(path: string, signal: AbortSignal): Promise<CurriculumItem[]> {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error('Curriculum unavailable')
  return response.json()
}

function App() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [grades, setGrades] = useState<CurriculumItem[] | null>(null)
  const [gradeError, setGradeError] = useState(false)
  const [subjectResult, setSubjectResult] = useState<{ gradeId: number; items: CurriculumItem[] | null } | null>(null)
  const [apiStatus, setApiStatus] = useState('Checking connection...')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json()
      })
      .then((data) => {
        setApiStatus(data.status === 'ok' ? 'API Connected' : 'API Unavailable')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setApiStatus('API Offline')
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchItems('/api/grades', controller.signal)
      .then(setGrades)
      .catch(() => {
        if (!controller.signal.aborted) setGradeError(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedGrade === null) return
    const controller = new AbortController()
    fetchItems(`/api/grades/${selectedGrade}/subjects`, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setSubjectResult({ gradeId: selectedGrade, items })
      })
      .catch(() => {
        if (!controller.signal.aborted) setSubjectResult({ gradeId: selectedGrade, items: null })
      })
    return () => controller.abort()
  }, [selectedGrade])

  const gradeName = grades?.find((grade) => grade.id === selectedGrade)?.name
  const currentSubjects = subjectResult?.gradeId === selectedGrade ? subjectResult : null

  return (
    <main className="app">
      <header className="header">
        <div className="brand">📚 Education Made Assessable</div>
        <span className="header-label">{apiStatus}</span>
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
        {gradeError && <p role="alert">Grades are temporarily unavailable.</p>}
        {!gradeError && grades === null && <p role="status">Loading grades…</p>}
        {grades?.length === 0 && <p>No grades are available yet.</p>}
        <div className="grade-grid">
          {grades?.map((grade) => (
            <button
              key={grade.id}
              className={`grade-card ${selectedGrade === grade.id ? 'active' : ''}`}
              onClick={() => {
                if (selectedGrade !== grade.id) {
                  setSubjectResult(null)
                  setSelectedGrade(grade.id)
                }
              }}
              aria-pressed={selectedGrade === grade.id}
            >
              <span className="grade-icon">🎒</span>
              <strong>{grade.name}</strong>
              <small>Explore subjects</small>
            </button>
          ))}
        </div>

        {selectedGrade !== null && (
          <section className="subjects">
            <h2>{gradeName} Subjects</h2>
            {currentSubjects === null && <p role="status">Loading subjects…</p>}
            {currentSubjects?.items === null && <p role="alert">Subjects are temporarily unavailable.</p>}
            {currentSubjects?.items?.length === 0 && <p>No subjects are available for this grade.</p>}
            <div className="subject-grid">
              {currentSubjects?.items?.map((subject) => (
                <div className="subject-card" key={subject.id}>
                  <span>📖</span>
                  <strong>{subject.name}</strong>
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
