package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type v2Activity struct {
	ID           string            `json:"id"`
	Type         string            `json:"type"`
	Title        v2Text            `json:"title"`
	Component    string            `json:"component,omitempty"`
	Instructions *v2Text           `json:"instructions,omitempty"`
	Rounds       []v2ActivityRound `json:"rounds,omitempty"`
}

type v2ActivityRound struct {
	ID          string             `json:"id"`
	Prompt      v2Text             `json:"prompt"`
	Hint        *v2Text            `json:"hint,omitempty"`
	Explanation *v2Text            `json:"explanation,omitempty"`
	ResourceID  string             `json:"resourceId,omitempty"`
	Image       *v2Resource        `json:"image,omitempty"`
	Choices     []v2ActivityChoice `json:"choices,omitempty"`
	Answer      json.RawMessage    `json:"answer,omitempty"`
	Grid        *v2ActivityGrid    `json:"grid,omitempty"`
}

type v2ActivityChoice struct {
	ID    string `json:"id"`
	Label v2Text `json:"label"`
}

type v2ActivityGrid struct {
	Start   int      `json:"start"`
	Goal    int      `json:"goal"`
	Blocked int      `json:"blocked"`
	Moves   []string `json:"moves,omitempty"`
}

func validateV2Activities(activities []v2Activity, resources map[string]string) error {
	seen := map[string]bool{}
	for _, activity := range activities {
		if !v2Slug.MatchString(activity.ID) || seen[activity.ID] || !activity.Title.valid() || (activity.Instructions != nil && !activity.Instructions.valid()) {
			return fmt.Errorf("invalid or duplicate activity %q", activity.ID)
		}
		seen[activity.ID] = true
		switch activity.Type {
		case "specialized":
			switch activity.Component {
			case "counting-adventure", "number-explorer", "shape-sorter":
			default:
				return fmt.Errorf("unregistered activity component %q", activity.Component)
			}
			if len(activity.Rounds) != 0 {
				return fmt.Errorf("registered component %q cannot have configurable rounds", activity.Component)
			}
			continue
		case "multiple-choice", "matching", "sorting", "sequencing", "classification", "counting", "fill-in-the-blanks", "drag-and-drop", "word-construction", "picture-identification", "true-false", "prediction", "observation":
		default:
			return fmt.Errorf("unsupported activity type %q", activity.Type)
		}
		if activity.Component != "" || len(activity.Rounds) == 0 || len(activity.Rounds) > 100 {
			return fmt.Errorf("invalid rounds for %q", activity.ID)
		}
		rounds := map[string]bool{}
		for _, round := range activity.Rounds {
			if !v2Slug.MatchString(round.ID) || rounds[round.ID] || !round.Prompt.valid() {
				return fmt.Errorf("invalid or duplicate round %q", round.ID)
			}
			rounds[round.ID] = true
			if err := round.validate(resources); err != nil {
				return fmt.Errorf("%s/%s: %w", activity.ID, round.ID, err)
			}
		}
	}
	return nil
}

func (r v2ActivityRound) validate(resources map[string]string) error {
	if (r.Hint != nil && !r.Hint.valid()) || (r.Explanation != nil && !r.Explanation.valid()) {
		return errors.New("invalid hint or explanation")
	}
	if r.Image != nil || (r.ResourceID != "" && resources[r.ResourceID] != "illustration") {
		return errors.New("image must reference an illustration resource")
	}
	if len(r.Choices) > 64 {
		return errors.New("too many choices")
	}
	choices := map[string]bool{}
	for _, choice := range r.Choices {
		if !v2Slug.MatchString(choice.ID) || !choice.Label.valid() || choices[choice.ID] {
			return errors.New("invalid or duplicate choice")
		}
		choices[choice.ID] = true
	}
	if len(r.Answer) > 0 {
		var answers []string
		switch r.Answer[0] {
		case '"':
			var single string
			if err := json.Unmarshal(r.Answer, &single); err != nil {
				return err
			}
			answers = []string{single}
		case '[':
			if err := json.Unmarshal(r.Answer, &answers); err != nil {
				return err
			}
		default:
			return errors.New("answer must be text or a list of choice IDs")
		}
		if len(answers) == 0 || len(answers) > 64 {
			return errors.New("invalid answer length")
		}
		for _, answer := range answers {
			if strings.TrimSpace(answer) == "" || (len(choices) > 0 && !choices[answer]) {
				return errors.New("answer does not identify an available choice")
			}
		}
	}
	if g := r.Grid; g != nil {
		if g.Start < 0 || g.Start > 3 || g.Goal < 0 || g.Goal > 3 || g.Blocked < 0 || g.Blocked > 3 ||
			g.Start == g.Blocked || g.Goal == g.Blocked || g.Start == g.Goal || len(g.Moves) > 64 {
			return errors.New("invalid movement grid")
		}
		for _, move := range g.Moves {
			switch move {
			case "up", "down", "left", "right":
			default:
				return errors.New("invalid movement direction")
			}
		}
	}
	return nil
}
