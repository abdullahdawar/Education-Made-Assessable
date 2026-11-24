package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

const v2TestQuestions = `[
	{"id":"choice","type":"multiple_choice","prompt":{"en":"Pick an option"},"marks":2,
	 "options":[{"id":"a","label":{"en":"A"}},{"id":"b","label":{"en":"B"}}],"answer":{"option":"a"}},
	{"id":"truth","type":"true_false","prompt":{"en":"Select true or false"},"marks":1,"answer":{"truth":true}},
	{"id":"text","type":"short_answer","prompt":{"en":"Give a word"},"marks":2,"answer":{"accepted":["Mango","Apple"]}},
	{"id":"number","type":"short_answer","prompt":{"en":"Give a number"},"marks":1,"answer":{"number":2,"tolerance":0.03}},
	{"id":"long","type":"long_answer","prompt":{"en":"Explain"},"marks":4,"answer":{"rubric":"Private rubric sentinel"}}
]`

func v2TestAssessment(slot, limit int, title, state string) json.RawMessage {
	return json.RawMessage(fmt.Sprintf(`[{"slot":%d,"title":{"en":%q},"state":%q,"timeLimitSeconds":%d,"questions":%s}]`, slot, title, state, limit, v2TestQuestions))
}

func TestV2AssessmentValidationScoringAndProjection(t *testing.T) {
	bundle, err := v2DecodeAssessments(v2TestAssessment(1, 0, "Test 1", "published"))
	if err != nil {
		t.Fatal(err)
	}
	definition := bundle[0]
	responses := map[string]string{"choice": "a", "truth": "true", "text": " mAnGo ", "number": "1.98", "long": "A reason."}
	if err = definition.validateResponses(responses); err != nil {
		t.Fatal(err)
	}
	got, pending := definition.score(responses)
	if got != 6 || pending != 4 || definition.possibleMarks() != 10 {
		t.Fatalf("got earned=%d pending=%d possible=%d", got, pending, definition.possibleMarks())
	}
	for _, invalid := range []map[string]string{{"invalid": "x"}, {"truth": "yes"}, {"choice": "wrong"}} {
		if err := definition.validateResponses(invalid); err == nil {
			t.Fatalf("accepted invalid input %v", invalid)
		}
	}
	variants := []string{
		strings.Replace(v2TestQuestions, `"option":"a"`, `"option":"unknown"`, 1),
		strings.Replace(v2TestQuestions, `"tolerance":0.03`, `"tolerance":-0.03`, 1),
		strings.Replace(v2TestQuestions, `"rubric":"Private rubric sentinel"`, `"rubric":""`, 1),
		strings.Replace(v2TestQuestions, `"marks":2`, `"marks":-2`, 1),
	}
	for _, questions := range variants {
		data := json.RawMessage(fmt.Sprintf(`[{"slot":1,"title":{"en":"Test"},"state":"published","questions":%s}]`, questions))
		if _, err := v2DecodeAssessments(data); err == nil {
			t.Fatalf("accepted invalid definition %s", data)
		}
	}
	entry := &v2Attempt{Definition: definition, Responses: responses}
	data, err := json.Marshal(entry.public())
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{`"answer":`, `"accepted":`, `"rubric":`, `"tolerance":`, "Private rubric sentinel"} {
		if strings.Contains(string(data), private) {
			t.Errorf("private value leaked: %s", private)
		}
	}
}

