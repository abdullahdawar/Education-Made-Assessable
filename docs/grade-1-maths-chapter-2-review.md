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

## Integration and verification

- The chapter importer uses the existing Grade 1 Mathematics mapping and inserts chapter number 2, two lesson translations and 20 student resources in one transaction. It uses the same backup and conflict check as Chapter 1. In the disposable MySQL fixture, a second import verified the existing Chapter 2 rows with no writes. The Go API and Vite production preview served both chapters using the existing routes. No schema change is needed.
- To populate an existing installation, deploy the matching frontend build and run `python3 curriculum/tools/import-number-names-chapter.py` with the existing `EMA_IMPORT_*` writer setup documented in the [README](../README.md). Verify the subject chapter list, both content responses and seven worksheets plus three tests per language. The available application account on the existing database was read-only. No import was applied there.
- Poppler rendered all 26 Chapter 2 PDF pages for visual inspection. Automated checks verified A4 page counts, tagged structure, document language, embedded fonts and text within page bounds. Visual checks covered dot and frame quantities, RTL page arrangement, legibility and writing space. Text extraction emitted font-metadata warnings for some runs. The tag tree and visual direction do not establish assistive-technology reading order.
- The browser suite checked all 20 Chapter 2 practice fragments and confirmed that production responses for the four Chapter 2 PDFs matched their source bytes. It also checked Chapter 1 navigation, both languages, the first Counting Adventure round and its four unchanged PDF downloads.
- The video section uses the existing empty reviewed-video list. No video was activated.

### Browser and build results

All runs exercised the production frontend against the disposable database through the Go API. Each browser-width run covered both languages and every Number Explorer round, including invalid estimates, duplicate marks, repeated retries, focus moves, one star per correct round, completion, replay and language switching with a partially marked collection. There was no horizontal overflow in the tested views. Chrome initially fell back to Western digits for the Pashto locale tag. Chapter 2 now requests the extended Arabic numbering system explicitly and the repeat matrix passed.

| Engine | 320 px | 375 px | 1440 px |
| --- | --- | --- | --- |
| Chrome 157 | Keyboard pass | Touch-emulation pass | Keyboard pass |
| Firefox 159 | Keyboard pass | Keyboard pass | Keyboard pass |
| WebKit 27.2 | Keyboard pass | Touch-emulation pass | Keyboard pass |

All 10 frontend tests, frontend lint, the production build, Go tests and Go vet passed.

## Outstanding review

- **Educator:** Confirm pacing, the number writing load, and how to collect oral and practical evidence. Check that estimation prompts allow an estimate to equal the exact count. Approve the grading expectations for an explanation and how to adapt quick-look tasks for learners who use nonvisual representations.
- **Fluent Pashto reviewer:** Review spelling and regional choices for the number names, including eleven and twelve, and terms for numeral, exact count, estimate, die and ten-frame. Check instructions, answer expectations, mixed numbers and words, RTL grouping and speech. The Pashto draft has no fluent-speaker approval.
- **Accessibility:** Verify live announcements with VoiceOver, physical touch targets and zoom, and PDF reading order and dot-group descriptions in a screen reader. Test fragment scrolling, print output and font behavior in the intended PDF viewers. Visual quick looks and spatial estimates require an educator-approved equivalent when a learner cannot access the pattern visually.
