package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
)

type v2Grade struct {
	ID    int    `json:"id"`
	Label v2Text `json:"label"`
}

type v2Course struct {
	ID             int64  `json:"id"`
	Grade          int    `json:"grade"`
	Slug           string `json:"slug"`
	Label          v2Text `json:"label"`
	Description    v2Text `json:"description"`
	Framework      string `json:"framework"`
	UnitCount      int    `json:"unitCount"`
	CompletedCount int    `json:"completedCount"`
}

type v2UnitSummary struct {
	ID             int64  `json:"id"`
	Slug           string `json:"slug"`
	Label          v2Text `json:"label"`
	Description    v2Text `json:"description"`
	Position       int    `json:"position"`
	Availability   string `json:"availability"`
	CompletedCount int    `json:"completedCount"`
}

const v2CourseSelect = `SELECT c.id,c.grade,c.subject,s.label_en,s.label_ps,s.description_en,s.description_ps,s.framework
 FROM v2_courses c JOIN v2_subjects s ON s.slug=c.subject`

func (c *v2Course) scan() []any {
	return []any{&c.ID, &c.Grade, &c.Slug, &c.Label.En, &c.Label.Ps, &c.Description.En, &c.Description.Ps, &c.Framework}
}

func v2CurriculumFailure(w http.ResponseWriter, r *http.Request, err error) {
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "content not found"})
		return
	}
	log.Printf("v2 curriculum %s: %T", r.Pattern, err)
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "curriculum temporarily unavailable"})
}

func v2CurriculumPathID(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid ID"})
		return 0, false
	}
	return id, true
}

