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
| `/api/chapters/{chapterID}/content` | Array of translations with `languageCode`, `title`, and nullable `content` |

Empty results return `[]`. Invalid IDs return HTTP 400.

Chapter content returns one entry per stored language. A chapter can have
entries for English (`en`) and Pashto (`ps`), and the response preserves the database language
codes.
