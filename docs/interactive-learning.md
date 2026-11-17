# Interactive learning prototype

Start the existing Go API and run `npm --prefix frontend run dev` from this
worktree. Open the URL printed by Vite.

- Select Grade 1, Mathematics, then Counting collections from 0 to 20.
  Choose Play Counting Adventure in Mini-games. Begin with an incorrect
  answer, use the hint, and answer correctly. Check that a solved round
  awards one star even if the answer is activated twice. Complete all nine
  rounds, toggle the optional celebration, and replay.
- Switch to Pashto during a round. Check that the round and stars stay put
  while the instructions, numbers, choices and feedback change language.
  Pashto text remains pending fluent-language review.
- Append `?review=shape-sorter` to the development URL to review shape naming
  and sorting. There is no student link or production review route.
- At 320–375 px and on desktop, test touch, Tab, Shift+Tab, Enter and Space.
  Check visible focus, focus transfer to each new prompt, and announcements
  of hints and results with a screen reader. Enable reduced motion and
  confirm that the completion panel has no animation.
- The Videos panel starts empty. Verify that it makes no YouTube requests.

The game shell owns ephemeral round state. The pure reducer ignores stale
events and scores a solved round once, including after retries. The shell
renders progress, focus, feedback and optional celebration. An activity
supplies prompts, visuals, hints and choices. The game assets load when
the student chooses to play. Restarting resets the current game.

Counting collections and rearranging six leaves practice Cambridge
`1Nc.01`. The empty tray practices `1Np.01`. Shape Sorter classifies circles,
squares, triangles and non-square rectangles, including rotated examples.
Its exact curriculum objective and placement are pending.

A future reviewed video entry in `frontend/src/youtube.ts` must identify the
chapter in the target environment, language, title, HTTPS YouTube URL and
whether embedding is permitted. Validate age suitability and playback as
part of review. The card derives a canonical link and an optional
privacy-enhanced embed URL from the validated ID. Loading the player
requires an explicit action. The external fallback stays visible.
