"""Load and validate the Grade 1 Mathematics chapter packs."""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
PACKS = ROOT / "curriculum/grade-1-maths"
LANGUAGES = ("en", "ps")


def placements():
    roadmap = (ROOT / "docs/grade-1-mathematics-curriculum-roadmap.md").read_text()
    matrix = roadmap.split("## Objective inventory and coverage matrix")[1].split("## Chapter 1 audit")[0]
    chapters = {}
    for code, number in re.findall(r"^\| (1[A-Z][a-z]\.\d{2}) .*? \| (\d+) \|$", matrix, re.M):
        chapters.setdefault(int(number), set()).add(code)
    return chapters


def bilingual(text):
    if (not isinstance(text, dict) or set(text) != set(LANGUAGES)
            or not all(isinstance(value, str) and value.strip() for value in text.values())
            or not re.search(r"[\u0600-\u06ff]", text["ps"])):
        raise ValueError("Expected distinct English and Pashto text fields")


def load(number):
    pack = json.loads((PACKS / f"{number}.json").read_text())
    validate(number, pack)
    return pack


def validate(number, pack):
    if not 3 <= number <= 13 or pack["number"] != number:
        raise ValueError(f"Unexpected chapter number {number}")
    codes = placements()[number]
    bilingual(pack["title"])
    bilingual(pack["game"])
    lessons = pack["lessons"]
    if len(lessons) != len(codes) or {lesson["code"] for lesson in lessons} != codes:
        raise ValueError(f"Lesson objective mismatch in chapter {number}")
    for lesson in lessons:
        for key in ("title", "explain", "example", "diagram", "check"):
            bilingual(lesson[key])
    practice = pack["practice"]
    if len(practice) != 10 or len({row["task"]["en"] for row in practice}) != 10:
        raise ValueError(f"Expected seven distinct worksheets and three distinct tests in chapter {number}")
    for group in (practice[:7], practice[7:]):
        if {code for row in group for code in row["codes"]} != codes:
            raise ValueError(f"Incomplete worksheet or test coverage in chapter {number}")
    for row in practice:
        if set(row) != {"codes", "task"} or not row["codes"]:
            raise ValueError("Use only objective codes and student prompts in practice")
        bilingual(row["task"])
    rounds = pack["rounds"]
    if len(rounds) < 3 or not any(step["take"] > 1 for step in rounds):
        raise ValueError(f"Expected multi-step building practice in chapter {number}")
    if {step["code"] for step in rounds} != codes:
        raise ValueError(f"Incomplete game coverage in chapter {number}")
    for step in rounds:
        for key in ("prompt", "hint", "explain"):
            bilingual(step[key])
        for tile in step["tiles"]:
            bilingual(tile)
        if (step["take"] != len(step["solution"]) or step["take"] < 1
                or not all(type(i) is int and 0 <= i < len(step["tiles"]) for i in step["solution"])):
            raise ValueError(f"Invalid interaction in chapter {number}")


def stem(number):
    return f"grade-1-maths-{number:02}"


def student_rows(pack):
    lessons, resources = [], []
    prefix = stem(pack["number"])
    for lang in LANGUAGES:
        sections = ["\n".join(lesson[key][lang] for key in ("title", "explain", "diagram", "example", "check"))
                    for lesson in pack["lessons"]]
        lessons.append((lang, pack["title"][lang], "\n\n".join(sections), f"/learning/{prefix}-{lang}-notes.pdf"))
        for page in range(1, 11):
            kind, index = ("worksheet", page) if page <= 7 else ("test", page - 7)
            file = f"/learning/{prefix}-{lang}-worksheets-and-tests.pdf#page={page}"
            resources.append((kind, index, f"{kind.title()} {index} ({lang})", lang, file))
    return lessons, resources
