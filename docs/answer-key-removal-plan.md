# Answer-key removal plan for approval

The public feature branch contains both Grade 1 counting answer-key PDFs
and the answer tables in the bilingual chapter Markdown. Commit `13d3524`
introduced all three files. The remote advertised two branches and no tags
or pull request refs at inspection. The affected commit is in
`feature/chapter-learning` and outside `main`.

The original PDFs and complete Markdown have been copied outside the
checkout into an owner-only directory. Each copy matches its source by
SHA-256. Keep the archive out of build inputs and public Git remotes.

1. After explicit approval to rewrite history, record the current remote
   refs and coordinate a pause on pushes. Audit forks, PR refs and any other
   distribution points. Make a private rollback bundle and use a fresh,
   isolated clone for the cleanup.
2. Filter both answer-key PDF paths and the historical chapter Markdown
   path from the affected history. Reintroduce the approved student text
   with the answer-key section removed. Preserve wording in the lesson
   sections so the importer still verifies previously imported lessons.
   Update the print generator to build the four student PDFs without key
   data. If private key generation is needed, accept a private input and
   output directory outside the checkout. Ignore generated key PDFs and
   remove any other answer text identified in the history audit.
3. Review the exact rewritten ref list and compare the final diff with the
   agreed removal scope. Confirm that the four student PDFs are byte-for-byte
   unchanged, the public build succeeds without private files, and the
   removed key blobs and answer text are absent from every reachable
   commit. Rerun the student API and asset checks. Confirm the planned
   feature-branch tip and original remote SHA before updating GitHub.
4. With explicit approval to force-push, update only the affected branch,
   using an explicit lease against the recorded remote SHA. Stop if the
   lease fails or additional affected refs are discovered. Coordinate fresh
   clones so old commits are not pushed back.
5. Check anonymous GitHub file, raw, commit, blob and PR access after the
   update, including known old object URLs. Audit public forks and contact
   owners or GitHub Support if copies remain. GitHub may decline removal
   assistance for material it considers non-sensitive. A rewrite cannot
   recall files already downloaded. If accessible copies cannot be removed,
   report the remaining locations. If the assessments need confidential
   answers, review replacement assessment items as a separate content change.
6. Collect the owner's desktop and mobile results using the
   [browser checklist](chapter-learning-review.md#owner-browser-checks).
   Present the security verification and browser results with the exact
   feature-branch SHA for final merge approval.

[GitHub history removal and retention guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
