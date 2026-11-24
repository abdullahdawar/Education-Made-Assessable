package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestV2ContentRejectsUnsafeResources(t *testing.T) {
	storage := t.TempDir()
	if err := os.Mkdir(filepath.Join(storage, "resources"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(storage, "resources", "not-a-pdf.pdf"), []byte("text"), 0600); err != nil {
		t.Fatal(err)
	}
	root, err := os.OpenRoot(storage)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	for _, item := range []v2Resource{
		{Kind: "notes", Path: "resources/../answers.pdf"},
		{Kind: "notes", Path: "resources/not-a-pdf.pdf"},
		{Kind: "test", Path: "resources/not-a-pdf.pdf"},
	} {
		if file, err := openV2Resource(root, item); err == nil {
			file.Close()
			t.Errorf("unexpectedly accepted %+v", item)
		}
	}
	if _, err := readV2Bundle(strings.NewReader(`{"units":[],"extra":true}`)); err == nil {
		t.Error("unknown fields must fail")
	}
}

func TestV2CurriculumDisposableMySQL(t *testing.T) {
	if os.Getenv("EMA_V2_DISPOSABLE_TEST") != "1" || os.Getenv("DB_NAME") != "ema_v2_test" {
		t.Skip("requires explicitly selected disposable ema_v2_test database")
	}
	db, err := openDatabase()
	if err != nil || db == nil {
		t.Fatalf("open disposable database: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	ctx := context.Background()
	if err := migrateV2(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err := migrateV2(ctx, db); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM v2_courses").Scan(&count); err != nil || count != 39 {
		t.Fatalf("expected 39 courses, got %d: %v", count, err)
	}

	storage := t.TempDir()
	if err := os.Mkdir(filepath.Join(storage, "resources"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(storage, "resources", "lesson.pdf"), []byte("%PDF-1.7\nfixture"), 0600); err != nil {
		t.Fatal(err)
	}
	root, err := os.OpenRoot(storage)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	label := v2Text{En: "Integration fixture only", Ps: "ازموینه"}
	content := v2Content{Label: label, Description: label, Resources: []v2Resource{{ID: "notes", Kind: "notes", Label: label, Language: "en", Path: "resources/lesson.pdf"}}}
	units := []v2UnitImport{
		{Grade: 6, Subject: "computer-science", Slug: "integration-first", Position: 1, State: "published", v2Content: content},
		{Grade: 6, Subject: "computer-science", Slug: "integration-second", Position: 2, State: "published", v2Content: content},
	}
	var course int64
	if err := db.QueryRowContext(ctx, "SELECT id FROM v2_courses WHERE grade=6 AND subject='computer-science'").Scan(&course); err != nil {
		t.Fatal(err)
	}
	// The fixture owns all units in this otherwise empty course. It is never run against a non-test database.
	cleanup := func() error {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		defer tx.Rollback()
		const fixtureUnits = "course_id=? AND slug IN ('integration-first','integration-second','invalid-collision')"
		if _, err = tx.ExecContext(ctx, "DELETE FROM v2_unit_unlocks WHERE unit_id IN (SELECT id FROM v2_units WHERE "+fixtureUnits+")", course); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "DELETE FROM v2_units WHERE "+fixtureUnits, course); err != nil {
			return err
		}
		return tx.Commit()
	}
	if err := cleanup(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := cleanup(); err != nil {
			t.Error(err)
		}
	})
	if err := importV2Bundle(ctx, db, units, root, true); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM v2_units WHERE course_id=?", course).Scan(&count); err != nil || count != 0 {
		t.Fatalf("validate wrote data: %d, %v", count, err)
	}
	for i := 0; i < 2; i++ {
		if err := importV2Bundle(ctx, db, units, root, false); err != nil {
			t.Fatal(err)
		}
	}
	collision := units[0]
	collision.Slug = "invalid-collision"
	if err := importV2Bundle(ctx, db, []v2UnitImport{collision}, root, false); err == nil {
		t.Fatal("accepted position collision")
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM v2_units WHERE course_id=?", course).Scan(&count); err != nil || count != 2 {
		t.Fatalf("unexpected import count %d: %v", count, err)
	}

	server := httptest.NewServer(newPlatformMux(db, root))
	defer server.Close()
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}
	get := func(path string, want int) *http.Response {
		t.Helper()
		response, err := client.Get(server.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != want {
			response.Body.Close()
			t.Fatalf("%s returned %d, expected %d", path, response.StatusCode, want)
		}
		return response
	}
	for grade := 1; grade <= 6; grade++ {
		result := get(fmt.Sprintf("/api/v2/grades/%d/subjects", grade), 200)
		var subjects struct{ Subjects []v2Course }
		if err := json.NewDecoder(result.Body).Decode(&subjects); err != nil {
			t.Fatal(err)
		}
		result.Body.Close()
		expected := 6
		if grade >= 4 {
			expected = 7
		}
		if len(subjects.Subjects) != expected {
			t.Fatalf("grade %d has %d subjects", grade, len(subjects.Subjects))
		}
	}
	var first, second int64
	if err := db.QueryRowContext(ctx, "SELECT MIN(id),MAX(id) FROM v2_units WHERE course_id=?", course).Scan(&first, &second); err != nil {
		t.Fatal(err)
	}
	get(fmt.Sprintf("/api/v2/units/%d/resources/notes", first), 200).Body.Close()
	get(fmt.Sprintf("/api/v2/units/%d/resources/notes", second), 403).Body.Close()
	get(fmt.Sprintf("/api/v2/units/%d", second), 403).Body.Close()
	get("/api/chapters/1/practice", 404).Body.Close()
}
