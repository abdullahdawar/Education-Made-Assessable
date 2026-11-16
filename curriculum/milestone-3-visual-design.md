# Milestone 3 visual design requirements

Use the same palette, typography hierarchy, rounded cards, and visual cues
on the student website and in print. Give Grades 1–6 clear navigation,
generous spacing and age-appropriate illustrations. Use colour to distinguish
sections and pair it with labels or icons so colour never carries meaning alone.

Each A4 notes booklet needs an illustrated cover, chapter title, learning
objectives, colour-coded sections, definitions, visual worked examples,
activities, practice and a summary. Brand and number every page. Use visuals
alongside short text. For the Grade 1 counting example, use number cards,
everyday objects and collections that accurately represent zero through 20.

Give every chapter seven worksheets that progress from guided work to transfer
and three tests that assess core skills, application and explanation.
Provide clear instructions, ample writing space and separate answer keys.
Keep test decoration away from the questions. Layouts must remain legible in print.

English material reads left to right. Standard Written Pashto reads right to
left with correct shaping, punctuation, and number order. Match the content,
task demands, marking and visual quality across languages. All Pashto remains
pending fluent-speaker review before public release.

Use reusable React components, shared design tokens and reusable print
templates. Support phones, tablets and desktops, keyboard navigation, visible
focus, adequate contrast and the user's reduced-motion preference. Distinguish
notes, videos, worksheets and tests with labels, colour and icons.

Use original or licensed artwork. Favour lightweight vector diagrams, keep
fonts and images efficient, and validate A4 output. Review rendered pages
for clipping, alignment, shaping, legibility and mathematical accuracy.
Check desktop and mobile website layouts before sign-off. Record unresolved
Pashto review or rendering issues. Keep review assets local until approved.

The counting sample generator is `curriculum/tools/build-counting-pdfs.py`.
It uses Python 3 and local Chrome, with no application dependencies. Run it
from the repository root. Outputs under `output/pdf/` are for review.
