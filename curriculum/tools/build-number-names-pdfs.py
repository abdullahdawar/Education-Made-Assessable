"""Print the Chapter 2 student notes and activities with Chromium."""

from html import escape
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from number_names import ROOT, SOURCE, STEM, numeral

TOOLS = Path(__file__).resolve().parent
STYLE = (ROOT / "frontend/src/design.css").read_text() + (TOOLS / "counting-print.css").read_text() + """
html[lang=en] body { font-family: Arial, sans-serif; }
h1 { font-size: 29pt; }
.name-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin: 4mm 0; }
.name-grid div { padding: 1.5mm 3mm; background: var(--mint); border-radius: 2mm; }
.name-grid bdi { font-weight: bold; margin-inline-end: 2mm; }
.figure { display: grid; gap: 1mm; padding: 2mm; align-content: start; width: max-content; }
.frame { grid-template-columns: repeat(5, 8mm); }
.dice { grid-template-columns: repeat(3, 8mm); }
.scatter { grid-template-columns: repeat(5, 8mm); }
.figure span { height: 7mm; display: grid; place-items: center; }
.frame span { border: 0.7pt solid #343088; border-radius: 1mm; }
.figure .filled::before { content: ''; display: block; width: 4mm; height: 4mm; background: #343088; border-radius: 50%; }
.scatter span:nth-child(3n) { transform: translate(1mm, -0.7mm); }
.scatter span:nth-child(3n+1) { transform: translate(-1mm, 0.7mm); }
.figures { display: flex; flex-wrap: wrap; gap: 5mm; margin: 4mm 0; }
figure { margin: 0; break-inside: avoid; border: 0.7pt solid var(--line); border-radius: 3mm; padding: 3mm; }
figcaption { font-size: 11pt; }
.name-exercise { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 12pt; }
.name-exercise :is(th, td) { text-align: start; border: 0.6pt solid var(--line); padding: 1mm 3mm; height: 8mm; }
.name-exercise th { background: var(--sky); }
.student { margin: 3mm 0; }
.answer { min-height: 54mm; margin: 2mm 0 0; background: repeating-linear-gradient(white 0 9mm, #bac2db 9mm 9.2mm); }
.test .answer { min-height: 58mm; }
"""


def tr(language, en, ps):
    return ps if language == "ps" else en


def figure(language, kind, amount):
    labels = {
        "dice": ("Die pattern", "د مکعب بڼه"),
        "frame": ("Ten-frame", "لس‌خانه‌ییز چوکاټ"),
        "scatter": ("Scattered dots", "خواره ټکي"),
    }
    label = tr(language, *labels[kind])
    dot = tr(language, "Dot", "ټکی")
    empty = tr(language, "Empty space", "تش ځای")
    face = {3: (0, 4, 8), 5: (0, 2, 4, 6, 8), 6: (0, 2, 3, 5, 6, 8)}
    filled = face[amount] if kind == "dice" else range(amount)
    size = {"dice": 9, "frame": 10, "scatter": amount}[kind]
    cells = "".join(
        f'<span role="img" class="filled" aria-label="{dot}"></span>' if index in filled
        else f'<span role="img" aria-label="{empty}"></span>'
        for index in range(size)
    )
    return f'<figure><figcaption>{label}</figcaption><div class="figure {kind}">{cells}</div></figure>'


def illustrations(language, patterns):
    return '<div class="figures">' + "".join(figure(language, kind, count) for kind, count in patterns) + '</div>'


def page(language, heading, body, number, theme=""):
    title = escape(SOURCE["title"][language])
    context = tr(language, "Grade 1 · Mathematics · Chapter 2", "لومړی ټولګی · ریاضي · دویم څپرکی")
    return (f'<main class="page {theme}"><header>{context}</header>'
            f'<h1>{escape(heading)}</h1>{body}'
            f'<footer><span>{title}</span><bdi>{numeral(number, language)}</bdi></footer></main>')


def notes_pages(language):
    patterns = {"quick": [("dice", 5), ("frame", 8)], "estimate": [("scatter", 13)]}
    pages = []
    for index, lesson in enumerate(SOURCE["lessons"], 1):
        content = f'<div class="box"><p>{escape(lesson["model"][language])}</p></div>'
        if lesson["id"] == "names":
            content += '<div class="name-grid">' + "".join(
                f'<div><bdi>{numeral(i, language)}</bdi>{escape(name)}</div>'
                for i, name in enumerate(SOURCE["names"][language])
            ) + '</div>'
        else:
            content += illustrations(language, patterns[lesson["id"]])
        check = tr(language, "Try it", "تمرین")
        content += f'<div class="box sun"><h2>{check}</h2><p>{escape(lesson["check"][language])}</p></div>'
        pages.append(page(language, lesson["title"][language], content, index))
    return pages


def name_exercises(language, numbers, offset):
    prompt = tr(language, "Read this", "دا ولولئ")
    numeral_label = tr(language, "Write the numeral", "شمېره ولیکئ")
    name_label = tr(language, "Write the name", "نوم ولیکئ")
    rows = []
    for index, number in enumerate(numbers, offset):
        given = numeral(number, language) if index % 2 == 0 else SOURCE["names"][language][number]
        rows.append(f'<tr><td>{escape(given)}</td><td></td><td></td></tr>')
    return (f'<table class="name-exercise"><thead><tr><th scope="col">{prompt}</th>'
            f'<th scope="col">{numeral_label}</th><th scope="col">{name_label}</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>')


def practice_pages(language):
    pages = []
    for index, exercise in enumerate(SOURCE["practice"], 1):
        is_test = index > 7
        label = tr(language, "Chapter test", "د څپرکي ازموینه") if is_test else tr(language, "Worksheet", "تمرینپاڼه")
        heading = f"{label} {numeral(index - 7 if is_test else index, language)}"
        name = tr(language, "Name", "نوم")
        date = tr(language, "Date", "نېټه")
        body = f'<h2>{escape(exercise["stage"][language])}</h2>'
        body += f'<div class="student"><span>{name} ______________</span><span>{date} __________</span></div>'
        for task in exercise["tasks"]:
            body += f'<p>{escape(task[language])}</p>'
        if "names" in exercise:
            body += name_exercises(language, exercise["names"], index)
        if "pictures" in exercise:
            body += illustrations(language, exercise["pictures"])
        work = tr(language, "Show your work", "خپل کار وښيئ")
        body += f'<h2>{work}</h2><div class="answer"></div>'
        pages.append(page(language, heading, body, index, "test" if is_test else "worksheet"))
    return pages


def main():
    chrome = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    output = ROOT / "output/pdf"
    with TemporaryDirectory(prefix="ema-number-names-") as directory:
        temp = Path(directory)
        for language in ("en", "ps"):
            for kind, pages in [("notes", notes_pages(language)), ("worksheets-and-tests", practice_pages(language))]:
                stem = f"{STEM}-{language}-{kind}"
                direction = tr(language, "ltr", "rtl")
                html = temp / f"{stem}.html"
                html.write_text(f'<!doctype html><html lang="{language}" dir="{direction}"><head>'
                                f'<meta charset="utf-8"><title>{stem}</title><style>{STYLE}</style></head>'
                                f'<body>{"".join(pages)}</body></html>')
                subprocess.run([chrome, "--headless", "--no-pdf-header-footer",
                                f"--user-data-dir={temp / 'chrome'}",
                                f"--print-to-pdf={output / (stem + '.pdf')}", html.as_uri()],
                               check=True, capture_output=True, timeout=40)


if __name__ == "__main__":
    main()
