# HTML → unified Task parser

`parseHtmlTask(html, filename)` turns one standalone IELTS practice HTML page into
a `NormalizedTask` (`@/types/task`) — the single shape every importer (HTML / DOCX /
manual) normalises to and the test player consumes. It never throws: every result is
a `ParseResult { ok, source, task?, warnings, errors }`.

The batch CLI `scripts/parse-tests.ts` runs this over a folder, validates each task
with `normalizedTaskSchema` (zod), and writes one JSON per file plus an `index.json`
summary to `../svy-ielts/test-imports/_parsed/`.

```
npx tsx scripts/parse-tests.ts [inputDir] [outputDir]
# defaults: ../svy-ielts/test-imports/_dump  →  ../svy-ielts/test-imports/_parsed
```

## Why it is defensive

The source corpus (`../svy-ielts/test-imports/_dump`, 121 HTML files) was authored by
many different people with no shared template. There is no canonical structure — only
recurring *families*. The parser detects the family and routes to the best extractor,
collecting `warnings` for anything ambiguous and only emitting `errors` (+ `ok:false`)
for a genuinely unusable file. Current corpus result: **121/121 parse and validate**.

## The two families

### 1. CONFIG-driven (best fidelity)

The page body is largely empty (`<div id="qroot">`) and a single
`const CONFIG = { sections: [...] }` object is rendered client-side. This is the
richest form, so we read it directly:

| CONFIG field                          | NormalizedTask mapping                         |
| ------------------------------------- | ---------------------------------------------- |
| `title`, `subtitle`, `durationMinutes`| `title`, `instructions`, `durationMin`         |
| `sections[].type`                     | group/question `QuestionType` (see table below)|
| `sections[].heading` / `instructions` | group `instruction`                            |
| `sections[].headingsList`             | group `data.headings` (matching-headings bank) |
| `sections[].options`                  | question `data.options` (choice/match bank)    |
| `sections[].items[].prompt`           | question `prompt`                              |
| `sections[].items[].correct/answer`   | question `answer`                              |
| `sections[].correct` (no `items`)     | a single grouped multi-select question         |

`type` strings map as: `headings → MATCHING_HEADINGS`, `msq/multiselect → MULTI_SELECT`,
`mcq → MULTIPLE_CHOICE`, `matching → MATCHING`, `tfng → TRUE_FALSE_NOTGIVEN`,
`ynng → YES_NO_NOTGIVEN`, `gap/completion → *_COMPLETION` (refined by instruction),
`short → SHORT_ANSWER`. Unknown types fall back to instruction-based detection.

### 2. Static-DOM (scraped)

The passage and questions are real DOM and the answer key lives in a `<script>`
(`const correctAnswers = { q1: "TRUE", … }`, `const answers = { 1: "white", … }`,
`ANSWERS`, `answerKey`, or a numeric-keyed object). We:

1. **Passage** — take the richest of `.passage-container .passage`, `.passage`,
   `.passage-container`, `#passage`, `<article>`; strip scripts/styles/buttons/inputs/
   timers/results → `passageHtml`.
2. **Answer key** — pull the JS object via balanced-brace slicing, then a JSON-first
   reader (handles single quotes, bare keys, trailing commas, em-dashes, `//`-in-URLs)
   with a guarded data-literal evaluator fallback for quirkier literals.
3. **Groups** — walk the questions container in document order. A new group opens on a
   `Questions N–M` boundary (an `h1`–`h4` heading, or an `.instructions` / `.part-head`
   / `.top-note` block leading with `Questions/Part/Section N`). Instruction paragraphs
   and lists between boundaries accumulate into the group `instruction`.
4. **Questions** — each *leaf* block (`.question`, `.answer-input`, `.question-item`,
   `.q-block`, `.mcq-question`, `.drag-match-container`) becomes one or more questions.
   Wrapper blocks that contain a heading or nested leaves are *transparent*, so the
   walker reaches the real leaves and never double-counts. Loose `<input>`/`<select>`
   sitting directly in a transparent wrapper (e.g. bare `<p>…<input></p>` notes) are
   captured individually.

