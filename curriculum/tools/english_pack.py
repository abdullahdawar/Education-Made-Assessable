"""Validate Stage 1 English student packs and assemble chapter import rows."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "curriculum/grade-1-english"
LANGUAGES = ("en", "ps")
OBJECTIVES = json.loads((SOURCE / "objectives.json").read_text())


def stem(number):
    return f"grade-1-english-{number:02}"


def load(number):
    pack = json.loads((SOURCE / f"{number}.json").read_text())
    expected = {r["code"] for r in OBJECTIVES if r["chapter"] == number}
    if pack["number"] != number or set(pack["codes"]) != expected:
        raise ValueError(f"Wrong objective mapping for chapter {number}")
    if len(pack["tasks"]) != 10 or len(set(pack["tasks"])) != 10 or len(pack["rounds"]) < 7:
        raise ValueError(f"Incomplete student inventory in chapter {number}")
    if len({step["prompt"] for step in pack["rounds"]}) != len(pack["rounds"]):
        raise ValueError(f"Repeated practice prompt in chapter {number}")
    adult_tasks = pack["adultTasks"]
    if len(set(adult_tasks)) != len(adult_tasks) or any(i not in range(1, 11) for i in adult_tasks):
        raise ValueError(f"Invalid adult task index in chapter {number}")
    for step in pack["rounds"]:
        if (not step["answer"] or len(set(step["choices"])) != len(step["choices"])
                or not set(step["answer"]) <= set(step["choices"])):
            raise ValueError(f"Invalid practice round in chapter {number}")
    return pack


def student_rows(pack):
    lessons, resources = [], []
    prefix = stem(pack["number"])
    for language in LANGUAGES:
        title = pack["title"] if language == "en" else pack["titlePs"]
        content = "\n\n".join([pack["intro"] if language == "en" else pack["support"],
                              pack["text"], pack["model"], pack["adult"] if language == "en" else pack["adultPs"], pack["activity"]])
        lessons.append((language, title, content, f"/learning/{prefix}-{language}-notes.pdf"))
        for page in range(1, 11):
            kind, index = ("worksheet", page) if page < 8 else ("test", page - 7)
            resources.append((kind, index, f"{kind.title()} {index} ({language})", language,
                              f"/learning/{prefix}-{language}-worksheets-and-tests.pdf#page={page}"))
    return lessons, resources
