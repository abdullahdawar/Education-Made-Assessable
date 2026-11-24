# Workspace cleanup report

## Original layout and relocation

Before consolidation, the canonical repository and 15 linked worktrees were
separate folders directly under the Desktop. Two detached, Codex-managed
worktrees lived under the Codex worktree directory. The canonical checkout
contained an untracked Bella De Ci Remotion production and a Kaggle notebook.
The Codex-managed e50c checkout contained a separate untracked Bella De Ci
Python production.

During the approved consolidation, the Remotion production and notebook moved
to the sibling Bella De Ci project under `Productions/Remotion/` and
`Outputs/Kaggle/`. The Python production was copied and checksum-verified at
`Productions/Python/`; its original remains in e50c to preserve the
Codex-managed checkout and the production's existing paths. The workspace
relocation manifest records the individual operations.

## Current layout

- Workspace root: `~/Desktop/Abdullah Workspace/`
- Canonical checkout: `Education Made Assessable/Source/Education-Made-Assessable/`
- Desktop-based linked checkouts: `Education Made Assessable/Worktrees/`
- Version 2 checkout: `Education Made Assessable/Worktrees/Education-Made-Assessable-platform-v2/`
- Independent production root: `Bella De Ci/`
- Other independent work: `Think Well International/` and `Other Projects/`

The approved workspace already provides separate project roots. Moving the
canonical checkout to another Desktop hierarchy would require another
relocation and would affect active worktree and Codex paths, so the current
canonical path is retained.

## Version 2 audit and checkpoint

The new branch starts from Science commit `01dcffb`, which already contains the
Grade 1 Mathematics and English branches, the counting answer-material
separation, and the available interactive learning and video work. Checkpoint
`569b09f` adds the directly verified local Science changes and the existing
answer-key removal plan. The original uncommitted files remain in their
respective checkouts.

The version 2 tree contains no identified Bella De Ci production or Kaggle
notebook. The review checked tracked paths, local Git status, and the Bella
path's Git history. Educational illustrations and resources remain with the
curriculum. No additional files were archived in this pass. No uncertain
files were identified in the new checkout. The retained e50c production is
the known exception outside the canonical and version 2 checkouts.
