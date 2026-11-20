# Learning World visual prototype

The dashboard opens on a dark indigo storybook landscape with an original
red panda mascot and a link to choose a grade. Six grade colours pair with
distinct geometric motifs, moving from soft clouds and gardens to orbit,
mountains and navigation. Each grade is named in text and its theme travels
with it through the next screens. The system uses a cream canvas, dark ink,
a compact school masthead, expressive headings and large controls.

| Component | Responsibility |
| --- | --- |
| `AdventureHero` | Welcome, main heading, grade shortcut and decorative mascot illustration. |
| `ChoiceGrid` and `Motif` | Illustrated grade and subject selectors with a common focus, hover and pressed treatment. |
| `ChapterJourney` | Ordered chapter list using the actual chapter numbers. The route shows sequence only. |
| `Lesson` and `CountingIllustration` | Language-specific reading and visual examples, sourced from the existing chapter. |
| `Resource` and `Practice` | Readable notes, video, activity, worksheet and test sections with the existing PDF links. |

The prototype retains the existing Go API and database model. Existing loading,
retry, chapter filtering, translation and PDF logic stays in place. Video and
game sections describe availability. They do not activate those features.
The counting figures illustrate the existing four-dot, thirteen-dot and
six-counter examples. A button switches the six counters between a row and a circle while keeping the total visible. The mascot is original AI-generated artwork packaged in two WebP sizes.

At wide widths the hero, selector grids and resource rail use available
space. At narrow widths the hero illustration sits below its copy and
the resource rail follows the lesson. Native controls, visible high-contrast
focus, heading focus on navigation, and text labels carry the interactions.
Pashto lesson content stays right-to-left. Animation uses short transforms
or opacity, follows the reduced-motion preference and has no continuous loop.

This is an isolated worktree of the cleaned chapter-learning revision.
Review against the existing Grade 1 Mathematics database record. Use the
owner checklist for desktop and phone widths, chapter navigation, keyboard
focus, English/Pashto, PDF links and reduced motion.

## Review the prototype

Start the existing Go API with its configured database credentials. From
this worktree run `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174`.
Open http://127.0.0.1:5174/ and select Grade 1, Mathematics and the counting
chapter. Switch languages and toggle the counter arrangement. Open Notes,
Worksheet 7 and Test 3 in each language. Visit Grade 4 to review the older
grade theme and Computing card.

On a phone-width viewport, check that hero text, grade themes, breadcrumbs,
lesson figures and resource links fit without sideways scrolling. Tab through
the selectors and resource links, and use Enter or Space to activate them.
Enable reduced motion and confirm that movement is suppressed. Check that
the chapter order stays visible without completion badges, locked chapters
or fictional rewards.
