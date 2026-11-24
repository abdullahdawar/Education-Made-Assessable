package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const v2LearnerCookie = "ema_learner"

var (
	v2ErrNotFound   = errors.New("not found")
	v2ErrLocked     = errors.New("unit is locked")
	v2ErrRateLimit  = errors.New("too many assessment requests; try again shortly")
	v2ErrNoDatabase = errors.New("learning database is unavailable")
)

type v2ClientError string

func (e v2ClientError) Error() string { return string(e) }

func v2Failure(w http.ResponseWriter, err error) {
	var client v2ClientError
	switch {
	case errors.As(err, &client):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": client.Error()})
	case errors.Is(err, v2ErrLocked):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": v2ErrLocked.Error()})
	case errors.Is(err, sql.ErrNoRows), errors.Is(err, v2ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not found"})
	case errors.Is(err, v2ErrRateLimit):
		w.Header().Set("Retry-After", "60")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": v2ErrRateLimit.Error()})
	case errors.Is(err, v2ErrNoDatabase):
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": v2ErrNoDatabase.Error()})
	default:
		log.Printf("v2 assessment request failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Request could not be completed"})
	}
}

func v2Learner(w http.ResponseWriter, r *http.Request, db *sql.DB) (int64, error) {
	w.Header().Set("Cache-Control", "private, no-store")
	if db == nil {
		return 0, v2ErrNoDatabase
	}
	if cookie, err := r.Cookie(v2LearnerCookie); err == nil {
		token, err := base64.RawURLEncoding.DecodeString(cookie.Value)
		if err == nil && len(token) == 32 {
			digest := sha256.Sum256(token)
			var id int64
			err := db.QueryRowContext(r.Context(), `SELECT id FROM v2_learners WHERE token_digest=? AND created_at >= CURRENT_TIMESTAMP - INTERVAL 365 DAY`, digest[:]).Scan(&id)
			if err == nil {
				return id, nil
			}
			if !errors.Is(err, sql.ErrNoRows) {
				return id, err
			}
		}
	}

	var token [32]byte
	if _, err := rand.Read(token[:]); err != nil {
		return 0, err
	}
	digest := sha256.Sum256(token[:])
	result, err := db.ExecContext(r.Context(), `INSERT INTO v2_learners (token_digest) VALUES (?)`, digest[:])
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	host := r.Host
	if hostname, _, err := net.SplitHostPort(host); err == nil {
		host = hostname
	}
	host = net.ParseIP(host).String()
	loopback := host == "127.0.0.1" || host == "::1" || r.Host == "localhost"
	if hostname, _, err := net.SplitHostPort(r.Host); err == nil && hostname == "localhost" {
		loopback = true
	}
	http.SetCookie(w, &http.Cookie{
		Name: v2LearnerCookie, Value: base64.RawURLEncoding.EncodeToString(token[:]),
		Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode,
		Secure: r.TLS != nil || !loopback, MaxAge: 365 * 24 * 60 * 60,
	})
	return id, nil
}

func v2Mutation(w http.ResponseWriter, r *http.Request) bool {
	if r.Header.Get("Sec-Fetch-Site") == "cross-site" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Cross-site requests are not allowed"})
		return false
	}
	if origin := r.Header.Get("Origin"); origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Host != r.Host || parsed.User != nil || parsed.Path != "" ||
			(parsed.Scheme != "https" && parsed.Scheme != "http") {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Origin does not match this website"})
			return false
		}
	}
	if r.ContentLength != 0 {
		contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || contentType != "application/json" {
			writeJSON(w, http.StatusUnsupportedMediaType, map[string]string{"error": "Use application/json"})
			return false
		}
	}
	return true
}

func v2PathID(r *http.Request, name string) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	if err != nil || id <= 0 {
		return 0, v2ClientError(name + " must be a positive identifier")
	}
	return id, nil
}

