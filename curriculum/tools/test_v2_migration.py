"""Regression checks for the private Version 2 Grade 1 migration."""

import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader

from v2_homework import copy_notes, extract_homework, packet, rasterized_pages


TOOLS = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("grade_1_migration", TOOLS / "migrate-grade-1-v2.py")
migration = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(migration)


class ContentMigrationTest(unittest.TestCase):
    def test_counting_keeps_bilingual_lessons_and_three_private_tests(self):
        item = migration.counting_unit()
        self.assertEqual(item["position"], 1)
        self.assertEqual([objective["reference"] for objective in item["objectives"]], ["1Nc.01", "1Np.01"])
        self.assertIn("Start with an empty space", item["lessons"][0]["body"]["en"])
        self.assertIn("د هېڅ لپاره ۰ لیکو", item["lessons"][0]["body"]["ps"])
        self.assertEqual([test["slot"] for test in item["assessments"]], [1, 2, 3])
        for test in item["assessments"]:
            self.assertEqual(test["state"], "draft")
            self.assertEqual(sum(question["marks"] for question in test["questions"]), 3)
        for test in (item["assessments"][0], item["assessments"][2]):
            self.assertEqual(test["questions"][0]["answer"], {})
        numeric = item["assessments"][1]["questions"]
        self.assertTrue(all(question["type"] == "short_answer" for question in numeric))
        self.assertEqual([question["answer"]["number"] for question in numeric], [14, 20, 0])

    def test_maths_preserves_authored_rounds_and_no_public_assessor_material(self):
        source = migration.read_json(migration.CURRICULUM / "grade-1-maths/3.json")
        item = migration.maths_unit(source)
        self.assertEqual(item["lessons"][0]["body"]["ps"].split("\n\n")[1], source["lessons"][0]["diagram"]["ps"])
        actual = item["activities"][0]["rounds"][0]
        self.assertEqual([actual["choices"][index]["id"] for index in source["rounds"][0]["solution"]], actual["answer"])
        self.assertNotIn(source["practice"][-1]["task"]["en"], json.dumps(item["lessons"]))
        self.assertEqual(item["videos"], [])

    def test_science_keeps_verified_objectives_and_original_observation_directions(self):
        source = migration.read_json(migration.CURRICULUM / "grade-1-science/1.json")
        item = migration.science_unit(source)
        self.assertEqual(item["state"], "draft")
        self.assertEqual({objective["reference"] for objective in item["objectives"]}, {
            "1TWSc.01", "1Bp.01", "1Bp.02",
        })
        self.assertIn(source["investigation"]["safety"]["en"], item["lessons"][1]["body"]["en"])
        self.assertIn(source["investigation"]["alternative"]["ps"], item["lessons"][1]["body"]["ps"])


class HomeworkExtractionTest(unittest.TestCase):
    def test_known_packet_boundary_and_accessibility_tags(self):
        for language in migration.LANGUAGES:
            with self.subTest(language=language), tempfile.TemporaryDirectory() as directory:
                path = migration.source_pdf("grade-1-counting", language, "worksheets-and-tests")
                source = packet(path, language)
                output = Path(directory) / "worksheet-7.pdf"
                extract_homework(source, 7, language, "Worksheet 7", output)
                result = PdfReader(output)
                catalog = result.trailer["/Root"]
                self.assertEqual(len(result.pages), 1)
                self.assertEqual(result.pages[0].extract_text(), source.pages[6].extract_text())
                self.assertEqual(catalog["/Lang"], language)
                self.assertTrue(catalog["/MarkInfo"]["/Marked"])
                self.assertEqual(len(catalog["/StructTreeRoot"]["/K"]["/K"]), 1)
                self.assertEqual(catalog["/StructTreeRoot"]["/ParentTree"]["/Nums"][0], 0)
                self.assertEqual(catalog["/StructTreeRoot"]["/K"]["/K"][0].get_object().raw_get("/Pg"),
                                 result.pages[0].indirect_reference)
                self.assertFalse(result.attachments)
                if shutil.which("pdftoppm"):
                    self.assertEqual(rasterized_pages(path, 7, 7), rasterized_pages(output, 1, 1))
                with self.assertRaisesRegex(ValueError, "between 1 and 7"):
                    extract_homework(source, 8, language, "Test 1", Path(directory) / "wrong.pdf")

    def test_notes_are_unchanged_and_combined_input_is_language_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            notes = migration.source_pdf("grade-1-english-01", "en", "notes")
            output = Path(directory) / "notes.pdf"
            copy_notes(notes, output, "en")
            self.assertEqual(notes.read_bytes(), output.read_bytes())
            with self.assertRaises(FileExistsError):
                copy_notes(notes, output, "en")
            combined = migration.source_pdf("grade-1-english-01", "en", "worksheets-and-tests")
            with self.assertRaisesRegex(ValueError, "expected an unencrypted ps packet"):
                packet(combined, "ps")


if __name__ == "__main__":
    unittest.main()
