package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-sql-driver/mysql"
)

type curriculumItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type chapter struct {
	curriculumItem
	GradeID int64 `json:"gradeId"`
	Number  int   `json:"chapterNumber"`
}

type chapterTranslation struct {
	LanguageCode string  `json:"languageCode"`
	Title        string  `json:"title"`
	Content      *string `json:"content"`
	PDFURL       *string `json:"pdfUrl,omitempty"`
}

func scanItem(rows *sql.Rows, item *curriculumItem) error {
	return rows.Scan(&item.ID, &item.Name)
}

func registerCurriculum(mux *http.ServeMux, db *sql.DB) {
	mux.HandleFunc("GET /api/grades", curriculumList(db, "", `
		SELECT id, grade_name FROM grades ORDER BY grade_number`, scanItem))
	mux.HandleFunc("GET /api/grades/{gradeID}/subjects", curriculumList(db, "gradeID", `
		SELECT s.id, s.subject_name FROM subjects AS s
		WHERE EXISTS (SELECT 1 FROM grade_subjects AS gs WHERE gs.subject_id = s.id AND gs.grade_id = ?)
		ORDER BY s.subject_name, s.id`, scanItem))
	mux.HandleFunc("GET /api/subjects/{subjectID}/chapters", curriculumList(db, "subjectID", `
		SELECT c.id, c.chapter_title, c.grade_id, c.chapter_number FROM chapters AS c
		JOIN grades AS g ON g.id = c.grade_id
		WHERE c.subject_id = ? ORDER BY g.grade_number, c.chapter_number`, func(rows *sql.Rows, item *chapter) error {
		return rows.Scan(&item.ID, &item.Name, &item.GradeID, &item.Number)
	}))
	mux.HandleFunc("GET /api/chapters/{chapterID}/content", curriculumList(db, "chapterID", `
		SELECT language_code, title, content, pdf_url FROM chapter_content
		WHERE chapter_id = ? ORDER BY language_code`, func(rows *sql.Rows, item *chapterTranslation) error {
		return rows.Scan(&item.LanguageCode, &item.Title, &item.Content, &item.PDFURL)
	}))
}

func curriculumList[T any](db *sql.DB, pathKey, query string, scan func(*sql.Rows, *T) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var args []any
		if pathKey != "" {
			id, err := strconv.ParseInt(r.PathValue(pathKey), 10, 64)
			if err != nil || id <= 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID must be a positive integer"})
				return
			}
			args = append(args, id)
		}
		if db == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "curriculum database unavailable"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		items, err := readCurriculum(ctx, db, query, args, scan)
		if err != nil {
			var mysqlError *mysql.MySQLError
			if errors.As(err, &mysqlError) {
				log.Printf("Curriculum read failed for %s (MySQL error %d)", r.Pattern, mysqlError.Number)
			} else {
				log.Printf("Curriculum read failed for %s (%T)", r.Pattern, err)
			}
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "curriculum database unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func readCurriculum[T any](ctx context.Context, db *sql.DB, query string, args []any, scan func(*sql.Rows, *T) error) ([]T, error) {
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]T, 0)
	for rows.Next() {
		var item T
		if err := scan(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("Failed to write curriculum response: %v", err)
	}
}
