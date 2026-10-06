# Exercise notes

Short notes on the refdesk meta-work and code-quality exercises.

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
