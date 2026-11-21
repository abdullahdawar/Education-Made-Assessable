"""Print Stage 1 English student packets with optional Pashto directions."""

import argparse
from html import escape
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from english_pack import LANGUAGES, ROOT, load, stem

STYLE = (ROOT / "frontend/src/design.css").read_text() + (Path(__file__).parent / "counting-print.css").read_text() + """
h1 { font-size: 27pt; }
.target { font-family: Arial,sans-serif; white-space: pre-wrap; }
.work { margin-block: 5mm; }
.work div { height: 12mm; border-bottom: 1px solid #a8b1ca; }
.illustration { font-size: 28pt; }
"""


def pages(p, lang):
    ps = lang == "ps"
    title = p["titlePs"] if ps else p["title"]
    label = "لومړی ټولګی · انګلیسي" if ps else "Grade 1 · English"

    def block(text, css=""):
        return f'<p class="target {css}" lang="en" dir="ltr">{escape(text)}</p>'

    def page(name, body, index):
        return (f'<main class="page"><header>{label}</header><h1>{escape(name)}</h1>{body}'
                f'<footer><span>{escape(title)}</span><bdi>{index}</bdi></footer></main>')

    intro = p["support"] if ps else p["intro"]
    guide = p["adultPs"] if ps else p["adult"]
    audio = ("ثبت شوی غږ لا د کتنې لپاره پاتې دی." if ps else "Recorded audio is pending verification.") if p["audioPending"] else ""
    notes = [page(title, f'<p>{escape(intro)}</p><div class="box mint"><span class="illustration">{escape(p["icon"])}</span>'
                   + block(p["text"]) + block(p["model"]) + '</div>' + block(p["activity"])
                   + f'<div class="box sun"><p>{escape(guide)}</p><p>{audio}</p></div>', 1)]
    work = "ځواب په انګلیسي ولیکئ یا یې ووایئ." if ps else "Write or say your answer in English."
    practice = []
    for i, task in enumerate(p["tasks"], 1):
        name = (("تمرینپاڼه" if ps else "Worksheet") + f" {i}" if i < 8
                else ("ازموینه" if ps else "Test") + f" {i-7}")
        support = f'<p>{escape(intro)}</p>' if ps else ""
        stimulus = f'<div class="box"><span class="illustration">{escape(p["icon"])}</span>{block(p["text"])}</div>' if i < 8 else ""
        practice.append(page(name, support + f'<p>{work}</p>' + stimulus + block(task)
                             + '<div class="work" aria-hidden="true">' + '<div></div>' * 6 + '</div>', i))
    return {"notes": notes, "worksheets-and-tests": practice}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chapters", nargs="+", type=int, choices=range(1,13))
    chrome = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    with TemporaryDirectory(prefix="ema-english-print-") as directory:
        temp = Path(directory)
        for n in parser.parse_args().chapters:
            pack = load(n)
            for lang in LANGUAGES:
                for kind, packet in pages(pack, lang).items():
                    name = f"{stem(n)}-{lang}-{kind}"
                    source = temp / f"{name}.html"
                    direction = "rtl" if lang == "ps" else "ltr"
                    source.write_text(f'<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8">'
                                      f'<title>{escape(pack["title"])}</title><style>{STYLE}</style></head>'
                                      f'<body>{"".join(packet)}</body></html>', encoding="utf-8")
                    subprocess.run([chrome, "--headless", "--no-pdf-header-footer",
                                    f"--user-data-dir={temp / 'profile'}",
                                    f"--print-to-pdf={ROOT / 'output/pdf' / (name + '.pdf')}", source.as_uri()],
                                   check=True, capture_output=True, timeout=45)
