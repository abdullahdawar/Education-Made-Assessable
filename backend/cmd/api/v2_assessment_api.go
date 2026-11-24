package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const v2CurrentVersion = `v.version=(SELECT MAX(latest.version) FROM v2_assessment_versions AS latest WHERE latest.assessment_id=a.id)`

type v2AttemptSummary struct {
	ID            int64  `json:"id"`
	AssessmentID  int64  `json:"assessmentId"`
	State         string `json:"state"`
	EarnedMarks   int    `json:"earnedMarks"`
	PossibleMarks int    `json:"possibleMarks"`
	PendingMarks  int    `json:"pendingMarks"`
	StartedAt     string `json:"startedAt"`
	SubmittedAt   string `json:"submittedAt,omitempty"`
}

type v2AttemptView struct {
	v2AttemptSummary
	UnitID           int64              `json:"unitId"`
	Slot             int                `json:"slot"`
	Title            v2Localized        `json:"title"`
	Instructions     v2Localized        `json:"instructions,omitempty"`
	TimeLimitSeconds int                `json:"timeLimitSeconds"`
	Deadline         string             `json:"deadline,omitempty"`
	Questions        []v2PublicQuestion `json:"questions"`
	Responses        map[string]string  `json:"responses"`
}

type v2Attempt struct {
	v2AttemptSummary
	UnitID     int64
	Definition v2AssessmentDefinition
	Responses  map[string]string
	Started    int64
	Submitted  sql.NullInt64
}

func (a *v2Attempt) deadline() int64 {
	if a.Definition.TimeLimitSeconds == 0 {
		return 0
	}
	return a.Started + int64(a.Definition.TimeLimitSeconds)*1000
}

func (a *v2Attempt) fillSummary() {
	a.PossibleMarks = a.Definition.possibleMarks()
	a.StartedAt = time.UnixMilli(a.Started).UTC().Format(time.RFC3339Nano)
	if a.Submitted.Valid {
		a.SubmittedAt = time.UnixMilli(a.Submitted.Int64).UTC().Format(time.RFC3339Nano)
	}
}

func (a *v2Attempt) public() v2AttemptView {
	a.fillSummary()
	output := v2AttemptView{
		v2AttemptSummary: a.v2AttemptSummary, UnitID: a.UnitID, Slot: a.Definition.Slot,
		Title: a.Definition.Title, Instructions: a.Definition.Instructions,
		TimeLimitSeconds: a.Definition.TimeLimitSeconds,
		Questions:        make([]v2PublicQuestion, 0, len(a.Definition.Questions)),
		Responses:        a.Responses,
	}
	if deadline := a.deadline(); deadline != 0 {
		output.Deadline = time.UnixMilli(deadline).UTC().Format(time.RFC3339Nano)
	}
	for _, q := range a.Definition.Questions {
		output.Questions = append(output.Questions, q.v2PublicQuestion)
	}
	return output
}

const v2AttemptQuery = `SELECT t.id,t.assessment_id,a.unit_id,t.state,t.responses,t.started_at,t.submitted_at,t.earned_marks,t.pending_marks,v.definition
	FROM v2_attempts t JOIN v2_assessments a ON a.id=t.assessment_id
	JOIN v2_assessment_versions v ON v.id=t.version_id`

type v2Scanner interface{ Scan(...any) error }

func v2ScanAttempt(row v2Scanner) (v2Attempt, error) {
	var a v2Attempt
	var raw, responses []byte
	err := row.Scan(&a.ID, &a.AssessmentID, &a.UnitID, &a.State, &responses, &a.Started, &a.Submitted, &a.EarnedMarks, &a.PendingMarks, &raw)
	if err != nil {
		return a, err
	}
	if err = json.Unmarshal(raw, &a.Definition); err != nil {
		return a, err
	}
	if err = json.Unmarshal(responses, &a.Responses); err != nil {
		return a, err
	}
	return a, nil
}

