# Missing Semester 2026 — Agentic Coding Exercises

This file contains my notes and reflections for the exercises from the Agentic Coding chapter.

## Exercise #1 — Four Ways of Coding

**What was done**

- Compared four ways of working on software: manual coding, pair programming with a coding agent, agent-driven implementation, and fully autonomous agent workflows.
- For each way, noted what the human still owns (intent, review, product decisions) versus what the agent can take on (boilerplate, refactors, multi-file edits).
- Used the comparison to decide when to stay hands-on and when to let an agent drive the edit loop.

**What was learned**

- The four ways are modes on a spectrum, not a single right answer; the best fit depends on task size, risk, and how well the codebase is documented.
- Clear instructions and review matter more as autonomy increases — vague prompts produce worse results when the agent writes most of the code.
- Human judgment is still required for architecture, data safety, and anything that touches live systems.

## Exercise #2 — Explore an Unfamiliar Codebase

**What was done**

- Used a coding agent to explore an unfamiliar codebase before changing anything.
- Asked for the stack, entry points, directory layout, and how data flows from UI to storage.
- Spot-checked agent findings against real files instead of accepting the summary at face value.

**What was learned**

- Exploration prompts work best when scoped: one question at a time (schema, storage, routes) rather than “explain the whole repo.”
- Agent summaries are a map, not the territory — verify key claims in the source before acting.
- A short written map of paths and responsibilities makes later feature work faster and safer.

## Exercise #3 — Vibe Coding

**Why refdesk**

- Chose to build refdesk as a practical personal resource manager for storing and organizing links and resources such as PDF, Excel, PPTX, DOCX, and images.

**How it was built**

- Built refdesk from scratch using vibe coding with a coding agent, without manually writing the application code, as required by the exercise.

## Exercise #4 — Agent / skill setup

**What was done**

- Added project-facing instructions in `CLAUDE.md` (stack, architecture, conventions, env, definition of done).
- Added `AGENTS.md` as the agent-oriented summary: hard constraints, dispatch guidance, and quality bar; it links to `CLAUDE.md` instead of fully duplicating it.
- Set up `.claude/agents/` (`resource-schema`, `resource-ui`, `storage-layer`, `resource-reviewer`) and `.claude/skills/` (`add-resource-type`, `refdesk-database`, `refdesk-storage`).
- Scoped that meta-work explicitly: do not expand Exercise #4 further unless asked.

**What was learned**

- Keep **full** instructions in `CLAUDE.md` and a **short** agent summary in `AGENTS.md`, with a clear pointer between them.
- Dispatch agents by task type (schema vs UI vs storage vs review) rather than one general helper.
- Meta-setup is useful, but it must not grow into unrelated features; feature work stays in the app code paths.
- `AGENTS.md` “out of scope” list is the place to park “do not implement unprompted” rules so agents do not invent auth, AI, sharing, etc.

## Exercise #5 — Markdown bullet transformation

**Goal**

In `AGENTS.md`, change Markdown unordered-list markers from `-` to `*` **only at the beginning of lines**. Do not touch hyphens in prose, URLs, code blocks, or command options.

**Attempt 1 — direct file editing**

- Rewrote `AGENTS.md` with the normal Write tool, converting line-leading `- ` to `* `.
- The change was possible, but it was a full-file rewrite rather than a pattern applied once.
- **Undone** with `git checkout -- AGENTS.md` so the same task could be redone with a CLI regex.

**Why direct editing was undone**

- No single mechanical rule; every list line had to be handled by hand.
- Easy to miss a marker or accidentally rewrite unrelated hyphens (`shadcn-style`, `db:push`, `hard-coded`).
- Harder to re-run, audit, or prove “only line-start markers changed.”
- Final CLI method is shorter and reviewable as a one-line command in the diff story.

**Final CLI method (Perl)**

Command used after the undo:

```bash
perl -i -pe 's/^-/*/' /home/ycdc/refdesk/AGENTS.md
```

| Piece | Role |
|-------|------|
| `perl -i -pe` | In-place edit, print each line |
| `s/^-/*/` | Replace only a leading `-` with `*` |

`sed` was not the final method. An intermediate `perl` form that also touched surrounding whitespace was abandoned in favor of `s/^-/*/`.

**Verification**

- `git diff AGENTS.md` showed only line-leading marker changes (`- …` → `* …`).
- Mid-line hyphens, tables, the `ActionResult` code block, numbered list items, and trailing spaces were unchanged.
- `CLAUDE.md` and other project files were not modified for this exercise.

**Limitations of direct editing**

1. Scales poorly — no pattern, only content.
2. Error-prone for repetitive marker changes across many lines.
3. Weak guarantee that only intended hyphens changed.
4. Not reproducible as a single auditable command.
5. Easy to over-edit spacing or unrelated hyphens when rewriting a whole file.

Direct editing is fine for small, human-verified edits. For marker normalization, a line-anchored regex (`perl`/`sed`) is safer and repeatable.

## Exercise #6 — Autonomous sandbox work

**What was done**

- Worked in the isolated sandbox on this repository.
- Inspected the project, then made one small, harmless documentation-only change: this short “Exercise #6” note in `docs/exercise-notes.md`.
- No source code, schema, `.env`, dependencies, or files outside the repo were modified.

**What was learned**

- Documentation-only exercises can be completed quickly once the existing notes format is matched.
- Scoping the task to a single file keeps the change easy to review with `git diff`.