func v2AllowAssessmentRequest(ctx context.Context, db *sql.DB, learner int64, now time.Time) error {
	minute := now.Unix() / 60
	result, err := db.ExecContext(ctx, `UPDATE v2_learners SET request_count=IF(request_window=?,request_count+1,1),request_window=?
		WHERE id=? AND (request_window<>? OR request_count<20)`, minute, minute, learner, minute)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return v2ErrRateLimit
	}
	return nil
}

func v2LockLearner(ctx context.Context, tx *sql.Tx, learner int64) error {
	var id int64
	return tx.QueryRowContext(ctx, `SELECT id FROM v2_learners WHERE id=? FOR UPDATE`, learner).Scan(&id)
}

type v2QueryDB interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

type v2UnitProgress struct {
	UnitID               int64 `json:"unitId"`
	Unlocked             bool  `json:"unlocked"`
	CompletedAssessments int   `json:"completedAssessments"`
}

func v2Progress(ctx context.Context, db v2QueryDB, courseID, learner int64) ([]v2UnitProgress, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT u.id, EXISTS (SELECT 1 FROM v2_unit_unlocks AS x WHERE x.learner_id=? AND x.unit_id=u.id),
		  (SELECT COUNT(DISTINCT a.assessment_id)
		   FROM v2_attempts AS a JOIN v2_assessments AS t ON t.id=a.assessment_id
		   WHERE a.learner_id=? AND a.state='submitted' AND t.unit_id=u.id)
		FROM v2_units AS u WHERE u.course_id=? AND u.state='published' ORDER BY u.position,u.id`, learner, learner, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []v2UnitProgress{}
	next := true
	for rows.Next() {
		var item v2UnitProgress
		var remembered bool
		if err := rows.Scan(&item.UnitID, &remembered, &item.CompletedAssessments); err != nil {
			return nil, err
		}
		item.Unlocked = remembered || next
		next = item.Unlocked && item.CompletedAssessments >= 2
		items = append(items, item)
	}
	return items, rows.Err()
}

func v2CourseProgress(w http.ResponseWriter, r *http.Request, db *sql.DB, courseID int64) ([]v2UnitProgress, bool) {
	learner, err := v2Learner(w, r, db)
	if err == nil {
		var progress []v2UnitProgress
		progress, err = v2Progress(r.Context(), db, courseID, learner)
		if err == nil {
			return progress, true
		}
	}
	v2Failure(w, err)
	return nil, false
}

func v2CheckUnit(ctx context.Context, db v2QueryDB, learner, unitID int64) (int64, error) {
	var courseID int64
	err := db.QueryRowContext(ctx, `SELECT course_id FROM v2_units WHERE id=? AND state='published'`, unitID).Scan(&courseID)
	if err != nil {
		return 0, err
	}
	progress, err := v2Progress(ctx, db, courseID, learner)
	if err != nil {
		return 0, err
	}
	for _, item := range progress {
		if item.UnitID == unitID && item.Unlocked {
			return courseID, nil
		}
	}
	return 0, v2ErrLocked
}

func v2RequireUnit(w http.ResponseWriter, r *http.Request, db *sql.DB, unitID int64) bool {
	learner, err := v2Learner(w, r, db)
	if err == nil {
		_, err = v2CheckUnit(r.Context(), db, learner, unitID)
		if err == nil {
			err = v2RememberUnlock(r.Context(), db, learner, unitID)
			if err == nil {
				return true
			}
		}
	}
	v2Failure(w, err)
	return false
}

type v2StatementDB interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func v2RememberUnlock(ctx context.Context, db v2StatementDB, learner, unitID int64) error {
	_, err := db.ExecContext(ctx, `INSERT INTO v2_unit_unlocks (learner_id,unit_id) VALUES (?,?)
		ON DUPLICATE KEY UPDATE unlocked_at=unlocked_at`, learner, unitID)
	return err
}

func v2PersistUnlocks(ctx context.Context, tx *sql.Tx, courseID, learner int64) error {
	progress, err := v2Progress(ctx, tx, courseID, learner)
	if err != nil {
		return err
	}
	for _, item := range progress {
		if item.Unlocked {
			if err := v2RememberUnlock(ctx, tx, learner, item.UnitID); err != nil {
				return err
			}
		}
	}
	return nil
}
