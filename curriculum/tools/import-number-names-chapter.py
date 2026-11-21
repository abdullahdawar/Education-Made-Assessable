"""Import Chapter 2 student materials into the existing curriculum tables."""

from chapter_import import import_chapter
from number_names import SOURCE, STEM, student_rows

if __name__ == "__main__":
    import_chapter(2, SOURCE["title"]["en"], STEM, *student_rows())