func registerV2Assessments(mux *http.ServeMux, db *sql.DB) {
	mux.HandleFunc("GET /api/v2/progress/{course}", func(w http.ResponseWriter, r *http.Request) {
		course, err := v2PathID(r, "course")
		if err != nil || db == nil {
			if err == nil {
				err = v2ErrNoDatabase
			}
			v2Failure(w, err)
			return
		}
		var exists int
		if err = db.QueryRowContext(r.Context(), `SELECT 1 FROM v2_courses WHERE id=?`, course).Scan(&exists); err != nil {
			v2Failure(w, err)
			return
		}
		progress, ok := v2CourseProgress(w, r, db, course)
		if ok {
			writeJSON(w, http.StatusOK, progress)
		}
	})

	mux.HandleFunc("GET /api/v2/units/{unit}/assessments", func(w http.ResponseWriter, r *http.Request) {
		unit, err := v2PathID(r, "unit")
		if err != nil {
			v2Failure(w, err)
			return
		}
		learner, err := v2Learner(w, r, db)
		if err != nil {
			v2Failure(w, err)
			return
		}
		if _, err = v2CheckUnit(r.Context(), db, learner, unit); err != nil {
			v2Failure(w, err)
			return
		}
		items, err := v2ListAssessments(r.Context(), db, learner, unit)
		if err != nil {
			v2Failure(w, err)
			return
		}
		writeJSON(w, http.StatusOK, items)
	})
	mux.HandleFunc("POST /api/v2/assessments/{assessment}/attempts", func(w http.ResponseWriter, r *http.Request) {
		if !v2Mutation(w, r) {
			return
		}
		assessment, err := v2PathID(r, "assessment")
		if err != nil {
			v2Failure(w, err)
			return
		}
		learner, err := v2Learner(w, r, db)
		if err != nil {
			v2Failure(w, err)
			return
		}
		ctx := r.Context()
		now := time.Now()
		if err = v2AllowAssessmentRequest(ctx, db, learner, now); err != nil {
			v2Failure(w, err)
			return
		}
		attempt, fresh, err := v2StartAttempt(ctx, db, learner, assessment, now)
		if err != nil {
			v2Failure(w, err)
			return
		}
		status := http.StatusOK
		if fresh {
			status = http.StatusCreated
		}
		writeJSON(w, status, attempt.public())
	})
	mux.HandleFunc("GET /api/v2/attempts/{attempt}", func(w http.ResponseWriter, r *http.Request) {
		attempt, err := v2PathID(r, "attempt")
		if err != nil {
			v2Failure(w, err)
			return
		}
		learner, err := v2Learner(w, r, db)
		if err != nil {
			v2Failure(w, err)
			return
		}
		item, err := v2ScanAttempt(db.QueryRowContext(r.Context(), v2AttemptQuery+` WHERE t.id=? AND t.learner_id=?`, attempt, learner))
		if err != nil {
			v2Failure(w, err)
			return
		}
		if item.State == "in_progress" {
			if _, err = v2CheckUnit(r.Context(), db, learner, item.UnitID); err != nil {
				v2Failure(w, err)
				return
			}
		}
		writeJSON(w, http.StatusOK, item.public())
	})
	for method, action := range map[string]string{
		"PUT /api/v2/attempts/{attempt}":         "save",
		"POST /api/v2/attempts/{attempt}/submit": "submit",
		"DELETE /api/v2/attempts/{attempt}":      "abandon",
	} {
		mux.HandleFunc(method, v2UpdateAttemptHandler(db, action))
	}
}

type v2AssessmentListItem struct {
	ID       int64              `json:"id"`
	Slot     int                `json:"slot"`
	Title    v2Localized        `json:"title"`
	Attempts []v2AttemptSummary `json:"attempts"`
}

