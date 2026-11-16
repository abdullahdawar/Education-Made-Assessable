# Education-Made-Assessable
A comprehensive digital learning platform for Grades 1–6, featuring Cambridge-based coursework, interactive assessments, illustrated notes, and educational resources.

## Go API and MySQL

Run the API with `cd backend && go run ./cmd/api`. The React development server
already proxies `/api` to port 8080.

Set `DB_USER=ema_app` for the dedicated application account and inject `DB_PASSWORD`
through your runtime's secret configuration. Set exactly one connection endpoint:

- `DB_SOCKET`, the absolute path of the local MySQL Unix socket.
- `DB_ADDR`, a TCP address such as `mysql.example.org:3306`. TCP uses TLS with
  certificate and hostname verification against the system trust store.

The API uses the existing `education_made_assessable` database. With no database
settings, the health route still serves its existing response and curriculum
requests return HTTP 503.

### Proposed database permissions

A MySQL administrator can review the following SQL for a **new local socket
account**. Check that the account name is unused before creating it. Run the
account creation in a private admin session and transfer the generated password
directly to the runtime secret store.

```sql
CREATE USER 'ema_app'@'localhost' IDENTIFIED BY RANDOM PASSWORD;
GRANT SELECT ON education_made_assessable.grades TO 'ema_app'@'localhost';
GRANT SELECT ON education_made_assessable.subjects TO 'ema_app'@'localhost';
GRANT SELECT ON education_made_assessable.grade_subjects TO 'ema_app'@'localhost';
GRANT SELECT ON education_made_assessable.chapters TO 'ema_app'@'localhost';
GRANT SELECT ON education_made_assessable.chapter_content TO 'ema_app'@'localhost';
SHOW GRANTS FOR 'ema_app'@'localhost';
```

For a TCP deployment, scope the MySQL account to the application's source host
and include `REQUIRE SSL` when creating it.

### Local live verification

After provisioning, start the backend from `backend` in a private zsh session.
Use the socket path reported by the local MySQL server. The prompt below reads
the password without echoing it or putting it in shell history.

```zsh
export DB_USER=ema_app DB_SOCKET=/tmp/mysql.sock
unset DB_ADDR
read -rs 'DB_PASSWORD?MySQL application password: '
printf '\n'
export DB_PASSWORD
go run ./cmd/api
unset DB_PASSWORD
```

From another terminal, request `/api/health` and `/api/grades` at
`http://localhost:8080`. Use an ID returned by grades to list subjects, then
use a returned subject ID to list chapters. Request content for a chapter
with both English (`en`) and Pashto (`ps`) entries and verify that each stored translation
appears under its language code.

### Curriculum routes

| GET route | JSON response |
| --- | --- |
| `/api/grades` | Array of grades with `id` and `name` |
| `/api/grades/{gradeID}/subjects` | Array of subjects with `id` and `name` |
| `/api/subjects/{subjectID}/chapters` | Array of chapters across grades with `id`, `name`, `gradeId`, and `chapterNumber` |
| `/api/chapters/{chapterID}/content` | Array of translations with `languageCode`, `title`, nullable `content`, and optional `pdfUrl` |
| `/api/chapters/{chapterID}/practice` | Array of student activities with `kind`, `number`, `languageCode`, and `pdfUrl` |

Empty results return `[]`. Invalid IDs return HTTP 400.

Chapter content returns one entry per stored language. A chapter can have
entries for English (`en`) and Pashto (`ps`), and the response preserves the database language
codes.


### Student learning flow

React requests grades, subjects, chapters, and translations as the student
navigates. The subject chapter route returns chapters across grades, so the
student view filters by the selected grade. The lesson displays English or
right-to-left Pashto and uses the selected translation's PDF link when present.
The practice endpoint supplies worksheet and test links for the selected
language. Each activity opens its page in the practice PDF. Video slots
display an unavailable state until video data is supplied.

The practice endpoint requires column-level SELECT on `chapter_resources`
for `id`, `chapter_id`, `resource_type`, `resource_number`, `description`
and `file_url`. The import uses the description field as a language tag
(`en` or `ps`) because the table has no language column. Answer keys use
the `other` type and private references. The API exposes only worksheets
and tests, and the frontend build includes only the four student PDFs.
The source repository contains the review keys and should retain its
existing access controls.

The approved counting import is in
[curriculum/tools/import-counting-chapter.py](curriculum/tools/import-counting-chapter.py).
It reads `EMA_IMPORT_USER` and `EMA_IMPORT_PASSWORD` from the environment.
Give the import writer SELECT on the six curriculum tables used in the
import and INSERT on chapters, chapter_content and chapter_resources only.
The importer snapshots the affected rows to an owner-only file outside the
repository and inserts all rows in one transaction. A rerun verifies an
existing import and stops on conflicts.

Run the frontend checks from `frontend` with `npm test`, `npm run lint`,
and `npm run build`. The frontend tests use Node's built-in test runner
with TypeScript stripping (Node 24).

The [Grade 1 Mathematics draft](curriculum/grade-1-mathematics-counting.md)
is ready for content review before a database insert is prepared.

### Milestone 3 design

The [visual design requirements](curriculum/milestone-3-visual-design.md)
cover reusable website and print design, bilingual A4 learning materials,
accessibility, and review before publication.

### Production import and owner review

See the [production import and browser verification checklist](docs/chapter-learning-review.md)
for remote MySQL configuration, deployment checks, and answer-key access.
