# Educational video review register

## Grade 1 Mathematics · Chapter 1

Counting collections from 0 to 20. Cambridge Primary Mathematics 0096 Stage 1 **1Nc.01** covers counting collections, matching one count word to each object, and recognising that rearranging a collection preserves its total. **1Np.01** covers zero as an empty collection. See the [curriculum verification report](grade-1-curriculum-verification.md).

### Discovery results · 21 November 2026

Titles, channels, durations, and platform flags below come from YouTube watch-page player metadata. Durations use `videoDetails.lengthSeconds`, formatted as minutes and seconds. “Watch page OK” means YouTube reported a playable status for the discovery request. Signed-out playback, regional access on learner networks, and in-app playback still require manual checks. The embed column records YouTube's `playableInEmbed` flag. A positive flag confirms the platform setting observed on that date. The curriculum and age notes are preliminary judgments based on the creator descriptions. Full viewing, captions, and visual and spoken content remain pending.

| ID and video | Channel | Language | Duration | Objective and proposed use | Strengths and limitations | Age suitability | Availability | Embedding | Review status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `7qdCsfYSUOc` · [Kindergarten Math 8.1, Model and Count 20](https://www.youtube.com/watch?v=7qdCsfYSUOc) | JoAnn's School | English | 4:30 | 1Nc.01 · count a collection of 20 | The description models marking objects around a circle to keep track. Check whether the explanation covers smaller collections and whether workbook references require extra materials. | Kindergarten presentation is a plausible Grade 1 fit. Confirm pace and clarity. | Watch page OK | Disabled | Candidate · external-link review only |
| `qF2jS_b4rTE` · [Kindergarten Math 1.9, Problem Solving, Understand 0](https://www.youtube.com/watch?v=qF2jS_b4rTE) | JoAnn's School | English | 7:18 | 1Np.01 · connect zero to an empty collection | The description uses an empty five-frame and includes numeral writing. Check how much of the runtime addresses emptiness and whether textbook references distract. | Kindergarten target. Check attention demands and whether an adult needs to pause and prompt. | Watch page OK | Disabled | Candidate · external-link review only |
| `T9tsr-366FE` · [Counting with One to One Correspondence for preschool and kindergarten](https://www.youtube.com/watch?v=T9tsr-366FE) | Carrie Cutler | English | 2:30 | 1Nc.01 · say one count word per item | The description recommends touching each object once and models one word per item. Check whether the video speaks mainly to adults and whether learners can see every touch. | Short early-years example. Confirm independent Grade 1 suitability or use as teacher reference. | Watch page OK | Enabled in metadata. YouTube oEmbed also returned an iframe for this ID. | Candidate · prioritise full review |
| `4HhnHDcMTfw` · [Conservation of Number \| Lovevery](https://www.youtube.com/watch?v=4HhnHDcMTfw) | Lovevery | English | 0:48 | 1Nc.01 · investigate rearrangement | The description presents a Piaget task demonstration. Check whether it explicitly shows and explains that the total is unchanged when nothing is added or removed. The description includes commercial links. | Adult-facing framing suggests teacher reference. Confirm explanation and commercial content before considering any learner use. | Watch page OK | Enabled in metadata | Candidate · teacher-reference lead |
| `BC08pal95GA` · [١ نه تر ١٠٠ شمېر - 100-1 Numbers](https://www.youtube.com/watch?v=BC08pal95GA) | Liwal School لېوال ښوونځى | Pashto advertised. Spoken and Standard Written Pashto pending verification. | 9:07 | 1Nc.01 · possible number-word warm-up only | The description identifies a Grade 1 number sequence from 1 to 100. The range exceeds this chapter and starts at one. Object counting, one-to-one correspondence, and conservation are unverified. | Tagged Grade 1 by the publisher. Check pace, numeral forms, dialect and orthography with a fluent reviewer. | Watch page OK | Enabled in metadata | Candidate · supplementary lead only |

No Standard Written Pashto match for the four objectives was verified. Searches included Pashto-script Grade 1 terms and English queries for Pashto counting to 20. A [Pashto 1–20 lead](https://www.youtube.com/watch?v=Kv1RZ1_ewLo) from Learn Pashto with Sajjad Ahmad and a [second 1–20 lead](https://www.youtube.com/watch?v=4S04dyq6qdc) both returned an unavailable player response in this environment. Exclude them from the shortlist unless playback can be independently verified. A child-facing conservation lesson that explicitly explains the unchanged total remains a discovery gap.

## Review and approval workflow

1. **Log a candidate.** Use one record per YouTube ID and intended lesson placement. Link the canonical HTTPS watch URL, record the observed metadata with date and source, and mark missing fields as unverified. Record speech and on-screen writing separately when they differ.
2. **Watch the entire video.** A curriculum reviewer records timestamps for each supported objective and any error or limitation. For this chapter, verify one word per object, the final number as the total, an actual empty collection for zero, and the same objects before and after rearrangement. Number recitation alone is a warm-up. Mark partial coverage and adult-facing material clearly.
3. **Check learner suitability and access.** Review vocabulary, pacing, visibility of objects and gestures, sound, accurate captions or transcript, and any unsafe content, ads, promotions, outbound links, or recommendations visible on the intended surface. A fluent Pashto reviewer checks narration, captions, Standard Written Pashto, numerals, and RTL where applicable. Record reviewer, date and findings.
4. **Verify delivery on the intended surface.** Test the watch page signed out on the intended learner network. For an embed, record the platform setting and test actual playback in a private review environment using the same privacy-enhanced player from the target origin. Check keyboard controls, captions, mobile sizing, and fallback. Recheck availability and embed setting before activation. Treat missing or disabled embed evidence as ineligible for embedded playback. An external-link-only placement requires its own suitability review and explicit approval.
5. **Record a decision.** Use **Candidate** for discovery, **In review** once manual checks begin, **Ready for owner decision** when checks pass, **Approved** only after explicit project-owner approval, **Rejected** for a documented adverse decision, and **Withdrawn** when later evidence invalidates suitability or availability. Record the exact ID, chapter, language, permitted surface, reviewer and owner decision, date, reason, and evidence reference. Keep the decision in the register even if the video is withdrawn.
6. **Hand off activation separately.** This register is editorial documentation. Approved entries become eligible for a separately authorised change to [the reviewed-video list](../frontend/src/youtube.ts). Preserve the HTTPS host and canonical ID validation, chapter and language filtering, and the [click-to-load privacy-enhanced player](../frontend/src/ChapterVideos.tsx). Set `embeddingPermitted` only after an affirmative embed check. Verify the approved language and chapter, absence of a player before interaction, and the permitted fallback behavior.

Platform references for reviewers are [YouTube embedding guidance](https://support.google.com/youtube/answer/171780) and [YouTube video metadata fields](https://developers.google.com/youtube/v3/docs/videos).

### Reusable decision record

Copy this block for each manual review and reference the corresponding row above or add its discovery fields here for a new lesson.

```text
Grade / subject / chapter / intended placement:
YouTube ID / canonical URL / exact title / channel:
Spoken language / written language / runtime:
Discovery reviewed on / metadata source:
Curriculum objective and timestamped evidence:
Educational strengths / limitations / age suitability:
Captions or transcript / keyboard and mobile observations:
Safety, promotions, recommendations and outbound links:
Fluent Pashto reviewer and findings (if applicable):
Signed-out watch availability / date / region or network:
Embed setting and source / target-origin playback / date:
Intended surface (embed, external link, teacher reference):
Reviewer / date / evidence reference:
Status / reason / remaining checks:
Explicit owner decision / date / evidence reference:
Recheck date and outcome:
```

## Milestone 6A verification

- Frontend clean install, all 10 unit tests, lint, and production build passed.
- Go tests, `go vet ./...`, and `go mod verify` passed.
- The reviewed-video list stays empty. This register lives outside frontend build inputs. Full video viewing, caption review, signed-out and in-app playback, fluent Pashto verification, and owner decisions are pending.
