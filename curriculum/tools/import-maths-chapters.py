"""Preflight or register Grade 1 Mathematics chapter packs using EMA_IMPORT_*."""

import argparse

from chapter_import import import_chapter
from maths_pack import load, stem, student_rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chapters", nargs="+", type=int, choices=range(3, 14))
    parser.add_argument("--preflight", action="store_true", help="Create verified snapshots without database writes")
    args = parser.parse_args()
    packs = [load(number) for number in args.chapters]
    for pack in packs:
        number = pack["number"]
        import_chapter(number, pack["title"]["en"], stem(number), *student_rows(pack), preflight=args.preflight)
