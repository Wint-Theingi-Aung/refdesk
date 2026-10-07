# Missing Semester 2026 — Beyond Code Exercises

This file contains my notes and reflections for the exercises from the Beyond Code chapter.

Exercises will be documented here as I complete them.

All Beyond Code exercises are kept in this single file rather than split across separate documents.

## Exercise #2 — Commit message quality

**Real commit used**

- Hash: `697749c1bf5a730ef2df5b9b41cdd1779f9a0fbe`
- Original message: `docs: add exercise 6 notes`
- Inspected with: `git show 697749c`

**Why this commit message is weak**

- It only says that Exercise #6 notes were added.
- It does not explain enough context about what was done or why.

**Improved commit message**

```
docs: add Exercise #6 sandbox-work notes

Document what was changed in the isolated sandbox (docs-only change to
docs/exercise-notes.md), what was learned about documentation-only
exercises, and what was intentionally left untouched.
```

**Why the improved message is clearer**

- Names the exercise and the file that changed.
- States that the work was documentation-only and sandbox-scoped.
- Hints at the substance of the notes rather than only the file type.

**What I learned**

- A useful commit message should provide enough context to understand a change later, rather than only describing what changed.
