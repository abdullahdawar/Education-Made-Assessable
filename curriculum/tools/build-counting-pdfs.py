"""Render the counting review packet from its approved-for-review Markdown source."""

from html import escape
from pathlib import Path
import os
import re
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent
SOURCE = (ROOT / "curriculum/grade-1-mathematics-counting.md").read_text()
STYLE = (ROOT / "frontend/src/design.css").read_text() + (TOOLS / "counting-print.css").read_text()
OUTPUT = ROOT / "output/pdf"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
PASHTO_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def inline(text):
    return re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", escape(text.replace(chr(96), "")))


def table_rows(text):
    return [
        line.strip().strip("|").split(" | ")[1:]
        for line in text.splitlines()
        if re.match(r"^\| \d", line)
    ]


def dots(count):
    return '<div class="art" aria-hidden="true">' + '<i class="dot"></i>' * count + '</div>'


def packet(pashto):
    def label(english, translated):
        return translated if pashto else english

    def numeral(number):
        return str(number).translate(PASHTO_DIGITS) if pashto else str(number)

    def box(title, text, colour="", drawing=""):
        return f'<section class="box {colour}"><h2>{title}</h2>{drawing}<p>{inline(text)}</p></section>'

    def page(body, title, number, theme=""):
        return (f'<main class="page {theme}"><header><span>✦ {brand}</span><span>{title}</span></header>'
                f'{body}<footer><span>{footer}</span><span>{numeral(number)}</span></footer></main>')

    brand = label("Education Made Assessable", "Education Made Assessable")
    context = label("Grade 1 · Mathematics", "لومړی ټولګی · ریاضي")
    footer = label("Grade 1 · Chapter 1 · Review copy", "لومړی ټولګی · لومړی څپرکی · د کتنې نسخه")
    title = label("Counting collections from 0 to 20", "له ۰ څخه تر ۲۰ پورې د شیانو شمېرل")
    notes_label = label("Learning notes", "د لوست یادښتونه")
    sections = re.split(r"^## ", SOURCE, flags=re.M)
    lesson = sections[2 if pashto else 1].splitlines()[1:]
    body = [line.strip() for line in lesson if line.strip()]
    objective, materials, *steps, _ = body
    steps = [step.split(". ", 1)[1] for step in steps]
    assert len(steps) == 4
    pencils = '<div class="art" aria-hidden="true">' + '<i class="pencil"></i>' * 4 + '</div>'
    cards = '<div class="numbers">' + ''.join(f'<b>{numeral(i)}</b>' for i in range(21)) + '</div>'
    circle = '<div class="circle" aria-hidden="true">' + ''.join(f'<i class="dot" style="--i:{i}"></i>' for i in range(6)) + '</div>'
    comparison = (f'<div class="patterns"><div>{dots(6)}<b>{numeral(6)}</b></div>'
                  f'<strong>=</strong><div>{circle}<b>{numeral(6)}</b></div></div>')
    notes = [
        page(f'<div class="cover-card"><p>{context}</p><h1>{title}</h1>{pencils}'
             f'<h2>{label("Learning goals", "د زده کړې موخې")}</h2><p>{inline(objective)}</p></div>{cards}', notes_label, 1, "cover"),
        page(f'<h1>{label("Count each object once", "هر شی یو ځل وشمېرئ")}</h1><p>{inline(materials)}</p>'
             + box(label("Zero means none", "صفر د هېڅ شمېر دی"), steps[0], "sun", '<div class="art"><div class="empty"></div></div>')
             + box(label("Touch and count", "ګوته ونیسئ او وشمېرئ"), steps[1], "mint", dots(4))
             + box(label("Count a larger group", "لویه ډله وشمېرئ"), steps[2], drawing=dots(10) + dots(3)), notes_label, 2),
        page(f'<h1>{label("Move them and count again", "ځای یې بدل کړئ او بیا یې وشمېرئ")}</h1>'
             + box(label("Same counters, same total", "هماغه دانې او هماغه شمېر"), steps[3], "peach", comparison)
             + box(label("Try it", "تمرین"), label("Draw a group of eight dots. Count. Move them one at a time into two rows. Count again. What stays the same?", "اته ټکي رسم کړئ او ویې شمېرئ. هر ټکی په وار سره په دوو لیکو کې ځای پر ځای کړئ. بیا یې وشمېرئ. څه هماغسې پاتې شول؟"), "sun")
             + box(label("Remember", "په یاد یې وساتئ"), label("An empty group has zero objects. Touch each object once. The last number tells the total. Moving the same objects keeps the total the same.", "په تشه ډله کې صفر شیان وي. هر شي ته یو ځل ګوته ونیسئ. وروستۍ شمېره ټول شمېر ښيي. د هماغو شیانو په خوځولو سره ټول شمېر نه بدلېږي."), "mint"), notes_label, 3),
    ]

    worksheets = table_rows(sections[3])
    tests = table_rows(sections[4])
    answers = table_rows(sections[5])
    assert (len(worksheets), len(tests), len(answers)) == (7, 3, 10)
    language = int(pashto)
    practice = []
    groups = [
        (worksheets, label("Worksheet", "تمرینپاڼه"), label("Say or write your answers before looking at the key.", "ځوابونه لومړی ووایئ یا یې ولیکئ، بیا ځوابپاڼه وګورئ.")),
        (tests, label("Chapter test", "د څپرکي ازموینه"), label("Three marks. Work on your own before looking at the key.", "درې نمرې. لومړی په خپله پوښتنې حل کړئ، بیا ځوابپاڼه وګورئ.")),
    ]
    keys = []
    offset = 0
    for items, heading, instructions in groups:
        is_test = items is tests
        for number, row in enumerate(items, 1):
            title_line = f"{heading} {numeral(number)}"
            stage = (label("Core skills", "بنسټیز مهارتونه"), label("Application", "کارونه"), label("Explanation", "تشریح"))[number - 1] if is_test else (
                label("Guided practice", "لارښوول شوی تمرین") if number < 3 else
                label("Independent practice", "خپلواک تمرین") if number < 6 else label("Use what you learned", "زده کړي شیان وکاروئ"))
            practice.append(page(
                f'<h1>{title_line}</h1><h2>{stage}</h2><p>{instructions}</p>'
                f'<div class="student"><span>{label("Name", "نوم")} ____________________</span><span>{label("Date", "نېټه")} __________</span></div>'
                + box(label("Your task", "ستاسو دنده"), row[language], "" if is_test else "mint")
                + f'<h2>{label("Show your work here", "خپل کار دلته وښيئ")}</h2><div class="answer"></div>',
                context, offset + number, "test" if is_test else "worksheet"))
        entries = ''.join(f'<div class="key"><strong>{numeral(i)}</strong><p>{inline(row[language])}</p></div>'
                          for i, row in enumerate(answers[offset:offset + len(items)], 1))
        marking = label("Give one mark per answer. Accept equivalent counting methods and explanations.", "د هر سم ځواب لپاره یوه نمره ورکړئ. د شمېرلو نورې سمې لارې او سم لاملونه ومنئ.") if is_test else ""
        keys.append(page(f'<h1>{label("Answer key", "ځوابپاڼه")}</h1><h2>{heading}</h2><p>{marking}</p>{entries}', context, len(keys) + 1))
        offset += len(items)
    return {"notes": notes, "worksheets-and-tests": practice, "answer-keys": keys}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="ema-print-") as directory:
        temp = Path(directory)
        for language in ("en", "ps"):
            direction = "rtl" if language == "ps" else "ltr"
            for kind, pages in packet(language == "ps").items():
                stem = f"grade-1-counting-{language}-{kind}"
                html = temp / f"{stem}.html"
                html.write_text(f'<!doctype html><html lang="{language}" dir="{direction}"><meta charset="utf-8">'
                                f'<title>{stem}</title><style>{STYLE}</style><body>{"".join(pages)}</body></html>')
                subprocess.run([CHROME, "--headless", "--no-pdf-header-footer",
                                f"--user-data-dir={temp / 'chrome'}",
                                f"--print-to-pdf={OUTPUT / (stem + '.pdf')}", html.as_uri()],
                               check=True, capture_output=True, timeout=40)


if __name__ == "__main__":
    main()
