package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

type v2Localized map[string]string

type v2Option struct {
	ID    string      `json:"id"`
	Label v2Localized `json:"label"`
}

type v2PublicQuestion struct {
	ID         string      `json:"id"`
	Type       string      `json:"type"`
	Prompt     v2Localized `json:"prompt"`
	Marks      int         `json:"marks"`
	Options    []v2Option  `json:"options,omitempty"`
	ResourceID string      `json:"resourceId,omitempty"`
}

type v2Answer struct {
	Option        string   `json:"option,omitempty"`
	Truth         *bool    `json:"truth,omitempty"`
	Accepted      []string `json:"accepted,omitempty"`
	CaseSensitive bool     `json:"caseSensitive,omitempty"`
	Number        *float64 `json:"number,omitempty"`
	Tolerance     *float64 `json:"tolerance,omitempty"`
	Rubric        string   `json:"rubric,omitempty"`
}

type v2Question struct {
	v2PublicQuestion
	Answer v2Answer `json:"answer"`
}

type v2AssessmentDefinition struct {
	Slot             int          `json:"slot"`
	State            string       `json:"state"`
	Title            v2Localized  `json:"title"`
	Instructions     v2Localized  `json:"instructions,omitempty"`
	TimeLimitSeconds int          `json:"timeLimitSeconds,omitempty"`
	Questions        []v2Question `json:"questions"`
}

var v2QuestionID = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

func v2ValidText(text v2Localized, required bool) bool {
	if required && strings.TrimSpace(text["en"]) == "" {
		return false
	}
	for lang, item := range text {
		if (lang != "en" && lang != "ps") || strings.TrimSpace(item) == "" || len(item) > 16000 {
			return false
		}
	}
	return true
}

func v2StrictJSON(r io.Reader, out any) error {
	d := json.NewDecoder(r)
	d.DisallowUnknownFields()
	if err := d.Decode(out); err != nil {
		return err
	}
	if err := d.Decode(new(any)); !errors.Is(err, io.EOF) {
		return errors.New("expected exactly one JSON value")
	}
	return nil
}

func v2DecodeAssessments(raw json.RawMessage) ([]v2AssessmentDefinition, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	if len(bytes.TrimSpace(raw)) == 0 || bytes.TrimSpace(raw)[0] != '[' {
		return nil, errors.New("assessments must be an array")
	}
	var definitions []v2AssessmentDefinition
	if err := v2StrictJSON(bytes.NewReader(raw), &definitions); err != nil {
		return nil, err
	}
	slots := map[int]bool{}
	for _, d := range definitions {
		if d.Slot < 1 || d.Slot > 3 || slots[d.Slot] {
			return nil, fmt.Errorf("invalid or duplicate assessment slot %d", d.Slot)
		}
		slots[d.Slot] = true
		if err := d.validate(); err != nil {
			return nil, fmt.Errorf("assessment slot %d: %w", d.Slot, err)
		}
	}
	return definitions, nil
}

func (d v2AssessmentDefinition) validate() error {
	if d.State != "draft" && d.State != "published" && d.State != "archived" {
		return errors.New("state must be draft, published, or archived")
	}
	if !v2ValidText(d.Title, true) || !v2ValidText(d.Instructions, false) {
		return errors.New("title or instructions have invalid language text")
	}
	if d.TimeLimitSeconds < 0 || d.TimeLimitSeconds > 4*60*60 {
		return errors.New("time limit must be between 0 and 14400 seconds")
	}
	if len(d.Questions) > 100 || (d.State == "published" && len(d.Questions) == 0) {
		return errors.New("published assessments need 1 to 100 questions")
	}
	used := map[string]bool{}
	for _, q := range d.Questions {
		if !v2QuestionID.MatchString(q.ID) || used[q.ID] || !v2ValidText(q.Prompt, true) || q.Marks < 1 || q.Marks > 100 {
			return fmt.Errorf("invalid or duplicate question %q", q.ID)
		}
		used[q.ID] = true
		if err := q.validate(d.State == "published"); err != nil {
			return fmt.Errorf("question %q: %w", q.ID, err)
		}
	}
	return nil
}

