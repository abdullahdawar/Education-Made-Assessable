package main

import (
	"net/http/httptest"
	"testing"
)

func TestRoutesWithoutDatabase(t *testing.T) {
	mux := newMux(nil)
	cases := []struct {
		method string
		path   string
		status int
		body   string
	}{
		{"GET", "/api/health", 200, "{\"status\":\"ok\",\"service\":\"Education Made Assessable API\"}\n"},
		{"GET", "/api/grades", 503, ""},
		{"GET", "/api/grades/1/subjects", 503, ""},
		{"GET", "/api/subjects/1/chapters", 503, ""},
		{"GET", "/api/chapters/1/content", 503, ""},
		{"GET", "/api/grades/no/subjects", 400, ""},
		{"GET", "/api/subjects/0/chapters", 400, ""},
		{"GET", "/api/chapters/-1/content", 400, ""},
		{"POST", "/api/grades", 405, ""},
	}
	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, httptest.NewRequest(tc.method, tc.path, nil))
			if recorder.Code != tc.status {
				t.Fatalf("got HTTP %d, want %d", recorder.Code, tc.status)
			}
			if tc.body != "" && recorder.Body.String() != tc.body {
				t.Errorf("unexpected response body %q", recorder.Body.String())
			}
		})
	}
}

func TestPartialDatabaseConfiguration(t *testing.T) {
	t.Setenv("DB_USER", "ema_app")
	t.Setenv("DB_PASSWORD", "")
	t.Setenv("DB_SOCKET", "/tmp/mysql.sock")
	t.Setenv("DB_ADDR", "")
	if _, err := openDatabase(); err == nil {
		t.Fatal("expected missing password to be rejected")
	}
}
