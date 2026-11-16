# Chapter learning pre-merge review

## Owner browser checks

Open the local student site at http://127.0.0.1:5173 with the API running.
Record browser, operating system, viewport and pass or fail for each check.
Use a desktop browser and a phone or its responsive viewport at 375 px.

- [ ] Choose Grade 1, Mathematics, then Counting collections from 0 to 20.
  Confirm that each step loads and the breadcrumb returns to the right list.
- [ ] Switch to Pashto and back to English. Verify the title, body, reading
  direction and language of the linked PDFs. Confirm the Pashto review notice.
- [ ] Open and save both language versions of the notes and the practice
  packet. Click worksheet 1 and 7 and test 1 and 3 in each language. Expect
  pages 1, 7, 8 and 10 in browsers that support PDF page fragments.
- [ ] At phone width, look for horizontal scrolling, clipped text, overlap,
  or buttons and links too small to use. Repeat with Pashto active.
- [ ] Starting at the top, use Tab and Shift+Tab to move through controls and
  links. Confirm a visible focus indicator. Use Enter or Space to select a
  grade, subject, chapter and language. Confirm focus moves to the new page
  heading after each navigation and that links can be opened by keyboard.
- [ ] Confirm the student UI offers no answer-key links.

## Import into another environment

1. Use a checkout of the release revision containing the approved counting
   source, the four student PDFs and the importer. Use Python 3 and the
   Oracle MySQL client on an operator host with database access. The operator
   host does not need a locally installed MySQL server.
2. Provision the target schema and Grade 1 → Mathematics mapping separately.
   The target database must be named `education_made_assessable` and have the
   chapter, content and resources tables used by the importer. Take the
   deployment backup before importing. Retain it according to the target
   environment's backup plan.
3. Create a temporary writer scoped to the operator host. Grant SELECT on
   grades, subjects, grade_subjects, chapters, chapter_content and
   chapter_resources. Grant INSERT on chapters, chapter_content and
   chapter_resources. Use a separate read-only app account with the grants
   described in the README, including the resource column grant.
4. Inject `EMA_IMPORT_USER` and `EMA_IMPORT_PASSWORD` through the operator
   secret store. For remote MySQL, set `EMA_IMPORT_HOST` to the certificate
   hostname and `EMA_IMPORT_TLS_CA` to the trusted CA PEM file. Optional
   `EMA_IMPORT_PORT` defaults to 3306. The client verifies the server
   certificate and hostname. For a colocated operator use
   `EMA_IMPORT_SOCKET` with the target socket path. Set
   `EMA_IMPORT_BACKUP_DIR` to a private, durable directory outside the checkout
   to retain the affected-row snapshot.
5. Run `python3 curriculum/tools/import-counting-chapter.py`. It resolves
   target IDs, snapshots the affected rows, inserts the approved chapter
   in one transaction, and verifies the result. An identical rerun performs
   no inserts. Investigate conflicts before taking any corrective action.
   Remove the temporary account and clear its secrets after verification.
6. Serve only `frontend/dist` as static files and route `/api/` to Go.
   Keep review assets outside the document root. Verify both translations,
   seven worksheet and three test links per language, all four student
   PDFs, and the absence of answer keys from API responses and static files.

The two review key PDFs are tracked in the feature branch. GitHub access is
separate from student application access. In the current public repository,
anonymous users can fetch the keys. The repository containing the review PDFs
must have restricted access before this branch can meet a requirement to keep
answers private. Pashto remains pending fluent-language review before public release.
