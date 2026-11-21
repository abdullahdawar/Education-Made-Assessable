# Grade 1 accessibility audit and test results

Scope includes the linked Grade 1 Mathematics Counting lesson, Counting Adventure, and the development-only Shape Sorter. Checks used the [WCAG 2.2 criteria](https://www.w3.org/TR/WCAG22/) for contrast, visible focus, keyboard access, and status messages. This is a scoped functional audit.

## Confirmed defects and fixes

| Finding | Change |
| --- | --- |
| The selected Shape Sorter button inherited white text on a pale yellow background, about 1.14:1 contrast. | The pressed label now uses dark text, about 13.37:1 contrast. The pressed state still has a border and a background change. |
| A second identical wrong answer left the existing status text unchanged. | Each accepted attempt updates one of two mounted polite status regions. Consecutive identical retries now produce a fresh text mutation. Scoring still counts each solved round once. |
| The score used an accessible label on an inline emphasis element and the progress bar's name described the round while its value counted stars. | Stars are visible text and the progress bar is explicitly named for its value. The round and score fractions retain their order within the RTL game. |
| A placed shape could be narrowed without reducing its height in a small container. | Placed shapes preserve their proportions when scaled to fit. |

## Automated checks

- All 10 frontend unit tests passed, including the consecutive-retry regression test. Frontend lint and the production build passed.
- Go tests, `go vet` and module verification passed.
- Browser checks ran against the live local Go and MySQL read path. They covered all 12 Counting rounds and all six Shape Sorter rounds, retry feedback mutations, focus transfer, keyboard selection and placement, replay, reduced motion, Pashto RTL and state retention, no horizontal overflow, and valid PDF responses.
- The production preview served four byte-identical student PDFs with the PDF content type. The API returned seven worksheets and three tests per language. The learner build excluded Shape Sorter and contained no answer-key assets. Historical answer-key PDF URLs in the local development preview returned 404.
- All 26 source PDF pages rendered. Pashto text was present on each expected page. PDF text extraction can change bidirectional order and reported missing font bounding-box metadata for embedded fonts. Verify reading order and access to countable marks with assistive technology before signoff.

## Browser results

All nine runs passed on macOS 26.7.1. No functional regression was reproduced after the fixes.

| Browser | 320 px | 375 px | 1440 px |
| --- | --- | --- | --- |
| Google Chrome 157 | Pass, emulated touch and keyboard | Pass, emulated touch and keyboard | Pass, mouse and keyboard |
| Playwright Firefox 159 | Pass, mouse and keyboard | Pass, mouse and keyboard | Pass, mouse and keyboard |
| Playwright WebKit 27.2 | Pass, emulated touch and keyboard | Pass, emulated touch and keyboard | Pass, mouse and keyboard |

WebKit used Option+Tab for full control navigation. Native Safari UI access timed out, so the WebKit results cover the engine exercised by Playwright.

## Manual checks still pending

| Environment | Check |
| --- | --- |
| Native Safari on macOS | Safari WebDriver refused session creation because Allow Remote Automation is disabled. Enable full tab navigation or use Option+Tab, then verify focus, both games and PDF page links. |
| VoiceOver on macOS and iOS | Verify the same wrong answer twice, a successful answer followed by automatic focus on Next round, a bin selection, completion, the star progress name and values, and RTL pronunciation. On touch, use swipe navigation and double-tap. Record what VoiceOver speaks and whether focus interrupts or repeats any message. |
| Physical iPhone and Android phone | Test portrait and landscape, zoom or enlarged text, both languages, and touch targets and gestures. Check the browser or downloaded PDF viewer opens the linked practice page where supported. |
| Student PDFs with assistive technology | Read English and Pashto notes and test pages in a PDF viewer. Check dot groups, diagrams, the numeric card sequence, page fragments, and language switching. |

Browser automation verified DOM roles, focus and text mutations. Audible VoiceOver behavior and physical hardware were outside this run.
