package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"
)

type v2Text struct {
	En string `json:"en"`
	Ps string `json:"ps"`
}

func (t v2Text) valid() bool {
	return strings.TrimSpace(t.En) != "" && len(t.En) <= 100_000 && len(t.Ps) <= 100_000
}

type v2Objective struct {
	Label     v2Text `json:"label"`
	Reference string `json:"reference"`
}

type v2Lesson struct {
	Label v2Text `json:"label"`
	Body  v2Text `json:"body"`
}

type v2Resource struct {
	ID       string `json:"id"`
	Kind     string `json:"kind"`
	Label    v2Text `json:"label"`
	Language string `json:"language,omitempty"`
	Path     string `json:"path,omitempty"`
	URL      string `json:"url,omitempty"`
}

type v2Video struct {
	Approved bool   `json:"approved"`
	Label    v2Text `json:"label"`
	URL      string `json:"url"`
}

type v2Content struct {
	Label       v2Text        `json:"label"`
	Description v2Text        `json:"description"`
	Objectives  []v2Objective `json:"objectives"`
	Lessons     []v2Lesson    `json:"lessons"`
	Resources   []v2Resource  `json:"resources"`
	Activities  []v2Activity  `json:"activities"`
	Videos      []v2Video     `json:"videos"`
}

type v2UnitImport struct {
	Grade       int             `json:"grade"`
	Subject     string          `json:"subject"`
	Slug        string          `json:"slug"`
	Position    int             `json:"position"`
	State       string          `json:"state"`
	Assessments json.RawMessage `json:"assessments,omitempty"`
	v2Content
}

var v2Slug = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,63}$`)
var v2Youtube = regexp.MustCompile(`^https://(?:www\.youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}$`)

func readV2Bundle(reader io.Reader) ([]v2UnitImport, error) {
	decoder := json.NewDecoder(io.LimitReader(reader, 32<<20))
	decoder.DisallowUnknownFields()
	var batch struct {
		Units []v2UnitImport `json:"units"`
	}
	if err := decoder.Decode(&batch); err != nil {
		return nil, err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return nil, errors.New("expected one JSON document")
	}
	if len(batch.Units) < 1 || len(batch.Units) > 1000 {
		return nil, errors.New("bundle must contain 1–1000 units")
	}
	return batch.Units, nil
}

func validateV2Unit(unit v2UnitImport, assets *os.Root) error {
	if unit.Grade < 1 || unit.Grade > 6 || !v2Slug.MatchString(unit.Subject) || !v2Slug.MatchString(unit.Slug) || unit.Position < 1 || unit.Position > 100000 {
		return errors.New("invalid course, slug or position")
	}
	switch unit.State {
	case "draft", "published", "archived":
	default:
		return errors.New("invalid publication state")
	}
	if !unit.Label.valid() || !unit.Description.valid() {
		return errors.New("label and description require English text")
	}
	for _, item := range unit.Objectives {
		if !item.Label.valid() || strings.TrimSpace(item.Reference) == "" || len(item.Reference) > 512 {
			return errors.New("invalid objective or curriculum reference")
		}
	}
	for _, item := range unit.Lessons {
		if !item.Label.valid() || !item.Body.valid() {
			return errors.New("invalid lesson")
		}
	}
	seen := map[string]string{}
	homework := map[string]int{}
	for _, item := range unit.Resources {
		if !v2Slug.MatchString(item.ID) || seen[item.ID] != "" || !item.Label.valid() || item.URL != "" {
			return fmt.Errorf("invalid or duplicate resource %q", item.ID)
		}
		seen[item.ID] = item.Kind
		if item.Language != "en" && item.Language != "ps" && !(item.Kind == "illustration" && item.Language == "") {
			return fmt.Errorf("invalid resource language for %q", item.ID)
		}
		if item.Kind == "homework" {
			homework[item.Language]++
		}
		file, err := openV2Resource(assets, item)
		if err != nil {
			return fmt.Errorf("resource %q: %w", item.ID, err)
		}
		file.Close()
	}
	for lang, count := range homework {
		if count != 7 {
			return fmt.Errorf("homework needs seven worksheets in %s when supplied", lang)
		}
	}
	assessments, err := v2DecodeAssessments(unit.Assessments)
	if err != nil {
		return err
	}
	for _, assessment := range assessments {
		for _, question := range assessment.Questions {
			if question.ResourceID != "" && seen[question.ResourceID] != "illustration" {
				return fmt.Errorf("question %q must reference a unit illustration", question.ID)
			}
		}
	}
	for _, video := range unit.Videos {
		if !video.Approved || !video.Label.valid() || !v2Youtube.MatchString(video.URL) {
			return errors.New("video needs explicit approval, a label and a canonical HTTPS YouTube URL")
		}
	}
	return validateV2Activities(unit.Activities, seen)
}