func TestV2AssessmentMySQL(t *testing.T) {
	if os.Getenv("EMA_TEST_DB") != "1" {
		t.Skip("set EMA_TEST_DB=1 only with a disposable MySQL instance configured")
	}
	db, err := openDatabase()
	if err != nil || db == nil {
		t.Fatalf("cannot open disposable database: %v", err)
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err = migrateV2(ctx, db); err != nil {
		t.Fatal(err)
	}
	var seed [8]byte
	if _, err = rand.Read(seed[:]); err != nil {
		t.Fatal(err)
	}
	subject := "assessment-test-" + hex.EncodeToString(seed[:])
	if _, err = db.ExecContext(ctx, `INSERT INTO v2_subjects VALUES (?,'Synthetic','Synthetic','Synthetic','Synthetic','Test only',6)`, subject); err != nil {
		t.Fatal(err)
	}
	var course int64
	var learnerDigests [][32]byte
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		for _, statement := range []string{
			`DELETE t FROM v2_attempts t JOIN v2_assessments a ON a.id=t.assessment_id JOIN v2_units u ON u.id=a.unit_id WHERE u.course_id=?`,
			`DELETE x FROM v2_unit_unlocks x JOIN v2_units u ON u.id=x.unit_id WHERE u.course_id=?`,
			`DELETE v FROM v2_assessment_versions v JOIN v2_assessments a ON a.id=v.assessment_id JOIN v2_units u ON u.id=a.unit_id WHERE u.course_id=?`,
			`DELETE a FROM v2_assessments a JOIN v2_units u ON u.id=a.unit_id WHERE u.course_id=?`,
			`DELETE FROM v2_units WHERE course_id=?`,
			`DELETE FROM v2_courses WHERE id=?`,
		} {
			if _, err := db.ExecContext(cleanup, statement, course); err != nil {
				t.Error(err)
			}
		}
		if _, err := db.ExecContext(cleanup, `DELETE FROM v2_subjects WHERE slug=?`, subject); err != nil {
			t.Error(err)
		}
		for _, digest := range learnerDigests {
			if _, err := db.ExecContext(cleanup, `DELETE FROM v2_learners WHERE token_digest=?`, digest[:]); err != nil {
				t.Error(err)
			}
		}
	}()
	result, err := db.ExecContext(ctx, `INSERT INTO v2_courses (grade,subject) VALUES (6,?)`, subject)
	if err != nil {
		t.Fatal(err)
	}
	course, err = result.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	prefix := "assessment-test"
	units := make([]int64, 2)
	for i := range units {
		insert, err := db.ExecContext(ctx, `INSERT INTO v2_units (course_id,slug,position,state,payload) VALUES (?,?,?,'published',JSON_OBJECT())`, course, fmt.Sprintf("%s-%d", prefix, i), i+1)
		if err != nil {
			t.Fatal(err)
		}
		units[i], err = insert.LastInsertId()
		if err != nil {
			t.Fatal(err)
		}
	}
	importDefinition := func(unit int64, slot, limit int, title, state string) {
		t.Helper()
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		if err = v2ImportAssessments(ctx, tx, unit, v2TestAssessment(slot, limit, title, state)); err != nil {
			t.Fatal(err)
		}
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
	}
	for i := range 3 {
		importDefinition(units[0], i+1, 0, fmt.Sprintf("Original test %d", i+1), "published")
	}
	importDefinition(units[1], 1, 1, "Timed assessment", "published")
	importDefinition(units[1], 2, 0, "Draft assessment", "draft")
	// Importing identical content twice must not create another immutable version.
	importDefinition(units[0], 1, 0, "Original test 1", "published")
	var versionCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM v2_assessment_versions v JOIN v2_assessments a ON a.id=v.assessment_id WHERE a.unit_id=? AND a.slot=1`, units[0]).Scan(&versionCount); err != nil || versionCount != 1 {
		t.Fatalf("duplicate import created %d versions (err=%v)", versionCount, err)
	}

	mux := http.NewServeMux()
	registerV2Assessments(mux, db)
	server := httptest.NewServer(mux)
	defer server.Close()
	newClient := func() *http.Client {
		jar, err := cookiejar.New(nil)
		if err != nil {
			t.Fatal(err)
		}
		return &http.Client{Jar: jar, Timeout: 5 * time.Second}
	}
	learner, other := newClient(), newClient()
	defer func() {
		endpoint, _ := url.Parse(server.URL)
		for _, client := range []*http.Client{learner, other} {
			for _, cookie := range client.Jar.Cookies(endpoint) {
				if cookie.Name != v2LearnerCookie {
					continue
				}
				token, err := base64.RawURLEncoding.DecodeString(cookie.Value)
				if err == nil {
					learnerDigests = append(learnerDigests, sha256.Sum256(token))
				}
			}
		}
	}()
	request := func(c *http.Client, method, path, body string) (int, []byte, error) {
		req, err := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		if err != nil {
			return 0, nil, err
		}
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		res, err := c.Do(req)
		if err != nil {
			return 0, nil, err
		}
		defer res.Body.Close()
		data, err := io.ReadAll(res.Body)
		return res.StatusCode, data, err
	}
	call := func(c *http.Client, method, path, body string, expected int, out any) {
		t.Helper()
		code, data, err := request(c, method, path, body)
		if err != nil || code != expected {
			t.Fatalf("%s %s: status %d, wanted %d, err %v: %s", method, path, code, expected, data, err)
		}
		if out != nil {
			if err := json.Unmarshal(data, out); err != nil {
				t.Fatal(err)
			}
			if strings.Contains(string(data), "Private rubric sentinel") || strings.Contains(string(data), `"answer":`) {
				t.Fatal("student response leaked definitions")
			}
		}
	}
	progressPath := fmt.Sprintf("/api/v2/progress/%d", course)
	unitPath := func(unit int64) string { return fmt.Sprintf("/api/v2/units/%d/assessments", unit) }
	attemptPath := func(id int64) string { return fmt.Sprintf("/api/v2/attempts/%d", id) }
	checkProgress := func(c *http.Client, completed int, unlocked bool) {
		t.Helper()
		var progress []v2UnitProgress
		call(c, "GET", progressPath, "", 200, &progress)
		if len(progress) != 2 || !progress[0].Unlocked || progress[0].CompletedAssessments != completed || progress[1].Unlocked != unlocked {
			t.Fatalf("unexpected progress: %+v", progress)
		}
	}
	checkProgress(learner, 0, false)
	var tests []v2AssessmentListItem
	call(learner, "GET", unitPath(units[0]), "", 200, &tests)
	if len(tests) != 3 {
		t.Fatalf("expected three tests: %+v", tests)
	}
	call(learner, "GET", unitPath(units[1]), "", 403, nil)
	var lockedAssessment int64
	if err := db.QueryRowContext(ctx, `SELECT id FROM v2_assessments WHERE unit_id=? AND slot=1`, units[1]).Scan(&lockedAssessment); err != nil {
		t.Fatal(err)
	}
	var impossible v2AttemptView
	call(learner, "POST", fmt.Sprintf("/api/v2/assessments/%d/attempts", lockedAssessment), "", 403, &impossible)
	start := func(c *http.Client, id int64, code int) v2AttemptView {
		t.Helper()
		var a v2AttemptView
		call(c, "POST", fmt.Sprintf("/api/v2/assessments/%d/attempts", id), "", code, &a)
		return a
	}
	first := start(learner, tests[0].ID, 201)
	if resume := start(learner, tests[0].ID, 200); resume.ID != first.ID {
		t.Fatal("created duplicate active attempt")
	}
	call(learner, "PUT", attemptPath(first.ID), `{"responses":{"not-a-real-id":"wrong"}}`, 400, nil)
	call(learner, "PUT", attemptPath(first.ID), `{"responses":{"choice":"a","long":"First reason"}}`, 200, nil)
	call(other, "GET", attemptPath(first.ID), "", 404, nil)
	call(other, "POST", attemptPath(first.ID)+"/submit", "", 404, nil)
	var saved v2AttemptView
	call(learner, "GET", attemptPath(first.ID), "", 200, &saved)
	if saved.Responses["choice"] != "a" {
		t.Fatal("saved response was lost")
	}
	importDefinition(units[0], 1, 0, "Revised test 1", "published")
	var submitted v2AttemptView
	call(learner, "POST", attemptPath(first.ID)+"/submit", "", 200, &submitted)
	if submitted.EarnedMarks != 2 || submitted.PendingMarks != 4 || submitted.Title["en"] != "Original test 1" {
		t.Fatalf("historical score or version changed: %+v", submitted)
	}
	call(learner, "POST", attemptPath(first.ID)+"/submit", `{"responses":{"choice":"b"}}`, 200, &submitted)
	if submitted.EarnedMarks != 2 || submitted.Responses["choice"] != "a" {
		t.Fatal("duplicate final submission changed answers")
	}
	checkProgress(learner, 1, false)
	repeat := start(learner, tests[0].ID, 201)
	if repeat.Title["en"] != "Revised test 1" {
		t.Fatal("retake used previous version")
	}
	const answered = `{"responses":{"truth":"true"}}`
	call(learner, "POST", attemptPath(repeat.ID)+"/submit", answered, 200, nil)
	checkProgress(learner, 1, false)
	abandoned := start(learner, tests[1].ID, 201)
	call(learner, "DELETE", attemptPath(abandoned.ID), "", 200, nil)
	checkProgress(learner, 1, false)
	second := start(learner, tests[1].ID, 201)
	third := start(learner, tests[2].ID, 201)
	var wg sync.WaitGroup
	for _, attempt := range []int64{second.ID, third.ID} {
		wg.Go(func() {
			code, data, err := request(learner, "POST", attemptPath(attempt)+"/submit", answered)
			if err != nil || code != 200 {
				t.Errorf("concurrent submit: status %d, err %v: %s", code, err, data)
			}
		})
	}
	wg.Wait()
	checkProgress(learner, 3, true)
	checkProgress(other, 0, false)
	var unlocked []v2AssessmentListItem
	call(learner, "GET", unitPath(units[1]), "", 200, &unlocked)
	if len(unlocked) != 1 {
		t.Fatalf("draft assessment exposed: %+v", unlocked)
	}
	timed := start(learner, unlocked[0].ID, 201)
	call(learner, "PUT", attemptPath(timed.ID), answered, 200, nil)
	if _, err := db.ExecContext(ctx, `UPDATE v2_attempts SET started_at=started_at-10000 WHERE id=?`, timed.ID); err != nil {
		t.Fatal(err)
	}
	call(learner, "PUT", attemptPath(timed.ID), `{"responses":{"truth":"false"}}`, 400, nil)
	call(learner, "POST", attemptPath(timed.ID)+"/submit", `{"responses":{"truth":"false"}}`, 200, &submitted)
	if submitted.EarnedMarks != 1 || submitted.Responses["truth"] != "true" {
		t.Fatal("expired attempt accepted new response")
	}
}
