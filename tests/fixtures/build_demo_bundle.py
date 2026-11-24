#!/usr/bin/env python3
"""Build an isolated synthetic bundle for development and browser tests."""

import argparse
import json
from pathlib import Path


def text(en, ps="د ازموینې بېلګه"):
    return {"en": en, "ps": ps}


def write_demo_pdf(path):
    stream = b"BT /F1 16 Tf 48 730 Td (Synthetic relocation test worksheet) Tj ET\n"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"endstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode() + body + b"\nendobj\n")
    start = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode())
    path.write_bytes(pdf)


def assessments():
    return [{
        "slot": slot,
        "state": "published",
        "title": text(f"Test {slot}"),
        "instructions": text("Synthetic demonstration. Choose A to record an answer."),
        "questions": [{
            "id": "observation",
            "type": "multiple_choice",
            "prompt": text("Choose the observation"),
            "marks": 1,
            "options": [{"id": "option-a", "label": text("A")}, {"id": "option-b", "label": text("B")}],
            "answer": {"option": "option-a"},
        }],
    } for slot in range(1, 4)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    root = args.destination
    root.mkdir(parents=True, exist_ok=False)
    (root / "resources").mkdir()
    write_demo_pdf(root / "resources/demo-worksheet.pdf")

    def resource(kind, lang, number=None):
        label = f"Worksheet {number}" if number else "Teaching notes"
        return {
            "id": f"{kind}-{lang}-{number or 1}", "kind": kind, "label": text(label),
            "language": lang, "path": "resources/demo-worksheet.pdf",
        }

    units = [{
        "grade": 6,
        "subject": "computer-science",
        "slug": f"demo-{position}",
        "position": position,
        "state": "published",
        "label": text(f"Demonstration unit {position}"),
        "description": text("Synthetic content for platform testing only."),
        "objectives": [{"label": text("Practise the unit navigation"), "reference": "Synthetic fixture, no curriculum claim"}],
        "lessons": [{"label": text("Synthetic lesson"), "body": text("This demonstration lesson verifies the platform workflow.")}],
        "resources": [resource("notes", lang) for lang in ("en", "ps")] + [
            resource("homework", lang, n) for lang in ("en", "ps") for n in range(1, 8)
        ],
        "assessments": assessments(),
    } for position in (1, 2)]
    (root / "import.json").write_text(json.dumps({"units": units}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
