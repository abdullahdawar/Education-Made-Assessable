# Education Made Assessable Version 2 architecture

## Summary and workspace

Version 2 retains React, TypeScript, Vite, Go and MySQL. It provides a
single curriculum and unit pathway for Grades 1–6 and all 39 mapped
courses, with server-side assessments and persistent anonymous progress.
Course mappings describe scope and framework. They carry no claim that
unwritten curriculum has been approved or authored.

The canonical checkout remains under
`~/Desktop/Abdullah Workspace/Education Made Assessable/Source/Education-Made-Assessable`.
The active Version 2 checkout is
`~/Desktop/Abdullah Workspace/Education Made Assessable/Worktrees/Education-Made-Assessable-platform-v2`.
The [cleanup report](workspace-cleanup-report.md) describes preserved
checkouts and the Bella De Ci move. The last original Bella copy in the
Codex-managed e50c checkout had its 30-second video open in QuickTime
during the current audit, so it was retained. A verified independent
copy exists in the Bella De Ci project. The canonical and Version 2
checkouts are isolated.

## Directory structure

| Location | Role |
| --- | --- |
| `frontend/src/platform/` | Homepage, grade and subject pages, universal unit viewer, assessment interface and activity registry |
| `backend/cmd/api/` | REST routing, content validation, resource delivery, learner and assessment services |
| `backend/cmd/api/migrations/` | Checksummed MySQL migrations, course seed and integrity constraints |
| `curriculum/` | Preserved curriculum sources and Grade 1 migration tools |
| `output/pdf/` | Existing migration-source packets, outside the Vite and API static roots |
| `output/local/` | Ignored private import bundles, isolated databases and development artifacts |
| `scripts/dev.sh` | Local startup, readiness and controlled shutdown |
| `tests/fixtures/` | Synthetic, explicitly isolated workflow fixture |
| `docs/` | Reports, authoring instructions and browser evidence |

## Database and integrity

`v2_grades`, `v2_subjects` and `v2_courses` store the grade mapping and
framework. A course has ordered `v2_units` with draft, published and
archived states. Unit payloads hold bilingual objectives and lessons,
references, resources, videos and configurable practice activities.

Stable assessment slots belong to a unit. Their version rows store a
private validated definition plus a content digest. Attempts bind to an
immutable version, and attempt rows persist saved and submitted answers
and marking state. Learner records use a hash of a random browser token.
Progress is computed from durable submissions, and remembered unlocks
are persisted. Primary keys, foreign keys, unique slots, transactions and
a learner-level lock prevent concurrent submissions from counting twice.
The grade and course seed is idempotent. The migration runner takes a
schema lock and detects changes to migrations already applied.

The learner cookie is HttpOnly, SameSite Strict, and Secure for non-local
hosts. Anonymous progress survives refreshes and normal browser restarts.
Clearing browser data can lose access to that progress. It does not
transfer between browsers or devices. A future account association can reference the stable learner primary key
while keeping the assessment history attached to the same learner record.

## API

All versioned endpoints live under `/api/v2`. Assessment and resource
requests use the current browser cookie. API errors are JSON with an
`error` message. Restricted unit requests return a forbidden response,
and attempts outside the current learner's ownership return a not-found
response.

| Method and path | Purpose |
| --- | --- |
| GET `/api/health` | API liveness |
| GET `/api/v2/grades` | Six grade choices |
| GET `/api/v2/grades/{grade}/subjects` | Mapped subjects and progress |
| GET `/api/v2/courses/{course}` | Ordered journey and availability |
| GET `/api/v2/units/{unit}` | Protected objectives, lessons, resources, activity and video metadata |
| GET `/api/v2/units/{unit}/resources/{resource}` | Protected download from the dedicated asset root |
| GET `/api/v2/units/{unit}/assessments` | Published slots and learner history |
| POST `/api/v2/assessments/{assessment}/attempts` | Start or resume an attempt |
| GET `/api/v2/attempts/{attempt}` | Retrieve authorized questions, saved responses or results |
| PUT `/api/v2/attempts/{attempt}` | Save responses |
| POST `/api/v2/attempts/{attempt}/submit` | Submit and score the attempt |
| GET `/api/v2/progress/{course}` | Current learner's persisted unit progression |

For example, `curl -c cookies -b cookies http://127.0.0.1:5173/api/v2/grades/1/subjects`
returns Grade 1 courses and creates a browser-equivalent session. The UI
uses same-origin JSON requests. The former chapter and practice API does
not exist on the running Version 2 service.

## Learning and progression

The site keeps the red panda identity, grade cards, subject catalogue and
ordered learning journey together. The reusable viewer presents
objectives, lesson text and illustrations, teaching notes, homework,
approved videos, activities and digital tests. English and Pashto use
shared navigation, keyboard focus, responsive layouts, RTL direction
and reduced-motion support.

The four supported question types are single-choice, short answer,
true or false, and long answer. The Go service grades objective responses,
preserves subjective answers and reports pending marks. It responds with
student-safe question fields, never private marking definitions. Timed
attempts use a server-side deadline. Assessment views support resuming,
saving, submission confirmation, results and retakes.

The first published unit is available. Two distinct completed tests unlock
its successor, including valid submissions with pending subjective marks.
Repeated attempts at the same test, drafts, and unfinished attempts never
satisfy the rule. Homework, practice and videos are independent of
unlocking. An unlocked unit remains available to that learner. Protected
unit and resource endpoints enforce the same rule even on direct URLs.

