"""Import Chapter 2 student materials into the existing curriculum tables."""

import argparse

from chapter_import import import_chapter
from number_names import SOURCE, STEM, student_rows

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", action="store_true", help="Verify a backup and show the plan without inserting rows")
    args = parser.parse_args()
    import_chapter(2, SOURCE["title"]["en"], STEM, *student_rows(), preflight=args.preflight)
