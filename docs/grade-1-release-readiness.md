# Grade 1 release readiness

Milestone 5B covers the existing Grade 1 Mathematics Counting chapter. GitHub PR #1 was open when this work began, so the QA branch starts from Milestone 5A commit `0666904ad16296b5efa52027a5f3c469bd9b0575`.

## Completed checks

- [x] Count, rearrange, retry, score once per round, replay and switch languages without resetting game state.
- [x] Review Shape Sorter through its development URL. Select and place by keyboard and verify the production build excludes the activity.
- [x] Verify both translations, all 20 student practice links, and four byte-identical PDFs in the production preview.
- [x] Check the student API and static assets for answer-key exposure. The practice endpoint returns only worksheets and tests. The old PDF URLs returned 404 for a PDF request.
- [x] Render and review all 26 student PDF pages and prepare the [bilingual review packet](grade-1-mathematics-bilingual-review.docx).
- [x] Check the counting objectives and investigate [Shape Sorter's curriculum placement](grade-1-curriculum-verification.md).

## Release gates

- [ ] Have a fluent Pashto reviewer check the live lesson, both games, notes, worksheet and test tasks, and consistent terminology. Review the English-only shell and RTL number and dot-group reading order.
- [ ] Review student print directions that tell learners to consult a separate answer key. Agree on bilingual replacement wording before reissuing PDFs. The current wording exposes no answer material.
- [ ] Run native Safari keyboard and layout checks and manual VoiceOver and physical-device checks listed in the [accessibility audit](grade-1-accessibility-audit.md). Verify PDF fragments in actual PDF viewers, particularly worksheet 7 and tests 1 and 3.
- [ ] Obtain educator approval of Shape Sorter's 1Gg.01 scope and placement before making it available to students.
- [ ] Resolve the historical GitHub answer-key exposure through a separately authorised decision. The previously documented historical commit and both historical raw answer-key PDF paths still returned HTTP 200 anonymously on 20 November 2026. The local current release and historical repository objects are distinct surfaces. The cleanup plan was left untouched.