func v2ListAssessments(ctx context.Context, db *sql.DB, learner, unit int64) ([]v2AssessmentListItem, error) {
	rows, err := db.QueryContext(ctx, `SELECT a.id,a.slot,JSON_EXTRACT(v.definition,'$.title')
		FROM v2_assessments a JOIN v2_assessment_versions v ON v.assessment_id=a.id
		WHERE a.unit_id=? AND v.state='published' AND `+v2CurrentVersion+` ORDER BY a.slot`, unit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []v2AssessmentListItem{}
	positions := map[int64]int{}
	for rows.Next() {
		var item v2AssessmentListItem
		var title []byte
		if err = rows.Scan(&item.ID, &item.Slot, &title); err != nil {
			return nil, err
		}
		if err = json.Unmarshal(title, &item.Title); err != nil {
			return nil, err
		}
		item.Attempts = []v2AttemptSummary{}
		positions[item.ID] = len(items)
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if err = rows.Close(); err != nil {
		return nil, err
	}
	history, err := db.QueryContext(ctx, v2AttemptQuery+`
		WHERE t.learner_id=? AND a.unit_id=? AND t.state IN ('submitted','in_progress')
		ORDER BY t.id DESC LIMIT 100`, learner, unit)
	if err != nil {
		return nil, err
	}
	defer history.Close()
	for history.Next() {
		attempt, err := v2ScanAttempt(history)
		if err != nil {
			return nil, err
		}
		if i, ok := positions[attempt.AssessmentID]; ok {
			attempt.fillSummary()
			items[i].Attempts = append(items[i].Attempts, attempt.v2AttemptSummary)
		}
	}
	return items, history.Err()
}

func v2StartAttempt(ctx context.Context, db *sql.DB, learner, assessment int64, now time.Time) (v2Attempt, bool, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return v2Attempt{}, false, err
	}
	defer tx.Rollback()
	if err = v2LockLearner(ctx, tx, learner); err != nil {
		return v2Attempt{}, false, err
	}
	var version, unit int64
	err = tx.QueryRowContext(ctx, `SELECT v.id,a.unit_id
		FROM v2_assessments a JOIN v2_assessment_versions v ON v.assessment_id=a.id
		WHERE a.id=? AND v.state='published' AND `+v2CurrentVersion, assessment).Scan(&version, &unit)
	if err != nil {
		return v2Attempt{}, false, err
	}
	if _, err = v2CheckUnit(ctx, tx, learner, unit); err != nil {
		return v2Attempt{}, false, err
	}
	if err = v2RememberUnlock(ctx, tx, learner, unit); err != nil {
		return v2Attempt{}, false, err
	}

	item, err := v2ScanAttempt(tx.QueryRowContext(ctx, v2AttemptQuery+` WHERE t.learner_id=? AND t.active_assessment=?`, learner, assessment))
	if err == nil {
		return item, false, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return v2Attempt{}, false, err
	}
	result, err := tx.ExecContext(ctx, `INSERT INTO v2_attempts (learner_id,version_id,assessment_id,responses,started_at)
		VALUES (?,?,?,JSON_OBJECT(),?)`, learner, version, assessment, now.UnixMilli())
	if err != nil {
		return v2Attempt{}, false, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return v2Attempt{}, false, err
	}
	item, err = v2ScanAttempt(tx.QueryRowContext(ctx, v2AttemptQuery+` WHERE t.id=? AND t.learner_id=?`, id, learner))
	if err != nil {
		return v2Attempt{}, false, err
	}
	return item, true, tx.Commit()
}

func v2UpdateAttemptHandler(db *sql.DB, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !v2Mutation(w, r) {
			return
		}
		id, err := v2PathID(r, "attempt")
		if err != nil {
			v2Failure(w, err)
			return
		}
		learner, err := v2Learner(w, r, db)
		if err != nil {
			v2Failure(w, err)
			return
		}
		now := time.Now()
		if action != "save" {
			if err = v2AllowAssessmentRequest(r.Context(), db, learner, now); err != nil {
				v2Failure(w, err)
				return
			}
		}
		var input struct {
			Responses map[string]string `json:"responses"`
		}
		if action == "save" || (action == "submit" && r.ContentLength != 0) {
			if err = v2StrictJSON(http.MaxBytesReader(w, r.Body, 900000), &input); err != nil {
				v2Failure(w, v2ClientError("Invalid response payload"))
				return
			}
		}
		if action == "save" && input.Responses == nil {
			v2Failure(w, v2ClientError("responses is required"))
			return
		}
		item, err := v2UpdateAttempt(r.Context(), db, learner, id, action, input.Responses, now)
		if err != nil {
			v2Failure(w, err)
			return
		}
		writeJSON(w, http.StatusOK, item.public())
	}
}

