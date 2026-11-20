"""Back up and import the approved counting chapter using an INSERT-only writer."""

import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

DATABASE = "education_made_assessable"
SOURCE = Path(__file__).resolve().parents[1] / "grade-1-mathematics-counting.md"
TITLE = "Counting collections from 0 to 20"
STEM = "grade-1-counting"


def connection_args():
    host = os.environ.get("EMA_IMPORT_HOST")
    socket = os.environ.get("EMA_IMPORT_SOCKET")
    if host and socket:
        raise ValueError("Set either EMA_IMPORT_HOST or EMA_IMPORT_SOCKET")
    if host:
        ca = os.environ["EMA_IMPORT_TLS_CA"]
        port = int(os.environ.get("EMA_IMPORT_PORT", "3306"))
        if not 1 <= port <= 65535:
            raise ValueError("EMA_IMPORT_PORT must be between 1 and 65535")
        return ["--protocol=TCP", f"--host={host}", f"--port={port}",
                "--ssl-mode=VERIFY_IDENTITY", f"--ssl-ca={ca}"]
    return ["--protocol=SOCKET", f"--socket={socket or '/tmp/mysql.sock'}"]


def query(sql):
    env = dict(os.environ, MYSQL_PWD=os.environ["EMA_IMPORT_PASSWORD"])
    result = subprocess.run(
        ["mysql", "--no-defaults", "--no-login-paths", *connection_args(),
         "--user", os.environ["EMA_IMPORT_USER"], "--default-character-set=utf8mb4",
         "--batch", "--raw", "--skip-column-names", DATABASE],
        input=sql, text=True, capture_output=True, env=env,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def literal(value):
    return "CONVERT(X'%s' USING utf8mb4)" % value.encode().hex()


def snapshot():
    tables = {
        "grades": ("grade_number=1", "id"),
        "subjects": ("subject_name='Mathematics'", "id"),
        "grade_subjects": ("grade_id=(SELECT id FROM grades WHERE grade_number=1) AND "
                           "subject_id=(SELECT id FROM subjects WHERE subject_name='Mathematics')",
                           "grade_id subject_id"),
        "chapters": ("grade_id=(SELECT id FROM grades WHERE grade_number=1) AND "
                     "subject_id=(SELECT id FROM subjects WHERE subject_name='Mathematics') AND "
                     "chapter_number=1", "id grade_id subject_id chapter_number chapter_title description created_at"),
    }
    chapter_filter = (f"chapter_id IN (SELECT id FROM chapters WHERE {tables['chapters'][0]})")
    tables["chapter_content"] = (chapter_filter, "id chapter_id language_code title content pdf_url audio_url created_at")
    tables["chapter_resources"] = (chapter_filter, "id chapter_id resource_type resource_number title description file_url external_url created_at")
    statements = []
    for table, (condition, fields) in tables.items():
        columns = ", ".join(f"'{field}', {field}" for field in fields.split())
        statements.append(f"SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT({columns})), JSON_ARRAY()) FROM {table} WHERE {condition};")
    lines = query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY;\n" + "\n".join(statements) + "\nCOMMIT;")
    rows = lines.splitlines()
    if len(rows) != len(tables):
        raise RuntimeError("Unexpected number of backup results")
    return dict(zip(tables, map(json.loads, rows)))


def approved_rows():
    sections = re.split(r"^## ", SOURCE.read_text(), flags=re.M)
    lessons = []
    resources = []
    for index, (lang, title) in enumerate([("en", TITLE), ("ps", "له ۰ څخه تر ۲۰ پورې د شیانو شمېرل")], 1):
        content = sections[index].split("\n", 1)[1].strip().replace("**", "")
        lessons.append((lang, title, content, f"/learning/{STEM}-{lang}-notes.pdf"))
        for kind, count, first_page in [("worksheet", 7, 1), ("test", 3, 8)]:
            for number in range(1, count + 1):
                url = f"/learning/{STEM}-{lang}-worksheets-and-tests.pdf#page={first_page + number - 1}"
                resources.append((kind, number, f"{kind.title()} {number}", lang, url))
        resources.append(("other", None, f"Answer keys ({lang})", lang, f"private:{STEM}-{lang}-answer-keys.pdf"))
    return lessons, resources


def verify(data, lessons, resources):
    chapter, = data["chapters"]
    if chapter["chapter_title"] != TITLE:
        raise RuntimeError("Existing chapter title conflicts with the approved import")
    actual_lessons = {tuple(row[key] for key in ("language_code", "title", "content", "pdf_url")) for row in data["chapter_content"]}
    actual_resources = {tuple(row[key] for key in ("resource_type", "resource_number", "title", "description", "file_url")) for row in data["chapter_resources"]}
    if (len(data["chapter_content"]) != len(lessons) or actual_lessons != set(lessons)
        or len(data["chapter_resources"]) != len(resources) or actual_resources != set(resources)):
        raise RuntimeError("Existing lesson or resource rows conflict with the approved import")
    return chapter["id"]


def main():
    lessons, resources = approved_rows()
    data = snapshot()
    directory = Path(os.environ.get("EMA_IMPORT_BACKUP_DIR",
                                    Path.home() / ".config/education-made-assessable/backups"))
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", dir=directory, prefix="counting-before-", suffix=".json", delete=False) as backup:
        json.dump(data, backup, ensure_ascii=False, indent=2)
        print(f"Backup: {backup.name}", flush=True)
    if data["chapters"]:
        print(f"Previously imported chapter {verify(data, lessons, resources)}. No writes performed.")
        return
    mapping, = data["grade_subjects"]
    grade_id = int(mapping["grade_id"])
    subject_id = int(mapping["subject_id"])

    def values(rows):
        return ",\n".join("(@chapter_id, " + ", ".join(
            "NULL" if v is None else str(v) if isinstance(v, int) else literal(v)
            for v in row
        ) + ")" for row in rows)

    query(f"""START TRANSACTION;
INSERT INTO chapters (grade_id, subject_id, chapter_number, chapter_title)
VALUES ({grade_id}, {subject_id}, 1, {literal(TITLE)});
SET @chapter_id = LAST_INSERT_ID();
INSERT INTO chapter_content (chapter_id, language_code, title, content, pdf_url)
VALUES {values(lessons)};
INSERT INTO chapter_resources (chapter_id, resource_type, resource_number, title, description, file_url)
VALUES {values(resources)};
COMMIT;""")
    print(f"Imported chapter {verify(snapshot(), lessons, resources)} with 2 lessons and 22 resource records.")


if __name__ == "__main__":
    main()