func registerV2Curriculum(mux *http.ServeMux, db *sql.DB, assets *os.Root) {
	handle := func(pattern string, handler http.HandlerFunc) {
		mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "private, no-store")
			if db == nil {
				writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "curriculum database unavailable"})
				return
			}
			handler(w, r)
		})
	}
	handle("GET /api/v2/grades", func(w http.ResponseWriter, r *http.Request) {
		grades, err := readCurriculum(r.Context(), db, "SELECT id,label_en,label_ps FROM v2_grades ORDER BY id", nil, func(rows *sql.Rows, g *v2Grade) error {
			return rows.Scan(&g.ID, &g.Label.En, &g.Label.Ps)
		})
		if err != nil {
			v2CurriculumFailure(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"grades": grades})
	})
	handle("GET /api/v2/grades/{grade}/subjects", func(w http.ResponseWriter, r *http.Request) {
		grade, ok := v2CurriculumPathID(w, r, "grade")
		if !ok {
			return
		}
		if grade > 6 {
			v2CurriculumFailure(w, r, sql.ErrNoRows)
			return
		}
		courses, err := readCurriculum(r.Context(), db, v2CourseSelect+" WHERE c.grade=? ORDER BY s.minimum_grade,c.subject", []any{grade}, func(rows *sql.Rows, c *v2Course) error {
			return rows.Scan(c.scan()...)
		})
		if err != nil {
			v2CurriculumFailure(w, r, err)
			return
		}
		learner, err := v2Learner(w, r, db)
		if err != nil {
			v2Failure(w, err)
			return
		}
		for i := range courses {
			progress, err := v2Progress(r.Context(), db, courses[i].ID, learner)
			if err != nil {
				v2Failure(w, err)
				return
			}
			courses[i].UnitCount = len(progress)
			for _, unit := range progress {
				if unit.CompletedAssessments >= 2 {
					courses[i].CompletedCount++
				}
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"subjects": courses})
	})
	handle("GET /api/v2/courses/{course}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := v2CurriculumPathID(w, r, "course")
		if !ok {
			return
		}
		var course v2Course
		if err := db.QueryRowContext(r.Context(), v2CourseSelect+" WHERE c.id=?", id).Scan(course.scan()...); err != nil {
			v2CurriculumFailure(w, r, err)
			return
		}
		progress, ok := v2CourseProgress(w, r, db, id)
		if !ok {
			return
		}
		rows, err := db.QueryContext(r.Context(), "SELECT id,slug,position,state,payload FROM v2_units WHERE course_id=? AND state!='archived' ORDER BY position", id)
		if err != nil {
			v2CurriculumFailure(w, r, err)
			return
		}
		defer rows.Close()
		units := []v2UnitSummary{}
		for rows.Next() {
			var s v2UnitSummary
			var state string
			var raw []byte
			if err := rows.Scan(&s.ID, &s.Slug, &s.Position, &state, &raw); err != nil {
				v2CurriculumFailure(w, r, err)
				return
			}
			var content v2Content
			if err := json.Unmarshal(raw, &content); err != nil {
				v2CurriculumFailure(w, r, err)
				return
			}
			s.Label, s.Description = content.Label, content.Description
			s.Availability = "incomplete"
			if state == "published" {
				course.UnitCount++
				s.Availability = "locked"
				for _, p := range progress {
					if p.UnitID != s.ID {
						continue
					}
					s.CompletedCount = p.CompletedAssessments
					if p.Unlocked {
						s.Availability = "available"
					}
					if p.CompletedAssessments >= 2 {
						s.Availability = "completed"
						course.CompletedCount++
					}
					break
				}
			}
			units = append(units, s)
		}
		if err := rows.Err(); err != nil {
			v2CurriculumFailure(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, struct {
			v2Course
			Units []v2UnitSummary `json:"units"`
		}{course, units})
	})
	loadUnit := func(w http.ResponseWriter, r *http.Request) (int64, int64, string, v2Content, bool) {
		id, ok := v2CurriculumPathID(w, r, "id")
		if !ok || !v2RequireUnit(w, r, db, id) {
			return 0, 0, "", v2Content{}, false
		}
		var course int64
		var slug string
		var raw []byte
		var content v2Content
		if err := db.QueryRowContext(r.Context(), "SELECT course_id,slug,payload FROM v2_units WHERE id=? AND state='published'", id).Scan(&course, &slug, &raw); err != nil {
			v2CurriculumFailure(w, r, err)
			return 0, 0, "", content, false
		}
		if err := json.Unmarshal(raw, &content); err != nil {
			v2CurriculumFailure(w, r, err)
			return 0, 0, "", content, false
		}
		return id, course, slug, content, true
	}
	handle("GET /api/v2/units/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, course, slug, content, ok := loadUnit(w, r)
		if !ok {
			return
		}
		images := map[string]*v2Resource{}
		for i := range content.Resources {
			item := &content.Resources[i]
			item.URL = fmt.Sprintf("/api/v2/units/%d/resources/%s", id, item.ID)
			item.Path = ""
			if item.Kind == "illustration" {
				images[item.ID] = item
			}
		}
		for i := range content.Activities {
			for j := range content.Activities[i].Rounds {
				round := &content.Activities[i].Rounds[j]
				round.Image = images[round.ResourceID]
			}
		}
		writeJSON(w, http.StatusOK, struct {
			ID       int64  `json:"id"`
			CourseID int64  `json:"courseId"`
			Slug     string `json:"slug"`
			v2Content
		}{id, course, slug, content})
	})
	handle("GET /api/v2/units/{id}/resources/{resource}", func(w http.ResponseWriter, r *http.Request) {
		_, _, _, content, ok := loadUnit(w, r)
		if !ok {
			return
		}
		for _, item := range content.Resources {
			if item.ID != r.PathValue("resource") {
				continue
			}
			file, err := openV2Resource(assets, item)
			if err != nil {
				v2CurriculumFailure(w, r, sql.ErrNoRows)
				return
			}
			defer file.Close()
			info, err := file.Stat()
			if err != nil {
				v2CurriculumFailure(w, r, sql.ErrNoRows)
				return
			}
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Content-Security-Policy", "sandbox")
			if strings.HasSuffix(strings.ToLower(item.Path), ".pdf") {
				w.Header().Set("Content-Type", "application/pdf")
			}
			http.ServeContent(w, r, path.Base(item.Path), info.ModTime(), file)
			return
		}
		v2CurriculumFailure(w, r, sql.ErrNoRows)
	})
}