func v2UpdateAttempt(ctx context.Context, db *sql.DB, learner, id int64, action string, responses map[string]string, now time.Time) (v2Attempt, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return v2Attempt{}, err
	}
	defer tx.Rollback()
	if err = v2LockLearner(ctx, tx, learner); err != nil {
		return v2Attempt{}, err
	}
	item, err := v2ScanAttempt(tx.QueryRowContext(ctx, v2AttemptQuery+` WHERE t.id=? AND t.learner_id=?`, id, learner))
	if err != nil {
		return v2Attempt{}, err
	}
	if item.State != "in_progress" {
		if (item.State == "submitted" && action == "submit") || (item.State == "abandoned" && action == "abandon") {
			return item, tx.Commit()
		}
		return v2Attempt{}, v2ClientError("Attempt has already ended")
	}
	if action == "abandon" {
		if _, err = tx.ExecContext(ctx, `UPDATE v2_attempts SET state='abandoned' WHERE id=?`, id); err != nil {
			return v2Attempt{}, err
		}
		item.State = "abandoned"
		return item, tx.Commit()
	}
	course, err := v2CheckUnit(ctx, tx, learner, item.UnitID)
	if err != nil {
		return v2Attempt{}, err
	}
	var state string
	if err = tx.QueryRowContext(ctx, `SELECT state FROM v2_assessment_versions WHERE assessment_id=? ORDER BY version DESC LIMIT 1`, item.AssessmentID).Scan(&state); err != nil {
		return v2Attempt{}, err
	}
	if state != "published" {
		return v2Attempt{}, v2ErrNotFound
	}
	expired := item.deadline() != 0 && now.UnixMilli() >= item.deadline()
	if expired && action == "save" {
		return v2Attempt{}, v2ClientError("Time limit has expired. Submit your saved responses.")
	}
	if !expired && responses != nil {
		if err = item.Definition.validateResponses(responses); err != nil {
			return v2Attempt{}, v2ClientError(err.Error())
		}
		item.Responses = responses
	}
	encoded, err := json.Marshal(item.Responses)
	if err != nil {
		return v2Attempt{}, err
	}
	if action == "save" {
		_, err = tx.ExecContext(ctx, `UPDATE v2_attempts SET responses=? WHERE id=?`, encoded, id)
		if err != nil {
			return v2Attempt{}, err
		}
		return item, tx.Commit()
	}
	hasAnswer := false
	for _, response := range item.Responses {
		if strings.TrimSpace(response) != "" {
			hasAnswer = true
			break
		}
	}
	if !hasAnswer {
		return v2Attempt{}, v2ClientError("Answer at least one question before submitting")
	}
	item.State = "submitted"
	item.Submitted = sql.NullInt64{Int64: now.UnixMilli(), Valid: true}
	item.EarnedMarks, item.PendingMarks = item.Definition.score(item.Responses)
	_, err = tx.ExecContext(ctx, `UPDATE v2_attempts SET state='submitted',responses=?,submitted_at=?,earned_marks=?,pending_marks=? WHERE id=?`,
		encoded, item.Submitted.Int64, item.EarnedMarks, item.PendingMarks, id)
	if err != nil {
		return v2Attempt{}, err
	}
	if err = v2PersistUnlocks(ctx, tx, course, learner); err != nil {
		return v2Attempt{}, err
	}
	return item, tx.Commit()
}
