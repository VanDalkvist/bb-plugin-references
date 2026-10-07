---
name: references
description: "Visual references and moodboard panel for BB IDE. Use when asked to collect visual references, UI inspiration, screenshots, or moodboards for the current project. Renders interactive inline cards in chat and provides a moodboard in BB IDE."
---

# References & Moodboards in BB IDE

This plugin provides a dedicated visual references panel and moodboard directly in BB IDE's right panel (`project-references`) and sidebar.

## When to Use

Use this skill whenever the user asks to:
- "Collect references" / "Find UI/design inspiration"
- "Add reference" / "Save to moodboard"
- "Show project references"
- Multilingual equivalents (e.g. "Собери референсы", "Добавь в мудборд")

## Non-Intrusive Workflow & Chat Directives

When adding references, the items are quietly saved to the project moodboard and rendered cleanly in chat using the `::reference` directive. The user can view the card directly in chat, click to zoom with Lightbox, or open the panel at their own pace without unsolicited popups.

## CLI Usage

```bash
# Add a reference from web or local file:
bb references add "https://images.unsplash.com/photo-..." --title "Dark Dashboard UI" --tags "ui,dark-mode,dashboard"

# Add local generated image with generation prompt:
bb references add "assets/hero.png" --title "Steampunk Tower" --prompt "Tilt-shift macro diorama of miniature steampunk tower"

# List project references:
bb references list

# Pin reference to active anchor set:
bb references pin <id>
bb references unpin <id>

# List only pinned anchor references:
bb references list --pinned

# Filter by tag:
bb references list --tag ui

# Search:
bb references list --search "dashboard"

# Output as JSON:
bb references list --json
```

## Agent Tools

The plugin registers native agent tools:
- `references_add({ urlOrPath, title, tags, notes, prompt, pinned })`
- `references_pin({ id, pinned })` — pin/unpin reference as the project's active aesthetic anchor
- `references_list({ tag, query })`

### Rule for Generated Images
Whenever generating images with `generate_image`, pass the exact prompt to `references_add({ prompt: "..." })` so the generation prompt provenance is permanently preserved and visible in the card and lightbox with a one-click copy button.

## Inline Chat Previews & Hyperlinks

BB IDE renders interactive inline widgets and clickable hyperlinks for references directly in chat:

### 1. Rich Inline Reference Preview Directive
Emit the directive as its own standalone block (do NOT put it inside backticks or code fences):

```text
::reference{id="c88bd761"}
```

Optional attributes:
- `project="my-project"` — target project
- `url="/path/to/img.png" title="Custom Title"` — preview ad-hoc image directly

### 2. Multi-Reference Mini-Gallery Directive
To display a compact strip of project or tag references inline in chat:

```text
::references{project="my-project"}
::references{tag="ui"}
::references{ids="c88bd761,6e779a60,cfc62fb0"}
```

### 3. Clickable Chat Hyperlinks
Use standard Markdown links in your messages. When clicked, BB instantly opens the References panel in the right sidebar focused on that specific image:

- `[🖼️ Open reference: Title](#reference:<reference-id>)`
- `[View in References panel](bb://references/<reference-id>)`
