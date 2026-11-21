# Grade 1 Mathematics quality audit

Milestone 9 reviews the [roadmap](grade-1-mathematics-curriculum-roadmap.md), [chapter blueprint](chapter-content-blueprint.md) and [implemented inventory](grade-1-mathematics-completion-report.md). The Stage 1 Cambridge curriculum identifies 36 subject objectives and eight cross-cutting Thinking and Working Mathematically characteristics. The project chapter sequence remains the same. [Cambridge 0096 framework v2.1](https://studylib.net/doc/28550206/0096-mathematics-curriculum-framework--1-)

## Curriculum and assessment audit

Each row distinguishes material in the package from evidence an educator must collect. For Chapters 3–13 the validator confirms every primary code occurs in the lessons, worksheets, tests and game data. This establishes structural coverage. The milestone also checked worked examples and assessment demand against the objective descriptions. None of these findings certify learner mastery or translation approval.

| Ch. | Assigned codes | Evidence and remaining depth |
| --- | --- | --- |
| 1 | 1Nc.01, 1Np.01 | Empty sets, one mark per item, and rearrangement without adding or removing objects are covered. Worksheets 6–7 and test 3 ask for explanation and checking. Observe a child touching or moving items once and giving the total before and after rearrangement. Chapter 1 material still includes print directions referring to a separate key, already tracked in [release readiness](grade-1-release-readiness.md). |
| 2 | 1Nc.02, 1Nc.03, 1Ni.01 | Familiar patterns through ten, estimate before counting up to 20, and numeral/name practice through 20 are present. Worksheets 1, 3 and 5 cover the full number range and Test 1 samples writing and asks for recital. Observe recognition without counting and listen to reading and recital. Game progress cannot distinguish those strategies. |
| 3 | 1Np.02, 1Np.03, 1Np.04 | Grouping, comparing from zero through twenty, and ordinals through tenth use sticks, trays and a marked front. Tests sample regrouping, comparisons and ordinal places. The added number-builder tasks include equal regrouping, descending order and identifying places before the sixth and tenth. |
| 4 | 1Nc.04, 1Nc.05, 1Nc.06 | Lessons and print activities address the required directions and step sizes, even/odd alternation, and object sequences. The expanded game adds an odd start for a jump of ten, counting back by ones and a four-object repeating unit. Ask the learner to describe the repeat in their own words. |
| 5 | 1Ni.02, 1Ni.03 | Joining and counting on are separate examples. Removing, counting back and finding difference are separately modelled and assessed. Expanded practice includes removing all items and comparing equal groups. An adult should observe the strategy used in a practical problem. |
| 6 | 1Ni.04, 1Ni.05, 1Ni.06 | Frames show complements of ten, paired collections show doubles, and estimates precede exact whole-number calculations. New rounds explicitly reach results of zero and twenty and double ten. Print test tasks ask for an estimate and a check. Observe the estimate before the child calculates. |
| 7 | 1Nf.01–1Nf.04 | Equal and unequal splits, one of two shares, half as an operation with whole-number results, and rejoining halves all have separate tasks. Added rounds include an unequal split and endpoint quantities. Check that drawings and hands-on folds preserve equal parts and reconstruct the same whole. |
| 8 | 1Nm.01 | Coins and notes are distinguished, including equal values in different forms and recognizing the two sides of one piece. Game labels and print tasks still need supervised use of real or approved classroom currency images to demonstrate recognition of actual money. The existing context assumes Pakistani rupees. [State Bank of Pakistan](https://www.sbp.org.pk/our-operations/rupay-ko-pehchano) |
| 9 | 1Gg.01, 1Gg.03, 1Gg.06, 1Gg.07 | Side and surface properties, 2D/3D distinctions and identical appearance under turning have distinct tests. The revision checks a cube’s face and edge counts and compares quarter and half turns of a non-square rectangle. Sorting explanations and physical turns supply stronger evidence than picking labels. Drawing space was added to relevant print pages. |
| 10 | 1Gp.01 | Position relative to another object and route directions are covered. New maze routes use two additional start/goal and obstacle configurations. The board remains spatially left to right in both languages. Test 3 asks for two routes and an explanation. Drawing tasks now have a blank area. |
| 11 | 1Gg.02, 1Gg.04, 1Gg.05, 1Gg.08 | Length, height and thickness comparisons, balance readings, capacity and tool selection appear in the package. The game now contrasts water currently in a container with capacity. Learners still need to handle numbered instruments for length, mass, capacity and temperature. The print/tool labels alone cannot verify that skill. |
| 12 | 1Gt.01–1Gt.03 | The worksheets and tests distinguish time units, calendar order, exact hours and half hours. The clock picture now uses legible vector hands instead of small emoji, and print clock tasks have drawing space. Verify local calendar terminology and watch a learner move both hands on a model. |
| 13 | 1Ss.01–1Ss.03 | Fixed questions, category counts, tables, pictograms, block graphs, Venn and Carroll diagrams and conclusions are all present. A shared vector figure shows the same four objects in two sorts. Added rounds cover one-to-one pictograms and tied categories. Give pupils objects or drawings to construct representations and explain a conclusion. |

Use the roadmap's eight reasoning characteristics in live explanations, investigations and improvements to a method. The games and PDFs furnish prompts for these practices. Observations and samples of work still provide the reasoning evidence.

## Fixes and maintenance notes

- Added 33 authored bilingual rounds. Chapters 3–13 now contain six or seven rounds each, 70 total. The new rounds extend quantities and contexts without adding a timer or changing the existing stars, retries, replay or selected-tile model. The same data controls both languages' choices and solution. This structure checks equivalence of values and ordering. Fluent review is still needed for wording.
- Added shared web/print vector figures for clocks and category sorting, with localized alternative text. Selected tasks in Chapters 9, 10, 12 and 13 now use a blank working area and three ruled lines. Each other practice page retains eight ruled lines. Only the four packets in each of those four chapters were regenerated. Chapter 1 and 2 files remain byte-identical to the base.
- The chapter journey still filters by grade and uses API ordering. A Chrome request trace on the chapter journey confirmed no chapter pack fetched before selection and only the Chapter 12 pack fetched when opening it. The game mounted on demand. Shape Sorter remains development-only. The reviewed-video list is empty. Application routes still filter student resources and bundle only the expected language/packet names.
- The validator now checks illustration filenames, localized alternative text, drawing/writing response mode and a minimum of six rounds. The test suite checks unique prompts and tiles, matching numeric tokens in bilingual tile labels and paired print prompts, test and worksheet objective coverage, numeric answers against independent calculations, legal maze routes and full session states. A structurally matched pair does not establish idiomatic or pedagogical equivalence.
- Import remains transactional and append-only per chapter. Changes to an already imported lesson are deliberately reported as a conflict. An installation that previously imported Chapters 12–13 needs a separately reviewed content update and backup, rather than a blind rerun. No schema or privilege changes were made.

## Verification

- Frontend tests (19), lint, production build, Go tests and Go vet passed.
- The disposable MySQL fixture rejected an existing lesson mismatch, allowed a read-only plan, rolled back a deliberately failing write, then imported the revised Chapters 12–13. All 11 chapter imports subsequently verified as no-ops. The Chapter 1 and 2 fixture row fingerprint was unchanged. No existing-installation database was used.
- Rendered all 52 student PDFs (334 pages). Rechecked changed packets for diagram legibility, writing/drawing space, RTL layout, page limits and page counts. The unchanged packets retain the page reviews in the [completion report](grade-1-mathematics-completion-report.md) and [Chapter 2 report](grade-1-maths-chapter-2-review.md). Actual PDF reader page jumps, audible order and printing remain unverified.

The browser checks used production assets and the existing Go routes, backed by disposable MySQL. Each listed new chapter completed every expanded round in both languages. Checks covered retries, undo, scoring, replay, focus on continuation, overflow, and the reduced-motion preference. The maze preserved the selected tile through a mid-round language switch. Figure load checks covered both locales. Chrome fetched all 44 Chapters 3–13 PDFs, matched their SHA-256 hashes to the files and checked the worksheet/test fragment URLs.

| Engine | Widths | Chapters and input |
| --- | --- | --- |
| Chrome 157 | 320, 375, 1440 px | Chapters 1–2 navigation and game smoke checks. Chapters 3–13 all rounds. Keyboard at 320 and 1440, touch emulation at 375. |
| Firefox 159 | 320, 375, 1440 px | Chapters 1–2 smoke checks. Chapters 3, 7, 10, 12 and 13 all rounds using keyboard. |
| WebKit 27.2 | 320, 375, 1440 px | Chapters 1–2 smoke checks. Chapters 3, 7, 10, 12 and 13 all rounds. Keyboard at 320 and 1440, touch emulation at 375. |

Chapters 4–6, 8–9 and 11 were not run in Firefox or WebKit. The legacy smoke checks opened both games, switched to Pashto and checked the layout. They did not replay every legacy round. The automated keyboard checks target controls directly and do not establish natural tab traversal or audible announcements.

## Release blockers and recommended improvements

- Educator approval is pending for scope and pacing, oral/physical assessment evidence and local money and calendar choices. The diagrams support instruction. Some objectives still require real objects, manipulatives or instruments to assess.
- Ask a fluent Standard Written Pashto reviewer to check all draft text, including new round prompts and hints, localized figure labels, mixed-direction numerals, technical terms and equivalents for physical activities.
- Run native Safari, physical phone and tablet, keyboard traversal and VoiceOver checks. In a real PDF reader verify page starts, meaningful reading order, clock hand and sorting descriptions, grayscale legibility and print output.
- Rollout requires an authorized installation import and separately verified backup. Deploy matching assets and verify both languages and the allowed worksheet/test routes before learner release.
- Historical counting keys remain available anonymously from historical raw URLs. The current student build excludes them. Follow the existing historical cleanup decision process with the owner. Do not treat a new PR as resolving public historical exposure.

## GitHub consolidation plan

On 21 November 2026, GitHub reported `main` at `e5af09187174810d3f313e09a3d611dffc9a8a85`. The Milestone 8 branch was 18 commits ahead and zero behind. Three open overlapping PRs target `main`. Their heads are ancestors of the quality branch. [PR #1 game experience polish](https://github.com/abdullahdawar/Education-Made-Assessable/pull/1) · [PR #2 educational video curation](https://github.com/abdullahdawar/Education-Made-Assessable/pull/2) · [PR #3 video validation](https://github.com/abdullahdawar/Education-Made-Assessable/pull/3)

1. Re-fetch `main` and compare the exact candidate commit and all three PR heads. Confirm the branch has no newly diverged work and inspect the cumulative diff, particularly API privileges, student PDF allowlisting and historical references.
2. With owner approval, review one cumulative candidate against `main`, cross-reference the earlier PRs and carry forward any unresolved comments. Avoid merging overlapping milestone PRs independently while the final cumulative diff is under review.
3. Clear curriculum, translation, accessibility, database and historical-exposure gates before owner-approved integration. Validate a private rollout with both languages and the student resource inventory. Keep the earlier branches and PR records until the owner decides how to handle them.
4. No merge, PR closure, published video, answer-key cleanup-plan edit or history rewrite was performed in this milestone.
