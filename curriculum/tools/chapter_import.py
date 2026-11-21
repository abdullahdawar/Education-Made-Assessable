"""Transactional, insert-only importer for Grade 1 Mathematics chapters."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

DATABASE = "education_made_assessable"


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


def snapshot(chapter_number):
    tables = {
        "grades": ("grade_number=1", "id"),
        "subjects": ("subject_name='Mathematics'", "id"),
        "grade_subjects": ("grade_id=(SELECT id FROM grades WHERE grade_number=1) AND "
                           "subject_id=(SELECT id FROM subjects WHERE subject_name='Mathematics')",
                           "grade_id subject_id"),
        "chapters": ("grade_id=(SELECT id FROM grades WHERE grade_number=1) AND "
                     "subject_id=(SELECT id FROM subjects WHERE subject_name='Mathematics') AND "
                     f"chapter_number={chapter_number}", "id grade_id subject_id chapter_number chapter_title description created_at"),
    }
    chapter_filter = (f"chapter_id IN (SELECT id FROM chapters WHERE {tables['chapters'][0]})")
    tables["chapter_content"] = (chapter_filter, "id chapter_id language_code title content pdf_url audio_url created_at")
    tables["chapter_resources"] = (chapter_filter, "id chapter_id resource_type resource_number title description file_url external_url created_at")
    statements = [
        "SELECT JSON_OBJECT('database', DATABASE(), 'serverUuid', @@server_uuid);",
        "SELECT COALESCE(JSON_OBJECTAGG(TABLE_NAME, ENGINE), JSON_OBJECT()) "
        "FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME IN ('chapters', 'chapter_content', 'chapter_resources');",
    ]
    for table, (condition, fields) in tables.items():
        columns = ", ".join(f"'{field}', {field}" for field in fields.split())
        statements.append(f"SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT({columns})), JSON_ARRAY()) FROM {table} WHERE {condition};")
    lines = query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY;\n" + "\n".join(statements) + "\nCOMMIT;")
    rows = lines.splitlines()
    if len(rows) != len(statements):
        raise RuntimeError("Unexpected number of backup results")
    return dict(zip(("target", "engines", *tables), map(json.loads, rows), strict=True))


def verify(data, title, lessons, resources):
    chapter, = data["chapters"]
    if chapter["chapter_title"] != title:
        raise RuntimeError("Existing chapter title conflicts with the approved import")
    actual_lessons = {tuple(row[key] for key in ("language_code", "title", "content", "pdf_url")) for row in data["chapter_content"]}
    actual_resources = {tuple(row[key] for key in ("resource_type", "resource_number", "title", "description", "file_url")) for row in data["chapter_resources"]}
    if (len(data["chapter_content"]) != len(lessons) or actual_lessons != set(lessons)
        or len(data["chapter_resources"]) != len(resources) or actual_resources != set(resources)):
        raise RuntimeError("Existing lesson or resource rows conflict with the approved import")
    return chapter["id"]


def save_backup(data, stem):
    directory = Path(os.environ.get("EMA_IMPORT_BACKUP_DIR",
                                    Path.home() / ".config/education-made-assessable/backups"))
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory,
                                     prefix=f"{stem}-before-", suffix=".json", delete=False) as backup:
        json.dump(data, backup, ensure_ascii=False, indent=2)
    path = Path(backup.name)
    saved = path.read_bytes()
    if json.loads(saved) != data:
        raise RuntimeError("Backup read-back differs from the database snapshot")
    print(f"Backup: {path} (SHA-256 {hashlib.sha256(saved).hexdigest()})", flush=True)


def import_chapter(chapter_number, title, stem, lessons, resources, *, preflight=False):
    chapter_number = int(chapter_number)
    data = snapshot(chapter_number)
    save_backup(data, stem)
    endpoint = os.environ.get("EMA_IMPORT_HOST") or os.environ.get("EMA_IMPORT_SOCKET") or "/tmp/mysql.sock"
    target = data["target"]
    print(f"Target: {target['database']} at {endpoint} (server {target['serverUuid']})")
    if data["chapters"]:
        print(f"Previously imported chapter {verify(data, title, lessons, resources)}. No writes performed.")
        return
    if len(data["grade_subjects"]) != 1:
        raise RuntimeError("Expected exactly one Grade 1 Mathematics mapping")
    mapping, = data["grade_subjects"]
    grade_id = int(mapping["grade_id"])
    subject_id = int(mapping["subject_id"])
    tables = {"chapters", "chapter_content", "chapter_resources"}
    if data["engines"] != dict.fromkeys(tables, "InnoDB"):
        raise RuntimeError("The three import tables must be visible and use InnoDB for transactional inserts")
    print(f"Plan: insert chapter {chapter_number} ({title}) for grade {grade_id}, subject {subject_id}, "
          f"with {len(lessons)} lessons and {len(resources)} resource records.")
    if preflight:
        print("Preflight only. No database writes performed.")
        return

    def values(rows):
        return ",\n".join("(@chapter_id, " + ", ".join(
            "NULL" if v is None else str(v) if isinstance(v, int) else literal(v)
            for v in row
        ) + ")" for row in rows)

    query(f"""START TRANSACTION;
INSERT INTO chapters (grade_id, subject_id, chapter_number, chapter_title)
VALUES ({grade_id}, {subject_id}, {chapter_number}, {literal(title)});
SET @chapter_id = LAST_INSERT_ID();
INSERT INTO chapter_content (chapter_id, language_code, title, content, pdf_url)
VALUES {values(lessons)};
INSERT INTO chapter_resources (chapter_id, resource_type, resource_number, title, description, file_url)
VALUES {values(resources)};
COMMIT;""")
    print(f"Imported chapter {verify(snapshot(chapter_number), title, lessons, resources)} with {len(lessons)} lessons and {len(resources)} resource records.")
