# Grade 1 English implementation and review report

The twelve implemented chapter packs follow the [Stage 1 roadmap](grade-1-english-curriculum-roadmap.md). The inventory maps all **90** verified Cambridge Primary English 0058 Stage 1 objectives. A curriculum mapping and the availability of student activities are evidence of implementation. Objective-level attainment and production readiness require educator review. The English targets are the same in both presentations. Standard Written Pashto explanations, parent guidance and interface text are drafts. [Cambridge 0058 v2.1 framework, pp. 15–21](https://resources.pastpapersacademy.com/resources/curriculum/cambridge/0058-English-Curriculum-Framework.pdf)

## Chapter, game and resource inventory

| Chapter | Literacy focus | Game |
| --- | --- | --- |
| 1 | Alphabet, decoding and handwriting | Alphabet path |
| 2 | Digraphs, trigraphs, adjacent consonants and rhyme | Word workshop |
| 3 | Common and exception words, verb endings, plurals and spelling logs | Word changes |
| 4 | Picture clues, vocabulary and word banks | Picture detective |
| 5 | Shared reading, rhythm, rhyme and reading aloud | Rhyme theatre |
| 6 | Sentences, punctuation, articles and joining | Sentence workshop |
| 7 | Narrative sequence, oral planning, retelling and writing | Story path |
| 8 | Non-fiction purposes, book features, headings, lists, labels and captions | Text explorer |
| 9 | Literal and inferred meaning, predictions and evidence | Clue detective |
| 10 | Reading preferences, personal connections and writer read-back | Reading circle |
| 11 | Oral instructions, questions, sharing ideas and turn-taking | Listening partners |
| 12 | Role-play, personal statements and reflection | Panda stage |

Each chapter has a short English stimulus, a worked model, illustrated cue, independent activity and adult review notes. The games use single-choice reading and matching tasks and ordered construction of letters, words, punctuation, events or instructions. English tokens stay left-to-right within the RTL interface. The game shell gives retry feedback, undo, replay, stars and keyboard focus after completion, with no timer. The Pashto lesson, directions and parent support scaffold the work. Core reading stimuli, spelling, game tiles and worksheet/test responses remain in English.

There are **seven worksheets and three tests per chapter per presentation** (240 links), and **48 student PDFs** with **264 pages**. Each chapter has one notes page and a ten-page worksheet/test packet per presentation. Practice pages carry English prompts and ruled writing space. Separate tests omit the chapter reference card and use their own examples, prior work or an adult-led prompt when needed. The packet build allowlists the notes and worksheet/test file types. No teacher-only keys are included. The video slot remains empty.

## Audio and objective evidence still pending

No verified recordings were available for this implementation. Chapters 1–3, 5, 9, 11 and 12 show audio pending guidance. Phoneme demonstrations must use a verified educator's model. Listening tasks can be set by an adult without showing the written script. Printable prompts and silent games support practice and cannot verify hearing, pronunciation or spoken performance.

| Scope | What still needs validation |
| --- | --- |
| **1Rw.01–1Rw.07, 1Ww.01–1Ww.03, 1Ww.05–1Ww.06, 1Rv.04–1Rv.05** | Sample authentic sound–spelling correspondences, unfamiliar word decoding, adjacent consonants, common words, spoken alphabet, rhyme and rhythm with an educator. The packs include sample words and graphemes. Full age-appropriate phoneme, spelling choice and independent fluency sampling remains pending. |
| **1Ri.06, 1Ri.12, 1Ri.14, 1Ra.01–1Ra.05, 1Wc.02, 1Wp.06** | Observe retelling, oral answers to both read and heard texts, joining in, independent reading aloud, reading preferences and oral planning/read-back. |
| **All 18 Speaking and Listening codes** | Observe oral directions, relevant questions, group discussion, performance and reflection in context. A written rehearsal in Chapter 11 cannot score understanding of heard instructions. |
| **1Wp.01–1Wp.03** | Approve the local handwriting conventions and observe grip, lower- and upper-case formation and appropriate joins. The notes provide an alphabet reference and a worked movement for lower-case m. A comprehensive stroke and join model remains a review item. |
| **All writing and reading objectives** | Review independent work and varied texts with a teacher. In particular, the short chapter texts need to be supplemented by real books, different genres and freshly sampled material where the framework asks for range or independent performance. |

For future recorded audio, attach educator-reviewed original or appropriately licensed clips to exact English words or listening prompts. Use an accessible named play/pause control, load media on demand, and provide an appropriate text alternative or teacher script. Assess listening with the stimulus concealed during the task where required. Audio should never play automatically.

## Integration and testing

The shared transactional importer now takes a subject while preserving Mathematics as the default. On disposable MySQL only, a Grade 1 English mapping was added to the fixture, followed by 12 read-only plans, 12 imports and 12 no-op reruns. A resource insert failure rolled back its chapter and a deliberately conflicting title was rejected. The live Go API served ordered English chapters, both translations and all 240 resource links. The complete Mathematics fixture rows matched before and after. No existing installation records or privileges changed.

- **Automated:** 24 frontend tests, frontend lint, production build, Go tests and Go vet passed. New tests cover objective inventory, reading/spelling samples, English/Pashto field separation, game session state, practice count, grade filtering and PDF inventory.
- **Print:** All 48 files and 264 pages passed page count, tagging, document language and text bounds checks and rendered for visual review. The visual pass used chapter contact sheets. Teacher-led oral tasks include response lines for related notes, not a score or model answer. Real-reader keyboard accessibility, reading order and page jumping remain pending.

### Browser checks

Production preview ran against the Go API and disposable MySQL. The checks exercised English choice and ordered construction, wrong-answer feedback, undo, focus on the continue button, completion, replay, English/Pashto switching, and the English reading block's LTR direction within the Pashto RTL lesson. The preview checked all 240 English page URLs and fetched each of the 48 English PDFs in Chrome, comparing the served and repo files byte for byte. Maths Chapters 1, 2 and 12 received game and link smoke checks.

| Engine | Widths | English chapters |
| --- | --- | --- |
| Chrome | 320, 375 and 1440 px | All 12, with touch emulation at 375 px |
| Firefox | 320, 375 and 1440 px | Chapters 1, 2, 6, 9, 11 and 12, keyboard |
| WebKit | 320, 375 and 1440 px | Chapters 1, 2, 6, 9, 11 and 12, with touch emulation at 375 px |

Firefox and WebKit did not run Chapters 3–5, 7–8 or 10. These tests used direct keyboard targeting and emulated touch. They leave natural tab traversal and actual-device behavior for review.

### Repeating the workflow

Run `python3 curriculum/tools/build-english-pdfs.py` followed by chapter numbers. The renderer uses Chromium and the existing print styles. Use `CHROME` to specify another Chromium executable. For a permitted target and writer, use `python3 curriculum/tools/import-english-chapters.py --preflight` followed by chapter numbers with the established [EMA_IMPORT configuration](../README.md). The English mapping must already exist. Confirm the target and backup before any separately approved write.

## Release gates

- Educator signoff on sequence, representative assessment evidence, handwriting, supplementing the short reading texts and use of a first-language curriculum with local learners.
- Fluent Standard Written Pashto signoff for all scaffolding and mixed-language instructions.
- Verified phonics and listening recordings, or an approved facilitated teaching plan and independent assessment before claiming those objectives are met in the intended setting.
- Physical-device, VoiceOver and real PDF reader testing. No claim of native assistive technology conformance.
- Separately authorized rollout with verified backup and matched frontend assets. The existing installation and Mathematics draft PR #4 remain untouched.
