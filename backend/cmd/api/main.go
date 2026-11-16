package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
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

	log.Println("Education Made Assessable API running at http://localhost:8080")

	server := &http.Server{Addr: ":8080", Handler: newMux(db), ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newMux(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()
	registerCurriculum(mux, db)

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

	return mux
}