func openV2Resource(assets *os.Root, item v2Resource) (*os.File, error) {
	if assets == nil || !strings.HasPrefix(item.Path, "resources/") || path.Clean(item.Path) != item.Path || strings.ContainsAny(item.Path, "\\:") {
		return nil, errors.New("expected a relative resources/ path")
	}
	ext := strings.ToLower(path.Ext(item.Path))
	switch item.Kind {
	case "notes", "homework":
		if ext != ".pdf" {
			return nil, errors.New("expected a PDF")
		}
	case "illustration":
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" && ext != ".svg" {
			return nil, errors.New("unsupported illustration type")
		}
	default:
		return nil, errors.New("unsupported resource kind")
	}
	file, err := assets.Open(item.Path)
	if err != nil {
		return nil, err
	}
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() == 0 || info.Size() > 32<<20 {
		file.Close()
		return nil, errors.New("resource must be a nonempty regular file of at most 32 MiB")
	}
	var signature [512]byte
	n, _ := file.ReadAt(signature[:], 0)
	mimeType := http.DetectContentType(signature[:n])
	expected := map[string]string{".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
	valid := expected[ext] == mimeType
	if ext == ".svg" {
		decoder := xml.NewDecoder(io.NewSectionReader(file, 0, min(info.Size(), 16<<10)))
		for {
			token, err := decoder.Token()
			if err != nil {
				break
			}
			if element, ok := token.(xml.StartElement); ok {
				valid = element.Name.Local == "svg" && element.Name.Space == "http://www.w3.org/2000/svg"
				break
			}
		}
	}
	if !valid {
		file.Close()
		return nil, errors.New("resource bytes do not match the declared file type")
	}
	return file, nil
}

func importV2Bundle(ctx context.Context, db *sql.DB, units []v2UnitImport, assets *os.Root, validateOnly bool) error {
	for _, unit := range units {
		if err := validateV2Unit(unit, assets); err != nil {
			return fmt.Errorf("%d/%s/%s: %w", unit.Grade, unit.Subject, unit.Slug, err)
		}
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	type destination struct{ course, unit int64 }
	destinations := make([]destination, len(units))
	seen := map[string]bool{}
	for i, unit := range units {
		dest := &destinations[i]
		if err := tx.QueryRowContext(ctx, "SELECT id FROM v2_courses WHERE grade=? AND subject=? FOR UPDATE", unit.Grade, unit.Subject).Scan(&dest.course); err != nil {
			return fmt.Errorf("course %d/%s: %w", unit.Grade, unit.Subject, err)
		}
		key := fmt.Sprintf("%d/%s", dest.course, unit.Slug)
		if seen[key] {
			return fmt.Errorf("duplicate unit %s", key)
		}
		seen[key] = true
		err := tx.QueryRowContext(ctx, "SELECT id FROM v2_units WHERE course_id=? AND slug=? FOR UPDATE", dest.course, unit.Slug).Scan(&dest.unit)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		if dest.unit != 0 {
			if _, err := tx.ExecContext(ctx, "UPDATE v2_units SET position=position+1000000 WHERE id=?", dest.unit); err != nil {
				return err
			}
		}
	}
	for i, unit := range units {
		dest := destinations[i]
		content := unit.v2Content
		if content.Objectives == nil {
			content.Objectives = []v2Objective{}
		}
		if content.Lessons == nil {
			content.Lessons = []v2Lesson{}
		}
		if content.Resources == nil {
			content.Resources = []v2Resource{}
		}
		if content.Activities == nil {
			content.Activities = []v2Activity{}
		}
		if content.Videos == nil {
			content.Videos = []v2Video{}
		}
		payload, err := json.Marshal(content)
		if err != nil {
			return err
		}
		if dest.unit == 0 {
			result, err := tx.ExecContext(ctx, "INSERT INTO v2_units (course_id,slug,position,state,payload) VALUES (?,?,?,?,?)", dest.course, unit.Slug, unit.Position, unit.State, payload)
			if err != nil {
				return fmt.Errorf("insert unit %s: %w", unit.Slug, err)
			}
			dest.unit, err = result.LastInsertId()
			if err != nil {
				return err
			}
		} else {
			if _, err := tx.ExecContext(ctx, "UPDATE v2_units SET position=?,state=?,payload=? WHERE id=?", unit.Position, unit.State, payload, dest.unit); err != nil {
				return fmt.Errorf("update unit %s: %w", unit.Slug, err)
			}
		}
		if err := v2ImportAssessments(ctx, tx, dest.unit, unit.Assessments); err != nil {
			return fmt.Errorf("assessments for %s: %w", unit.Slug, err)
		}
	}
	if validateOnly {
		return nil
	}
	return tx.Commit()
}
