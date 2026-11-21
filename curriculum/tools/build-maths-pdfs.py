"""Render bilingual student notes and practice from validated chapter packs."""

import argparse
from html import escape
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from maths_pack import LANGUAGES, ROOT, load, stem
from number_names import numeral

STYLE = (ROOT / "frontend/src/design.css").read_text() + (Path(__file__).parent / "counting-print.css").read_text() + """
html[lang=en] body { font-family: Arial, sans-serif; }
h1 { font-size: 28pt; } h2 { color: var(--indigo); }
figure { margin: 7mm 0; }
.diagram { background: var(--mint); border-radius: 4mm; padding: 5mm; white-space: pre-line; font-size: 16pt; }
figcaption { margin-top: 3mm; font-size: 13pt; }
.practice-box { white-space: pre-line; }
.response { min-height: 110mm; margin-top: 5mm; }
.response div { height: 12mm; border-bottom: 1px solid #b9c1d6; }
"""


def pages(pack, lang):
    title = escape(pack["title"][lang])
    ps = lang == "ps"
    grade = "لومړی ټولګی · ریاضي" if ps else "Grade 1 · Mathematics"
    check = "تمرین" if ps else "Try it"
    name = "نوم" if ps else "Name"
    work = "خپل کار وښيئ" if ps else "Show your work"

    def page(heading, body, index):
        return (f'<main class="page"><header>{grade}</header><h1>{escape(heading)}</h1>{body}'
                f'<footer><span>{title}</span><bdi>{numeral(index, lang)}</bdi></footer></main>')

    notes, practice = [], []
    for index, lesson in enumerate(pack["lessons"], 1):
        text = {key: escape(value[lang]) for key, value in lesson.items() if key != "code"}
        body = (f'<p>{text["explain"]}</p><figure><div class="diagram">{text["diagram"]}</div>'
                f'<figcaption>{text["example"]}</figcaption></figure>'
                f'<section class="box sun"><h2>{check}</h2><p>{text["check"]}</p></section>')
        notes.append(page(lesson["title"][lang], body, index))
    for index, task in enumerate(pack["practice"], 1):
        heading = ("تمرینپاڼه" if ps else "Worksheet") if index <= 7 else ("ازموینه" if ps else "Test")
        heading += " " + numeral(index if index <= 7 else index - 7, lang)
        lines = '<div></div>' * 8
        body = (f'<p>{name} _____________________</p><section class="box practice-box">'
                f'<p>{escape(task["task"][lang])}</p></section>'
                f'<h2>{work}</h2><div class="response" aria-hidden="true">{lines}</div>')
        practice.append(page(heading, body, index))
    return {"notes": notes, "worksheets-and-tests": practice}


def build(numbers):
    chrome = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    output = ROOT / "output/pdf"
    with TemporaryDirectory(prefix="ema-maths-pdf-") as directory:
        temp = Path(directory)
        for number in numbers:
            pack = load(number)
            for lang in LANGUAGES:
                direction = "rtl" if lang == "ps" else "ltr"
                for kind, packet in pages(pack, lang).items():
                    name = f"{stem(number)}-{lang}-{kind}"
                    source = temp / f"{name}.html"
                    source.write_text(f'<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8">'
                                      f'<title>{escape(pack["title"][lang])}</title><style>{STYLE}</style></head>'
                                      f'<body>{"".join(packet)}</body></html>', encoding="utf-8")
                    subprocess.run([chrome, "--headless", "--no-pdf-header-footer",
                                    f"--user-data-dir={temp / 'chrome'}",
                                    f"--print-to-pdf={output / (name + '.pdf')}", source.as_uri()],
                                   check=True, capture_output=True, timeout=40)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chapters", nargs="+", type=int, choices=range(3, 14))
    build(parser.parse_args().chapters)
