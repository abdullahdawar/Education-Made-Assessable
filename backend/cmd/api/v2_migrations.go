package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var v2Migrations embed.FS

func migrateV2(ctx context.Context, db *sql.DB) error {
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()

	var locked int
	if err := conn.QueryRowContext(ctx, "SELECT GET_LOCK(CONCAT(DATABASE(), ':ema-v2'), 10)").Scan(&locked); err != nil || locked != 1 {
		return fmt.Errorf("could not lock migration database: %v", err)
	}
	defer func() {
		release, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_, _ = conn.ExecContext(release, "SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':ema-v2'))")
	}()
	if _, err = conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS v2_schema_migrations (
  filename VARCHAR(128) PRIMARY KEY, checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`); err != nil {
		return err
	}

	names, err := fs.Glob(v2Migrations, "migrations/*.sql")
	if err != nil {
		return err
	}
	for _, name := range names {
		data, err := v2Migrations.ReadFile(name)
		if err != nil {
			return err
		}
		checksum := fmt.Sprintf("%x", sha256.Sum256(data))
		var existing string
		err = conn.QueryRowContext(ctx, "SELECT checksum FROM v2_schema_migrations WHERE filename = ?", name).Scan(&existing)
		switch err {
		case nil:
			if checksum != existing {
				return fmt.Errorf("applied migration changed: %s", name)
			}
			continue
		case sql.ErrNoRows:
		default:
			return err
		}
		// MySQL commits DDL independently. Migration statements must be safe to rerun.
		for _, statement := range strings.Split(string(data), ";") {
			if strings.TrimSpace(statement) == "" {
				continue
			}
			if _, err := conn.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("%s: %w", name, err)
			}
		}
		if _, err := conn.ExecContext(ctx, "INSERT INTO v2_schema_migrations (filename, checksum) VALUES (?, ?)", name, checksum); err != nil {
			return err
		}
	}
	return nil
}
