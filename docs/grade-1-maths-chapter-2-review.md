# Grade 1 Mathematics · Chapter 2 review

**Number Names, Quick Looks and Estimates** is implemented for review in English and draft Standard Written Pashto. The [chapter roadmap](grade-1-mathematics-curriculum-roadmap.md) sets the scope and the [chapter blueprint](chapter-content-blueprint.md) defines the package. The canonical [bilingual student source](../curriculum/grade-1-mathematics-number-names.json) supplies the lesson, both print packets and the API import.

## Curriculum coverage

Objective summaries follow the [Cambridge-authored 0096 framework v2.1, Stage 1, pp. 17–18](https://studylib.net/doc/28550206/0096-mathematics-curriculum-framework--1-).

| Code | Lesson coverage | Practice and assessment evidence |
| --- | --- | --- |
| **1Nc.02** | Recognise familiar quantities through 10 exactly without counting each item. Worked examples use a five-dot die face and a ten-frame with eight dots. The learner explains the groups they recognise. | Quick Looks presents amounts 1–10. Worksheets 2, 5 and 7 and all three tests sample familiar patterns. Ask the learner to explain the groups they saw. A correct selection alone does not establish subitising. |
| **1Nc.03** | Estimate collections of up to 20 objects or people and check by counting. The worked example records an estimate of 12 and an exact count of 13. The comprehension check uses pencils or people. | Estimate and Count has four rounds through 20. Worksheets 4, 6 and 7 and tests 2–3 separate the estimate from the count. Collect the estimate before counting. Judge the checking method and exact count separately from the estimate. |
| **1Ni.01** | Read and say the 0–20 chart, then write numeral and name pairs. An example models the pair for 14. A cover-and-recall check uses 0, 8 and 20. | Worksheets 1, 3 and 5 span the full range, with both written forms and oral reading. Test 1 asks learners to recite the sequence and samples numeral and name writing. Test 2 uses both forms to record an exact total. Match Names and Number Trail give extra recognition practice. An adult should listen to oral evidence. |

## Lesson and game inventory

1. **Say, read and write.** Red panda guidance, 21 numeral/name cards and a spoken and written check.
2. **Know a familiar pattern at a glance.** Two illustrated models and a ten-frame explanation prompt.
3. **Estimate, then count to check.** Scattered-dot illustration, worked estimate and count, and a real-world task.

**Number Explorer** uses the existing red panda and game shell, with four independent modes. It loads on demand. Each mode has a progress indicator, informative hints, retry and replay. There is no timer. Changing language preserves the active mode and round. Selecting a different mode starts its own session from round 1.

| Mode | Learner interaction |
| --- | --- |
| Match Names | Choose the written name for a shown numeral in five rounds spanning the endpoints 0 and 20. |
| Number Trail | Choose the missing numeral in four short sequences. This supports numeral recognition and sequence fluency. |
| Quick Looks | Recognise a die or frame amount in ten rounds, with a grouping hint after a retry. |
| Estimate and Count | Enter a whole-number estimate from 0 to 20, then mark each dot in the same collection once. Duplicate taps leave the count unchanged. Select an exact total only after marking the collection. The original estimate stays visible and earns no score. |

A star records a correct practice response. Teachers gather separate evidence of oral reading, handwriting, counting strategy and at-a-glance recognition.

## Student print inventory

| Page in practice packet | English and Pashto task |
| --- | --- |
| 1 | Guided numeral and name practice, 0–6. |
| 2 | Recognise die and ten-frame patterns, then show the groups. |
| 3 | Independent numeral and name practice, 7–13. |
| 4 | Estimate and check different layouts, including a collection of 20. |
| 5 | Mixed numeral and name practice, 14–20, plus a ten-frame. |
| 6 | Estimate real objects, count them, and write the total as a numeral and name. |
| 7 | Explain a pattern, record an estimate and count separately, and explain a possible difference. |
| 8 | Test 1 · core recognition, oral sequence, written forms and die pattern. |
| 9 | Test 2 · apply ten-frame recognition and estimate a pictured group of people. |
| 10 | Test 3 · explain the pattern and the estimate-check method. |

Each language has a three-page notes PDF and a ten-page practice PDF. The 20 localized practice URLs map worksheets to pages 1–7 and tests to pages 8–10. All scored print work has blank response space. The notes include worked teaching examples. Student packets, importer rows and chapter routes contain no separate solutions or teacher keys.

## Milestone 7C database preflight · 21 November 2026

| Check | Existing local installation |
| --- | --- |
| Target | MySQL 26.7.0, schema `education_made_assessable`, socket `/tmp/mysql.sock`, server UUID `9d0fbfa2-bc9b-11f1-86c0-8df319a3e79e`. The three target tables use InnoDB. |
| Go configuration | The API expects `DB_USER`, `DB_PASSWORD` and exactly one of `DB_SOCKET` or `DB_ADDR`. A temporary Go handler check used the local socket and real read-only app account. It confirmed the grade, subject, Chapter 1 content and practice routes. The browser QA preview used disposable MySQL. |
| Grade 1 Mathematics mapping | Grade ID 1, subject ID 1. The mapping exists once. |
| Chapter 1 | Chapter ID 1. One English translation, one Pashto translation, seven worksheets and three tests in each language through the API. |
| Chapter 2 | Absent. The approved-for-review branch contains the content and importer. Installation is pending. |
| Privileges | `ema_app@localhost` has SELECT on grades, subjects, grade_subjects, chapters and chapter_content. Its chapter_resources access is limited to the six student API columns. It has no INSERT grants. The importer stopped in its read-only snapshot with MySQL `ERROR 1143 (42000)`, SELECT denied for `chapter_resources.title`. |
| Backup | Default directory `~/.config/education-made-assessable/backups` exists with mode 0700. The local import snapshot and recoverable dump are pending approved access. The application account could confirm student-facing counts. |

### Intended import and authorization

The proposed transaction for the target above inserts **one Chapter 2 row**, titled **Number Names, Quick Looks and Estimates**, for grade 1 and subject 1. It links **two chapter_content rows** and **20 chapter_resources rows** to the new chapter ID. Each language gets one translation, seven worksheets and three tests. It leaves Chapter 1 alone and uses the existing schema.

Before running the transaction, obtain explicit owner authorization for this target and use an **existing authorized writer** configured through `EMA_IMPORT_USER`, `EMA_IMPORT_PASSWORD` and `EMA_IMPORT_SOCKET=/tmp/mysql.sock`. The established TCP option uses `EMA_IMPORT_HOST`, optional `EMA_IMPORT_PORT` and `EMA_IMPORT_TLS_CA` with identity verification. Keep credentials in the local secret configuration. The snapshot requires SELECT on the six curriculum tables, including the `chapter_resources` columns `id`, `chapter_id`, `resource_type`, `resource_number`, `title`, `description`, `file_url`, `external_url` and `created_at`. The transaction requires INSERT on `chapters`, `chapter_content` and `chapter_resources`. Use an authorized backup operator for a logical export if the writer lacks the necessary backup access. See the [existing writer setup](../README.md).

1. Take a consistent logical backup with an authorized account, save it off-repository with owner-only access, and verify a restore into an isolated database. Preserve a complete Chapter 1 baseline for post-import comparison. Review the scope with the backup operator.
2. With the configured writer, run `python3 curriculum/tools/import-number-names-chapter.py --preflight`. It reports the target and plan, reads back its owner-only JSON snapshot and prints its SHA-256. The scoped snapshot records the affected rows and target identity alongside any full backup.
3. After explicit authorization and verification of the target and backup, run the same command without `--preflight`. Confirm the new Chapter 2 row, the two translations, the 20 student links and unchanged Chapter 1. Repeat the command to verify the existing import produces no writes. Deploy the matching frontend.

No changes were made to the existing installation. No writer credentials or access-control changes were obtained.

### Disposable database and backup evidence

- A separate local MySQL instance used compatible tables and a fixtures-only socket. `--preflight` reported one chapter, two translations and 20 student resources and left the database unchanged. The verified scope snapshot was owner-only. SHA-256 `10b9a6bd2ec7a79022aeb5e3a876a920b20c395fe7212c58f50a61b0e973975e`.
- An owner-only logical dump of the disposable pre-import database was restored into a separate schema. All six tables matched and the restore produced a byte-identical re-dump using `--set-gtid-purged=OFF`. SHA-256 `5a4bc1db46e8563360f8ea89c85b0f9c5b39bec882bd5fdada19e934faaef24b`. The evidence lived outside the checkout under `/tmp/ema-chapter2-qa.F568lE/`.
- A deliberately failed resource insert rolled back the chapter and translations. The normal import inserted the expected counts. A rerun made no writes. Conflicting chapter titles and resource rows were rejected without row changes. Complete Chapter 1 fixture rows matched byte for byte before and after.
- The reusable importer now checks for InnoDB before inserting, reports the database identity, verifies backup read-back, and supports a read-only Chapter 2 plan. The Go application continues to use the existing API and never needs writer privileges.

## Educational and accessibility QA

| Area | 7C finding |
| --- | --- |
| 1Ni.01 | Reviewed all 21 English numeral/name pairs and matched the Pashto rows to the same values. Worksheets 1, 3 and 5 provide space for both written forms across the full range. Test 1 samples writing and asks for spoken recital. Oral accuracy still needs observation. |
| 1Nc.02 | The worked die and frame show 5 and 8 as described. Compared the practice figures with their declared amounts, including full frames of 10. The English and Pashto packets share diagram data, so their amounts match. Quick Looks accepts untimed responses and gives grouping hints. |
| 1Nc.03 | The worked example and worksheet/test prompts separate the initial estimate from the checked count. Collection amounts stay within 20. The game accepts estimates anywhere in 0–20 and neither gains nor loses stars on submitting one. Browser checks used estimates that differed from the exact count and confirmed scoring only after an exact choice. |
| Difficulty and space | The packets progress from guided to independent and explanation tasks. Each practice page has a writing or drawing area. Number-writing pages add a dedicated ruled table. The educator still needs to check handwriting space and workload with Grade 1 learners. |
| Bilingual equivalence | Shared figures, quantities and worksheet order preserve the mathematical inputs. A fluent reviewer still needs to confirm idiom, number names, technical terms and equivalent directions. |
| PDFs | All 26 pages rendered again and matched the visually inspected 7B rasters byte for byte. Checked counts, A4 size, document language, tagging, embedded fonts and text bounds. The browsers resolved all 20 Chapter 2 practice fragments and served byte-identical copies of the four PDFs. Chapter 1 links and PDFs still worked. Visual checks and tags leave actual PDF assistive-technology order and page jumps pending. |
| Student surface | Both games loaded through the existing navigation. The video list is empty. Chapter 2 API and downloads provide worksheets and tests without teacher answer material. |

### Browser and build results

All nine runs exercised the production frontend against disposable MySQL through the Go API. Each browser-width run covered both languages and every Number Explorer round, including invalid estimates, duplicate marks, repeated retries, focus moves, one star per correct round, completion, replay and language switching with a partially marked collection. The profiles requested reduced motion. Focus reached the new round heading, first counting control, exact-count prompt and next-round button at the expected points. The tested views had no horizontal overflow. Chrome initially fell back to Western digits for the Pashto locale tag. Chapter 2 now requests the extended Arabic numbering system explicitly and the repeat matrix passed.

| Engine | 320 px | 375 px | 1440 px |
| --- | --- | --- | --- |
| Chrome 157 | Keyboard pass | Touch-emulation pass | Keyboard pass |
| Firefox 159 | Keyboard pass | Keyboard pass | Keyboard pass |
| WebKit 27.2 | Keyboard pass | Touch-emulation pass | Keyboard pass |

All 10 frontend tests, frontend lint, the production build, Go tests and Go vet passed.

## Outstanding release blockers

- **Installation:** Obtain explicit authorization and use an existing authorized writer and verified recoverable backup for the target stated above.

- **Educator:** Confirm pacing, the number writing load, and how to collect oral and practical evidence. Check that estimation prompts allow an estimate to equal the exact count. Approve the grading expectations for an explanation and how to adapt quick-look tasks for learners who use nonvisual representations.
- **Fluent Pashto reviewer:** Review spelling and regional choices for the number names, including eleven and twelve, and terms for numeral, exact count, estimate, die and ten-frame. Check instructions, answer expectations, mixed numbers and words, RTL grouping and speech. The Pashto draft has no fluent-speaker approval.
- **Accessibility:** Manual VoiceOver and physical-device checks were not performed. Verify live announcements with VoiceOver, physical touch targets and zoom, and PDF reading order and dot-group descriptions in a screen reader. Test fragment scrolling, print output and font behavior in the intended PDF viewers. Visual quick looks and spatial estimates require an educator-approved equivalent when a learner cannot access the pattern visually.