func (q v2Question) validate(published bool) error {
	a := q.Answer
	if len(a.Rubric) > 16000 || (q.ResourceID != "" && !v2QuestionID.MatchString(q.ResourceID)) {
		return errors.New("invalid rubric or resource ID")
	}
	if q.Type != "multiple_choice" && (len(q.Options) != 0 || a.Option != "") {
		return errors.New("options are supported only for multiple choice")
	}
	if q.Type != "true_false" && a.Truth != nil {
		return errors.New("truth answer is supported only for true/false")
	}
	if q.Type != "short_answer" && (len(a.Accepted) > 0 || a.Number != nil || a.Tolerance != nil || a.CaseSensitive) {
		return errors.New("accepted answers and numeric options are supported only for short answers")
	}
	switch q.Type {
	case "multiple_choice":
		if len(q.Options) < 2 || len(q.Options) > 12 {
			return errors.New("choose 2 to 12 options")
		}
		optionIDs := map[string]bool{}
		for _, option := range q.Options {
			if !v2QuestionID.MatchString(option.ID) || optionIDs[option.ID] || !v2ValidText(option.Label, true) {
				return errors.New("invalid or duplicate option")
			}
			optionIDs[option.ID] = true
		}
		if !optionIDs[a.Option] {
			return errors.New("answer must reference an option")
		}
	case "true_false":
		if a.Truth == nil {
			return errors.New("truth answer is required")
		}
	case "short_answer":
		if (a.Number != nil && len(a.Accepted) != 0) || (a.Tolerance != nil && (a.Number == nil || *a.Tolerance < 0)) || len(a.Accepted) > 50 {
			return errors.New("invalid accepted answers or tolerance")
		}
		for _, text := range a.Accepted {
			if strings.TrimSpace(text) == "" || len(text) > 4000 {
				return errors.New("accepted answer must be nonblank and no more than 4000 bytes")
			}
		}
	case "long_answer":
		if published && strings.TrimSpace(a.Rubric) == "" {
			return errors.New("long answers require a private rubric")
		}
	default:
		return fmt.Errorf("unsupported type %q", q.Type)
	}
	return nil
}

func (d v2AssessmentDefinition) possibleMarks() int {
	total := 0
	for _, q := range d.Questions {
		total += q.Marks
	}
	return total
}

func (d v2AssessmentDefinition) validateResponses(responses map[string]string) error {
	questions := make(map[string]v2Question, len(d.Questions))
	for _, q := range d.Questions {
		questions[q.ID] = q
	}
	for id, response := range responses {
		q, exists := questions[id]
		if !exists || !utf8.ValidString(response) || len(response) > 8000 {
			return fmt.Errorf("invalid response for question %q", id)
		}
		if response == "" {
			continue
		}
		switch q.Type {
		case "multiple_choice":
			valid := false
			for _, option := range q.Options {
				if response == option.ID {
					valid = true
					break
				}
			}
			if !valid {
				return fmt.Errorf("invalid choice for question %q", id)
			}
		case "true_false":
			if response != "true" && response != "false" {
				return fmt.Errorf("invalid boolean for question %q", id)
			}
		}
	}
	return nil
}

func (d v2AssessmentDefinition) score(responses map[string]string) (earned, pending int) {
	for _, q := range d.Questions {
		value := strings.TrimSpace(responses[q.ID])
		if value == "" {
			continue
		}
		a := q.Answer
		switch q.Type {
		case "multiple_choice":
			if value == a.Option {
				earned += q.Marks
			}
		case "true_false":
			if value == strconv.FormatBool(*a.Truth) {
				earned += q.Marks
			}
		case "long_answer":
			pending += q.Marks
		case "short_answer":
			if a.Number != nil {
				tolerance := 0.0
				if a.Tolerance != nil {
					tolerance = *a.Tolerance
				}
				if n, err := strconv.ParseFloat(value, 64); err == nil && !math.IsNaN(n) && !math.IsInf(n, 0) && math.Abs(n-*a.Number) <= tolerance {
					earned += q.Marks
				}
			} else if len(a.Accepted) == 0 {
				pending += q.Marks
			} else {
				for _, accepted := range a.Accepted {
					if value == strings.TrimSpace(accepted) || (!a.CaseSensitive && strings.EqualFold(value, strings.TrimSpace(accepted))) {
						earned += q.Marks
						break
					}
				}
			}
		}
	}
	return earned, pending
}

func v2ImportAssessments(ctx context.Context, tx *sql.Tx, unitID int64, raw json.RawMessage) error {
	definitions, err := v2DecodeAssessments(raw)
	if err != nil {
		return err
	}
	for _, d := range definitions {
		encoded, err := json.Marshal(d)
		if err != nil {
			return err
		}
		digest := sha256.Sum256(encoded)
		if _, err = tx.ExecContext(ctx, `INSERT INTO v2_assessments (unit_id, slot) VALUES (?,?)
			ON DUPLICATE KEY UPDATE slot=slot`, unitID, d.Slot); err != nil {
			return err
		}
		var assessmentID int64
		if err = tx.QueryRowContext(ctx, `SELECT id FROM v2_assessments WHERE unit_id=? AND slot=? FOR UPDATE`, unitID, d.Slot).Scan(&assessmentID); err != nil {
			return err
		}
		var version int
		var previous []byte
		err = tx.QueryRowContext(ctx, `SELECT version,fingerprint FROM v2_assessment_versions WHERE assessment_id=? ORDER BY version DESC LIMIT 1`, assessmentID).Scan(&version, &previous)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if bytes.Equal(previous, digest[:]) {
			continue
		}
		if _, err = tx.ExecContext(ctx, `INSERT INTO v2_assessment_versions (assessment_id,version,state,definition,fingerprint) VALUES (?,?,?,?,?)`,
			assessmentID, version+1, d.State, encoded, digest[:]); err != nil {
			return err
		}
	}
	return nil
}
