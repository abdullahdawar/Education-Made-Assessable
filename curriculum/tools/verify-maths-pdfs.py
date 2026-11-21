"""Check generated Grade 1 PDFs. Requires pypdf, pdfplumber and Poppler for raster output."""

import argparse
import logging
from pathlib import Path
import re
import subprocess

import pdfplumber
from pypdf import PdfReader

from maths_pack import LANGUAGES, ROOT, load, stem


def verify_packet(path, language, kind, expected):
    document = PdfReader(path)
    catalog = document.trailer["/Root"]
    if len(document.pages) != expected or catalog.get("/Lang") != language or not catalog.get("/StructTreeRoot"):
        raise ValueError(f"{path.name}: unexpected page count, language or PDF tagging")
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            label = f"{path.name} page {page.page_number}"
            if not (594 < page.width < 596 and 841 < page.height < 843 and len(page.chars) > 40):
                raise ValueError(f"{label}: expected a populated A4 page")
            if any(c["x0"] <= 18 or c["x1"] >= page.width - 18 or c["top"] <= 15
                   or c["bottom"] >= page.height - 15 for c in page.chars):
                raise ValueError(f"{label}: text outside the expected page bounds")
            if language == "ps" and not re.search(r"[\u0600-\u06ff]", text):
                raise ValueError(f"{label}: no extractable Pashto text")
            if "answer key" in text.casefold() or "ځوابپاڼه" in text:
                raise ValueError(f"{label}: unexpected answer-key reference")
            if kind == "worksheets-and-tests" and language == "en":
                index = page.page_number
                heading = f"Worksheet {index}" if index <= 7 else f"Test {index - 7}"
                if heading not in text:
                    raise ValueError(f"{label}: missing expected heading {heading}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render-dir", type=Path, help="Render every checked page to PNG with pdftoppm")
    options = parser.parse_args()
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    if options.render_dir:
        options.render_dir.mkdir(parents=True, exist_ok=True)
    count = pages = 0
    for number in range(3, 14):
        pack = load(number)
        for language in LANGUAGES:
            for kind, expected in [("notes", len(pack["lessons"])), ("worksheets-and-tests", 10)]:
                path = ROOT / "output/pdf" / f"{stem(number)}-{language}-{kind}.pdf"
                verify_packet(path, language, kind, expected)
                if options.render_dir:
                    subprocess.run(["pdftoppm", "-r", "76", "-png", str(path),
                                    str(options.render_dir / path.stem)], check=True)
                count += 1
                pages += expected
    print(f"{count} PDFs and {pages} pages verified")


if __name__ == "__main__":
    main()
