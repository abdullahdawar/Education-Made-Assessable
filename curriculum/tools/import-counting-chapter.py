"""Back up and import the approved counting chapter using an INSERT-only writer."""

from pathlib import Path
import re

from chapter_import import import_chapter

SOURCE = Path(__file__).resolve().parents[1] / "grade-1-mathematics-counting.md"
TITLE = "Counting collections from 0 to 20"
STEM = "grade-1-counting"


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


if __name__ == "__main__":
    import_chapter(1, TITLE, STEM, *approved_rows())
