"""Plan or register Grade 1 English packs using the existing EMA_IMPORT_* configuration."""

import argparse

from chapter_import import import_chapter
from english_pack import load, stem, student_rows

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chapters", nargs="+", type=int, choices=range(1, 13))
    parser.add_argument("--preflight", action="store_true")
    args = parser.parse_args()
    for pack in map(load, args.chapters):
        number = pack["number"]
        import_chapter(number, pack["title"], stem(number), *student_rows(pack),
                       preflight=args.preflight, subject="English")
