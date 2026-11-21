"""Read the canonical Chapter 2 student content."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STEM = "grade-1-number-names"
SOURCE = json.loads((ROOT / "curriculum/grade-1-mathematics-number-names.json").read_text())
PASHTO_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def numeral(number, language):
    text = str(number)
    return text.translate(PASHTO_DIGITS) if language == "ps" else text


def student_rows():
    lessons, resources = [], []
    for language in ("en", "ps"):
        sections = []
        for lesson in SOURCE["lessons"]:
            lines = [lesson[field][language] for field in ("title", "model", "check")]
            if lesson["id"] == "names":
                lines.insert(2, "\n".join(
                    f"{numeral(number, language)}: {name}"
                    for number, name in enumerate(SOURCE["names"][language])
                ))
            sections.append("\n".join(lines))
        lessons.append((language, SOURCE["title"][language], "\n\n".join(sections),
                        f"/learning/{STEM}-{language}-notes.pdf"))
        for page, activity in enumerate(SOURCE["practice"], 1):
            kind, number = ("worksheet", page) if page <= 7 else ("test", page - 7)
            url = f"/learning/{STEM}-{language}-worksheets-and-tests.pdf#page={page}"
            resources.append((kind, number, activity["stage"][language], language, url))
    return lessons, resources
