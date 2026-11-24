# Education Made Assessable

An English and Pashto learning website for Grades 1–6. Version 2 supports
39 courses through a shared curriculum, unit viewer, activities, digital
assessments and anonymous learner progress.

## Run locally on macOS

From the repository root:

~~~bash
./scripts/dev.sh start
~~~

Open [the local website](http://127.0.0.1:5173). Start only one profile per
port pair. The startup script isolates its own MySQL data directory and
socket, applies migrations and imports the Grade 1 bundle on the first
standard start. Use `./scripts/dev.sh stop` or interrupt the start terminal
to shut down. Set `EMA_MYSQL_BIN` if MySQL 8 binaries are installed outside
`/usr/local/mysql/bin`.

## Development and release notes

- [Architecture, API, startup and deployment](docs/platform-v2-architecture-report.md)
- [Content authoring and publishing](docs/content-authoring-guide.md)
- [Grade 1 migration and PDF preservation](docs/grade-1-v2-migration.md)
- [Workspace isolation and checkpoints](docs/workspace-cleanup-report.md)
- [Browser test setup and synthetic fixture](frontend/tests/browser/README.md)
- [Curriculum framework and objective mapping](curriculum/curriculum-mapping.md)

Run `npm test`, `npm run lint` and `npm run build` from `frontend/`, and
`go test ./...` and `go vet ./...` from `backend/`. MySQL and browser
integration checks use disposable test data. Run `./scripts/test-db.sh`
from the repository root for a fresh isolated MySQL test instance. The original Grade 1
[release review](docs/chapter-learning-review.md) records historical
answer-key and content review findings that still affect production use.
