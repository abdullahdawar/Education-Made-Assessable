# Grade 1 migration for Version 2

The migration utility reads the existing curriculum sources and prepares a
private bundle for the Version 2 content importer. Run it from the repository
root with Python 3.10 or later and the pinned PDF dependency.

~~~bash
python3 -m venv .venv
.venv/bin/python -m pip install -r curriculum/tools/requirements-v2-migration.txt
.venv/bin/python curriculum/tools/migrate-grade-1-v2.py
.venv/bin/python -m unittest discover -s curriculum/tools -p test_v2_migration.py
~~~

Add --verify-render to check pixel equality for all retained homework pages
using Poppler's pdftoppm. The script writes to a new folder at
output/local/v2-grade-1. Use --name with a new lowercase folder name for a
repeat run. The utility leaves original packets and any previous output intact.

| Output | Purpose |
| --- | --- |
| import.json | Private bundle containing localized lessons, objectives, activity records, resources, and review drafts |
| resources/ | Teaching notes, individual worksheets, and the original Maths and Science illustrations |
| migration-verification.json | Source packet and notes checksums, source-to-homework mapping, and render verification flag |

Point the Version 2 content importer at the bundle and use the folder
containing it as the asset root. Keep the whole directory outside web static
roots, frontend bundles, and Git. Only the application's authorized resource
endpoint should serve the individual student PDFs. The combined originals
under output/pdf remain migration sources. They contain test prompts and must
stay outside all student-facing file routes.

## Migrated coverage

- Mathematics includes 13 units. English includes 12. Both retain the existing
  content sequence, objectives, practice, and English/Pashto presentations.
  English stimuli remain in English alongside the original Pashto support.
- Science includes the unfinished first unit as a draft, with its illustration,
  investigation and safety instructions, activity rounds, and assessment
  prompts. The Science source has no completed notes or homework PDFs.
- The 25 Mathematics and English units have their existing 50 localized
  teaching-note PDFs and seven individual homework PDFs per presentation,
  totaling 350 worksheets. Each worksheet page retains its original drawings,
  writing spaces, fonts, language metadata, and page-local accessibility tags.
- Authored assessment prompts are retained in three private draft slots per
  unit. Some require a diagram, oral response, adult facilitation, or drawing.
  Confirm the digital response mode, assets, the scoring allocation, and any
  required private marking rubric before publication. A one-mark value on a
  draft with no prior allocation is provisional. The Counting draft preserves
  its existing three marks. Test 2 is represented as three objective numeric
  questions, with values taken from the original dot counts and empty group.
- The migration does not generate answer keys, approval claims, or additional
  educational videos. Existing Pashto, educator, and accessibility review
  findings continue to apply.

## Verification

The extractor verifies the worksheet/test heading boundary for every original
packet in both presentations. It uses the first seven pages only and builds
each worksheet with a fresh catalog. The selected tag subtree and parent
mapping point to the selected worksheet page. It verifies the saved content
stream, page dimensions, text, and language against the original. Teaching
notes are copied byte-for-byte.
