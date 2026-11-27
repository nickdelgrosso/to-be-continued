# Make a research code handover

Help the next researcher pick up the work. A single well-evidenced answer can be enough. This guide uses handover format {{ .guide.formatVersion }}.

## Work with the researcher

1. **Find the starting point.** Use the repository, files or notes the researcher has shared for this task. If you lack access, ask for a README, a file listing or a short description. Find any existing `HANDOVER.md` and read it first. Preserve its answers and the author’s uncertainties. If its format is unfamiliar, keep the original and agree how to carry its contents forward.
2. **Draft from evidence.** Follow the README to a real entry point, workflow, test, example output or decision record. Give the path, command, figure or commit behind each claim where useful. Say which checks you actually ran. If the README says a command works, attribute that to the README until you have run it. Link to good existing instructions.
3. **Interview for the gaps.** Pick the most consequential open question and ask it in plain language. For example, “The notebook drops the last two samples. Do you remember why?” Ask one question at a time, using the reply to choose a follow-up. A commit can show what changed. Decisions, manual checks, trust, credit and permissions often need the researcher’s account. Keep guesses in your questions. Give the researcher room to skip a topic, say “I don’t know”, correct your interpretation or stop.
4. **Choose the scope together.** For a quick pass, use the Speedrun prompts below. For a fuller handover, use any relevant prompts in the chapter lists. Where setup or workflow already has documentation, a pointer may suffice. If the next person will only run the code, ask whether adaptation matters. Retain useful existing answers when the interview takes a shorter route.
5. **Review and deliver.** Show the draft to the researcher, especially claims about why a decision was made, who can grant access and which results to trust. Keep confidential details, credentials and private access links out of the file. Write the agreed `HANDOVER.md` beside the project code, or return the complete Markdown as a file or copyable text if you lack file access. If the researcher is unavailable, give them a partial draft and a short list of open questions for later.

## Current questionnaire

Use the IDs to match answers across revisions. The question in bold is the canonical export heading. The hints and examples are writing aids. Sample answers describe a fictional project.

{{ range $chapter := .guide.chapters -}}
### {{ $chapter.title }}

Export section: {{ $chapter.subtitle }}

{{ $chapter.intro }}
{{ with $chapter.scope }}
Scope question: {{ . }} ({{ $chapter.omit }})
{{ end -}}
{{ $quickID := partial "quick-question.html" $chapter -}}
{{ range $id := $chapter.questions -}}
{{ $q := index $.guide.questions $id }}
- `{{ $id }}` **{{ $q.text }}**{{ with $q.tags }} ({{ delimit . ", " }}){{ end }}
{{ if eq $id $quickID }}  - Speedrun: {{ $q.quick | default $q.text }}
{{ end -}}
{{ with $q.help }}  - {{ . }}
{{ end -}}
{{ range $q.references }}  - {{ . }}
{{ end -}}
{{ with $q.example }}  - Example: {{ . }}
{{ end -}}
{{ end }}
{{ end -}}
## Write the file

Use UTF-8 Markdown. Start with the YAML header shown below. Set `handover_version` to {{ .guide.formatVersion }} and `question_order` to a one-line JSON array of answered question IDs in body order. Use each ID once. Use `[]` for a handover with only project details.

After the header, leave a blank line and write `# {{ .guide.documentTitle }}`. Add any known project details below it as single-line paragraphs, in the listed order. Use the exact label, a colon, a space and the value. Leave a blank line between paragraphs.
{{ range .guide.project.fields }}
- `{{ .id }}` uses `{{ .exportLabel }}: …` for {{ .label }}.
{{ end }}
For each answered question, in questionnaire order:

1. Add a blank line, a divider on its own line, then another blank line. Put one divider before **every** answer, including the first.
2. For the first answer in a chapter, write `##` followed by a space and the export section listed above, then a blank line. For every answer, write `###` followed by a space and the canonical question, then a blank line and the answer. Keep Markdown, indentation and line breaks within the answer.
3. Use the same divider throughout. Start with three hyphens and add one until that exact line occurs nowhere in the answers. Omit empty answers and empty chapters. End the file with a newline.

### Worked example

The following fenced block is a complete importable file. Copy its contents without the outer fence.

~~~~markdown
---
handover_version: {{ .guide.formatVersion }}
question_order: {{ .sample.order | jsonify }}
---

# {{ .guide.documentTitle }}{{ with .sample.question }}

---

## {{ $.sample.chapter.subtitle }}

### {{ .text }}

{{ with .example }}{{ replaceRE "(?m)^" "> " . }}{{ else }}[The researcher’s answer goes here.]{{ end }}{{ end }}
~~~~

### Check your handover

With the web form, choose **Upload File**, then select the file or paste its complete contents. Check that each answer appears under the intended question. Opening a file over a saved draft asks for confirmation.

For a local programmatic check, save the [questionnaire]({{ .questions.Permalink }}) as `questionnaire.json` and the [writer and reader]({{ .writer.Permalink }}) as `markdown.mjs`. The module has no dependencies. This Node.js example builds a new file from `answers.json`, a flat object whose string values use `project.<field-id>` and `answer.<question-id>` keys. Include only entries you mean to keep. Read an existing file with `fromMarkdown` first when updating a handover.

```js
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { guideFromQuestionnaire, fromMarkdown, toMarkdown } from "./markdown.mjs";

const readJSON = path => JSON.parse(readFileSync(path, "utf8"));
const guide = guideFromQuestionnaire(readJSON("questionnaire.json"));
const answers = new Map(Object.entries(readJSON("answers.json")));
const source = toMarkdown(guide, answers);
assert.deepEqual(fromMarkdown(guide, source), answers);
writeFileSync("HANDOVER.md", source, { flag: "wx" });
```

The equality check catches omitted or unrecognised keys. The final line creates a new file. For an update, review the edits against the existing handover and save the agreed revision.