| DOM signal                                   | QuestionType        | Answer source                       |
| -------------------------------------------- | ------------------- | ----------------------------------- |
| `<select>` with TRUE/FALSE options           | `TRUE_FALSE_NOTGIVEN`| key by `id` / `q<n>` / `<n>`        |
| `<select>` with YES/NO options               | `YES_NO_NOTGIVEN`   | key by `id` / `q<n>` / `<n>`        |
| `<select>` with A/B/C options                | `MULTIPLE_CHOICE`   | key by `id` / `q<n>` / `<n>`        |
| radio group (`input[type=radio]`)            | `MULTIPLE_CHOICE`   | key by `name` / `q<n>`              |
| checkbox group (`input[type=checkbox]`)      | `MULTI_SELECT`      | per-option `true` flags → letters   |
| text `<input>` (completion blanks)           | `*_COMPLETION`      | key by `id` / `q<n>` / `<n>`        |
| `.drag-match-container` / `.draggable-option`| `MATCHING`          | key per `data-question-id`          |

The completion sub-type is refined from the instruction text: `summary →
SUMMARY_COMPLETION`, `table → TABLE_COMPLETION`, `sentence → SENTENCE_COMPLETION`,
`notes/form/flow-chart → NOTE_COMPLETION` (default).

## Common mapping rules

- **track** — always `IELTS` (the corpus is IELTS; CEFR/MULTILEVEL come from other
  importers).
- **skill** — `LISTENING` if there is an `<audio>` / `.audio-controls`, an `audioFiles`
  array, `part-title`+`Section`, or the title/filename mentions listening/section;
  otherwise `READING` (writing/speaking detected by keyword).
- **slug** — derived from the filename (NFKD-folded, lower-cased, non-alphanumerics →
  `-`). The CLI de-duplicates colliding slugs (`slug`, `slug-2`, …).
- **title** — `<title>` (boilerplate like "IELTS Reading Practice -" stripped), else the
  first content `<h1>`, else a title-cased filename.
- **durationMin** — `20` reading / `30` listening, overridden by `CONFIG.durationMinutes`.
- **answer** — normalised to the contract shape: a single `string`, or a `string[]` for
  ordered/multi answers. Accepted-variant lists (e.g. several spellings of a date)
  collapse to the first canonical form; short all-letter arrays stay as multi-answers;
  boolean checkbox flags are resolved to their option letters, not kept as `true`.

## Parsing is not the same as publishable

`scripts/audit-reading.ts` is the gate between the two. A task can parse and pass
`normalizedTaskSchema` while still being impossible to sit: a TRUE/FALSE picker whose
statement was lost, a "choose TWO letters" question with no letters, a group whose
rubric promises seven questions when five were extracted, or an instruction that
restates the questions above the questions. The audit checks exactly those things and
reports every defect it finds:

```
npx tsx scripts/audit-reading.ts [parsedDir] --copy-clean <dir> --limit 50
```

`--copy-clean` writes only the defect-free tasks (de-duplicated by passage, ordered to
favour rarer question types) so `scripts/seed-tasks.ts` can be pointed straight at it.
`auditTask` is also exported, so the same checks can be run against what actually
landed in the database rather than against the parser's output.

## Known limitations

- **Single accepted answer kept.** When the source lists several acceptable spellings
  for one blank, only the first/canonical variant is stored. Alternative-answer
  matching is left to the player/grader.
- **Multi-select keys.** Checkbox groups whose key is neither per-option `true` flags
  nor an array under the group number resolve to an empty answer (a warning is logged).
  This affects a small share of listening "choose N from a box" items.
- **Prompts are plain text.** Completion prompts carry the surrounding sentence as text
  (dropdown option noise stripped). When one paragraph holds several blanks, each
  question gets that paragraph with *its* blank marked `_____` and the others reduced
  to `…`, so the questions are distinguishable; a lone blank has no inline marker and
  the player renders it from question order/position.
- **No audio bytes.** Listening `audioUrl` is taken from `<audio src>` / `<source src>`
  when present; many pages reference an empty/`audioFiles=[]` player, so `audioUrl` is
  often absent (a warning is logged). Transcripts are not extracted.
- **Images/labelling diagrams** are not downloaded; `LABELLING` tasks keep their text
  prompt only, without the diagram asset.
- **Heuristic grouping.** A handful of idiosyncratic listening layouts produce slightly
  coarser groups (e.g. two instruction sets merged) but remain schema-valid; the group
  type is the dominant per-question type.
- **`new Function` evaluator.** The data-literal fallback evaluates the *answer/CONFIG
  object only*, gated to reject anything resembling code (calls, arrows, control flow,
  template interpolation) and run with no arguments in strict mode. It is invoked by the
  **offline importer only** and never in the request path; treat the input corpus as
  trusted local content.
