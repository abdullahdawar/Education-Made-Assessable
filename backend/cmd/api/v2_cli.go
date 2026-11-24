package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"
)

func runV2Command(db *sql.DB, args []string) error {
	const usage = "usage: api migrate | api content (preview|validate|import) bundle.json"
	if len(args) == 0 {
		return errors.New(usage)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if args[0] == "migrate" && len(args) == 1 {
		if db == nil || os.Getenv("DB_NAME") == "" {
			return errors.New("configure an explicit DB_NAME and database credentials for migrations")
		}
		if err := migrateV2(ctx, db); err != nil {
			return err
		}
		fmt.Println("Version 2 database migrations applied")
		return nil
	}
	if args[0] != "content" || len(args) != 3 {
		return errors.New(usage)
	}
	if args[1] != "preview" && args[1] != "validate" && args[1] != "import" {
		return errors.New(usage)
	}
	input, err := os.Open(args[2])
	if err != nil {
		return err
	}
	defer input.Close()
	units, err := readV2Bundle(input)
	if err != nil {
		return err
	}
	if args[1] == "preview" {
		for _, unit := range units {
			fmt.Printf("Grade %d / %s / %d %s (%s): %s\n", unit.Grade, unit.Subject, unit.Position, unit.Slug, unit.State, unit.Label.En)
			summary, err := json.MarshalIndent(unit.v2Content, "", "  ")
			if err != nil {
				return err
			}
			fmt.Println(string(summary))
		}
		return nil
	}
	if db == nil || os.Getenv("DB_NAME") == "" {
		return errors.New("configure an explicit DB_NAME and database credentials for content changes")
	}
	dir := os.Getenv("EMA_ASSETS")
	if dir == "" {
		return errors.New("configure EMA_ASSETS with the dedicated resource directory")
	}
	assets, err := os.OpenRoot(dir)
	if err != nil {
		return err
	}
	defer assets.Close()
	if err := importV2Bundle(ctx, db, units, assets, args[1] == "validate"); err != nil {
		return err
	}
	fmt.Printf("%s passed for %d units\n", args[1], len(units))
	return nil
}
