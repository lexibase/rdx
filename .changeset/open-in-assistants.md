---
'@lexibase/rdx': minor
'@lexibase/rdx-ui': minor
'@lexibase/rdx-next': minor
'@lexibase/create-rdx': patch
---

Add **Open in Claude** and **Open in ChatGPT** to the **Copy this page** menu.

- Each link opens a new chat with a ready prompt that points to the page's
  Markdown export and to `/llms.txt`. The reader sends the prompt.
- The prompt is an interface text, so `_labels.json` can translate it.
- `CopyPage` accepts optional `project` and `indexHref` props.
