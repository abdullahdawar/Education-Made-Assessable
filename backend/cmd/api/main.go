package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

func main() {
	db, err := openDatabase()
	if err != nil {
		log.Fatal(err)
	}
	if db != nil {
		defer db.Close()
	}

	if len(os.Args) > 1 {
		if err := runV2Command(db, os.Args[1:]); err != nil {
			log.Fatal(err)
		}
		return
	}
	var assets *os.Root
	if dir := os.Getenv("EMA_ASSETS"); dir != "" {
		assets, err = os.OpenRoot(dir)
		if err != nil {
			log.Fatal(err)
		}
		defer assets.Close()
	}
	addr := os.Getenv("EMA_API_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}
	log.Printf("Education Made Assessable API listening on %s", addr)

	server := &http.Server{Addr: addr, Handler: newPlatformMux(db, assets), ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newMux(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()
	registerCurriculum(mux, db)

	registerHealth(mux)
	return mux
}

func newPlatformMux(db *sql.DB, assets *os.Root) *http.ServeMux {
	mux := http.NewServeMux()
	registerHealth(mux)
	registerV2Curriculum(mux, db, assets)
	registerV2Assessments(mux, db)
	return mux
}

func registerHealth(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		response := HealthResponse{
			Status:  "ok",
			Service: "Education Made Assessable API",
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("Failed to encode response: %v", err)
		}
	})

}