## Import and existing content

See the [authoring guide](content-authoring-guide.md) for creation, editing,
reordering, resource replacement, preview, validation, publishing,
archiving and bulk import. The [Grade 1 migration report](grade-1-v2-migration.md)
describes the source and verification steps.

The legacy bundle contains 13 Mathematics units, 12 English units and
one unfinished Science draft. It preserves 50 byte-identical notes PDFs
and 350 homework pages with their original text, page size, visual
rendering and page-local accessibility structure. The extractor checks
the original homework-to-test page boundary. The migrated student assets
contain individual homework pages only. The three original illustrations
are kept. The 78 migrated assessment slots are drafts awaiting digital
assessment review. Counting Test 2 keeps its original numeric answers.
Grade 1 courses with multiple lessons remain gated beyond the first unit
until genuine assessments are reviewed and published. Synthetic workflow
fixtures run in a separate disposable development profile.

## Local startup

Run from the Version 2 checkout:

~~~bash
./scripts/dev.sh start
~~~

Open `http://127.0.0.1:5173`. The script checks prerequisites, starts MySQL
with its own data directory and Unix socket, applies migrations, imports
the Grade 1 bundle on the first standard start, and runs the Go and Vite
servers on loopback. Set `EMA_MYSQL_BIN` if the MySQL binaries are
outside `/usr/local/mysql/bin`. Node, Go, Python 3 and the MySQL 8
client/server binaries are required for a fresh setup. The first setup
may fetch dependencies. Change ports with `EMA_WEB_PORT` and
`EMA_API_PORT`. Use `./scripts/dev.sh stop` in another terminal, or
interrupt the start terminal. The script only stops its own processes.

For the synthetic scenario, from the same directory use:

~~~bash
python3 tests/fixtures/build_demo_bundle.py output/local/browser-demo
EMA_DEV_PROFILE=browser \
EMA_ASSETS="$PWD/output/local/browser-demo" \
EMA_BUNDLE="$PWD/output/local/browser-demo/import.json" \
./scripts/dev.sh start
~~~

Run the fixture generator only once per destination. Use
`EMA_DEV_PROFILE=browser ./scripts/dev.sh stop` to stop that profile.
Do not use the synthetic fixture with the standard or production database.

## Deployment and recovery preparation

Build the frontend with `npm ci && npm run build` from `frontend/`.
Build the API with `go build -mod=readonly ./cmd/api` from `backend/`.
Use the environment template with an explicitly authorized database and
a dedicated private asset root. Run the API binary with `migrate` before
starting it. Serve `frontend/dist` as the only static root, use SPA
fallback for frontend routes, and reverse proxy `/api/` on the same
HTTPS origin with the original Host preserved. Keep the Go service on
loopback or a private network. Use the health endpoint for liveness and
the grades endpoint for readiness. Send application and reverse-proxy
logs to the deployment's standard log collection.

Back up the application database with MySQL's transaction-consistent
`mysqldump --single-transaction` workflow using authorized credentials.
Back up the matching version of the private resources and import
definitions separately. Restore to a new isolated database, verify its
migration checksums and matching resource tree, then switch services
only after validation. The developer script's private database and
password file never belong in a release artifact.

## Verification results

| Check | Result |
| --- | --- |
| Frontend tests, lint and production build | 30 tests passed. Lint and build passed. The production output contains no assessment or combined practice PDFs. |
| Go tests and go vet | Passed, including the disposable MySQL curriculum and assessment integrations. Run `./scripts/test-db.sh` for a fresh isolated database. |
| MySQL migration and content import | Fresh migrations, repeat migrations, all 39 course mappings, validating with rollback, double import, conflict rollback, resource restrictions and legacy route removal verified. |
| Assessment and progression | All four question types, answer confidentiality, learner isolation, autosave/resume, historical versions, timeout behavior and concurrent progression verified. |
| Browser learning journey | Chrome, Firefox and WebKit passed at 320, 375, 768 and 1440 px on an isolated synthetic course. Tests cover RTL, keyboard and touch input, homework access, repeated Test 1, two distinct submissions and persisted progress after refresh. |
| Live Grade 1 check | Verified the 13 Mathematics and 12 English units, the initial locked state, seven English and seven Pashto worksheets for the first Mathematics unit, and a successful protected PDF response. |
| PDF migration | Five automated tests passed. Every one of the 350 extracted pages matched its source render. All 50 teaching-note files retained their original checksum. |
| Startup and shutdown | Standard profile initialized MySQL and imported the 26-unit bundle. A controlled stop and subsequent start retained the same data. |

[Browser screenshots](screenshots/platform-v2/) show the actual running
site. Assessment and unlocking screenshots use clearly labelled synthetic
content. The [Grade 1 Mathematics screenshot](screenshots/platform-v2/grade-1-maths.png)
shows migrated content in the standard development profile.

## Release limitations

Historical public answer-key exposure remains an unresolved production
release blocker. Original combined source PDFs are retained outside
student-serving roots. The content-specific educator, accessibility and
Pashto review status is unchanged. No deployment was performed.

Before a production release, investigate and resolve the historical
exposure through a separately approved security review, audit the
deployment's static and resource routes, and review the converted
assessment prompts, scoring, language and accessibility. Publish the
reviewed assessment versions to make the full existing Grade 1 journeys
unlockable. Relocate the last Bella source archive only after the open
QuickTime file is closed, keeping the registered Codex worktree intact.
