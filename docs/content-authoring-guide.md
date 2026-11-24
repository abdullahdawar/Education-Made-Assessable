# Authoring Version 2 content

A bundle is a JSON document with a `units` array. Edit the bundle and keep
its referenced files in a separate asset root, under `resources/`. Give
every course unit a stable slug. Reordering or editing an existing slug
keeps its unit identity and learner history. The grade and subject slug
select an existing course.

## Create, preview and publish

1. Copy the minimal example below into a private bundle file. Use the
   source objective register to verify IDs and edition references.
2. Add the teaching notes, standalone homework PDFs and illustrations to
   the asset root. Use a new relative asset path when replacing bytes.
3. Add three assessment slots. Keep each slot in `draft` until its wording,
   answers, scoring and accessibility have been reviewed.
4. With the database variables from [.env.example](../.env.example)
   configured for an authorized instance, run the following from the
   repository root. Set both paths to absolute, private locations.

~~~bash
export EMA_ASSETS=/absolute/path/to/assets
bundle=/absolute/path/to/unit-bundle.json
cd backend
go run ./cmd/api content preview "$bundle"
go run ./cmd/api content validate "$bundle"
go run ./cmd/api content import "$bundle"
~~~

Preview prints the student content fields to the local terminal and omits
assessment definitions. Validate checks resource files, schema and database
conflicts in a transaction that rolls back. Import commits the entire bundle
or rolls it back. Edit the same bundle for changes. Use `state: "published"`
to make a unit visible, or `state: "archived"` to retire it. Include all
affected units in one bundle to swap positions. A slot omitted from the
assessment array is retained, so include an explicit archived slot to
withdraw it. Editing an assessment creates a new version and preserves
historical attempts. Use an authorized staging instance for visual previews
of unpublished content.

## Minimal unit shape

The example is synthetic. Replace its text with verified educational
content before publication.

~~~json
{
  "units": [{
    "grade": 4,
    "subject": "computer-science",
    "slug": "sample-unit",
    "position": 1,
    "state": "draft",
    "label": {"en": "Sample unit", "ps": "بېلګه"},
    "description": {"en": "A sample description.", "ps": "د بېلګې تشریح."},
    "objectives": [{
      "label": {"en": "Example learning objective."},
      "reference": "Replace with a verified curriculum reference"
    }],
    "lessons": [{
      "label": {"en": "Lesson"},
      "body": {"en": "Write the lesson here.", "ps": "درس دلته ولیکئ."}
    }],
    "resources": [{
      "id": "notes-en",
      "kind": "notes",
      "label": {"en": "Teaching notes"},
      "language": "en",
      "path": "resources/sample/notes-en.pdf"
    }, {
      "id": "lesson-image",
      "kind": "illustration",
      "label": {"en": "Describe the illustration here"},
      "path": "resources/sample/diagram.svg"
    }],
    "activities": [{
      "id": "practice",
      "type": "multiple-choice",
      "title": {"en": "Try it"},
      "rounds": [{
        "id": "round-1",
        "prompt": {"en": "Choose a shape."},
        "resourceId": "lesson-image",
        "choices": [
          {"id": "triangle", "label": {"en": "Triangle"}},
          {"id": "circle", "label": {"en": "Circle"}}
        ],
        "answer": "triangle",
        "hint": {"en": "Look for three sides."}
      }]
    }],
    "assessments": [
      {"slot": 1, "state": "draft", "title": {"en": "Test 1"}, "questions": []},
      {"slot": 2, "state": "draft", "title": {"en": "Test 2"}, "questions": []},
      {"slot": 3, "state": "draft", "title": {"en": "Test 3"}, "questions": []}
    ]
  }]
}
~~~

## Resources and languages

- Provide English text in `en` and the reviewed Pashto presentation in
  `ps`. The interface shows original English where a translation is absent.
- `notes` and `homework` entries require a language and PDFs. For a
  language with homework, include seven entries with distinct IDs, for
  example `homework-en-01` through `homework-en-07`. Supply the seven
  Pashto entries separately. The student-facing files must contain only
  their teaching notes or individual homework worksheets.
- `illustration` accepts PNG, JPEG, WebP and SVG. Use a meaningful label
  for each presentation. An activity or question can refer to its ID via
  `resourceId`.
- Approved videos use a localized label, a canonical YouTube URL and
  `approved: true`. Record the reviewer decision before setting that flag.
- Keep combined homework/test originals, private bundles, assessment
  definitions and marking rubrics outside every web root. Never copy an
  entire asset directory into a public deployment.

## Digital assessments

Each slot can set localized `title` and `instructions`, optional
`timeLimitSeconds` and a `questions` array. A zero or absent time limit
means untimed. Each question has a stable `id`, localized `prompt`, a
positive integer `marks`, and one of these shapes:

| Type | Definition |
| --- | --- |
| `multiple_choice` | Give `options` with IDs and labels. Set `answer.option` to the correct option ID. |
| `short_answer` | Set `answer.accepted` for text and optional `caseSensitive`. For numeric responses, use `answer.number` and optional `tolerance`. Leave both empty for a subjective response. |
| `true_false` | Set `answer.truth` to a JSON boolean. |
| `long_answer` | Use a multiline prompt and optional private `answer.rubric`. The attempt records pending marks for review. |

For example, a short-answer definition can use
`"answer": {"number": 2, "tolerance": 0.01}`. Review all three slots before
publishing the unit as part of a complete pathway. Learners need two
distinct valid submissions on the current unit to unlock the next.

## Activities

Published practice rounds can include choices, text answers, ordered answer
IDs, hints and explanations. These practice answers are learner-facing and
separate from private assessment answers. Supported kinds include
`multiple-choice`, `matching`, `sorting`, `sequencing`, `classification`,
`counting`, `fill-in-the-blanks`, `drag-and-drop`, `word-construction`,
`picture-identification`, `true-false`, `prediction` and `observation`.
Practice with no configured answer records the response for that round
without scoring. Existing specialized games are registered by stable ID.

See [Grade 1 migration](grade-1-v2-migration.md) for the preservation
workflow. The test-only [fixture generator](../tests/fixtures/build_demo_bundle.py)
provides an executable example with seven resources per language and three
published test slots.
