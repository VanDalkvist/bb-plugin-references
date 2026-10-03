---
name: references
description: "Visual references and moodboard panel for BB IDE. Use when asked to collect visual references, UI inspiration, screenshots, or moodboards for the current project. Automatically pops open the visual panel in the BB sidebar."
---

# References & Moodboards in BB IDE

This plugin provides a dedicated visual references panel and moodboard directly in BB IDE's right panel (`project-references`).

## When to use

Use this skill whenever the user asks to:
- «Собери референсы» / «Найди референсы для UI/дизайна»
- «Добавь референс» / «Сохрани в мудборд»
- «Покажи референсы проекта»

## Killer Feature: Automatic Panel Opening

When adding references for the user, ALWAYS include the `--open` flag (or pass `open: true` in the tool) so the references panel pops open automatically in BB IDE on the right side and displays the new visual references in real-time.

## CLI Usage

```bash
# Add a reference from web or local file and automatically open the panel:
bb references add "https://images.unsplash.com/photo-..." --title "Dark Dashboard UI" --tags "ui,dark-mode,dashboard" --open

# Add local generated image with prompt:
bb references add "docs/references/hero.png" --title "Steampunk Tower" --prompt "Tilt-shift macro diorama of miniature steampunk tower" --open

# List project references:
bb references list

# Pin reference to active anchor set ("Камертон" / "На столе"):
bb references pin <id>
bb references unpin <id>

# List only pinned "Камертон" references:
bb references list --pinned

# Filter by tag:
bb references list --tag ui

# Search:
bb references list --search "dashboard"

# Open the panel explicitly:
bb references open

# Output as JSON:
bb references list --json
```

## Agent Tool

The plugin registers native agent tools:
- `references_add({ urlOrPath, title, tags, notes, prompt, pinned, open: true })`
- `references_pin({ id, pinned })` — pin/unpin reference as the project's active aesthetic anchor ("Камертон" / "На столе")
- `references_list({ tag, query })`

### Rule for Generated Images
Whenever generating images with `generate_image`, ALWAYS pass the exact prompt to `references_add({ prompt: "..." })` so the generation prompt provenance is permanently preserved and visible in the card and lightbox with a one-click copy button.

## Inline Chat Previews & Hyperlinks

BB IDE renders interactive inline widgets and clickable hyperlinks for references directly in chat:

### 1. Rich Inline Reference Preview Directive
Emit the directive as its own standalone block (do NOT put it inside backticks or code fences):

```text
::reference{id="c88bd761"}
```

Optional attributes:
- `project="Projects"` — target project
- `url="/path/to/img.png" title="Custom Title"` — preview ad-hoc image directly

### 2. Multi-Reference Mini-Gallery Directive
To display a compact strip of project or tag references inline in chat:

```text
::references{project="Projects"}
::references{tag="ui"}
::references{ids="c88bd761,6e779a60,cfc62fb0"}
```

### 3. Clickable Chat Hyperlinks
Use standard Markdown links in your messages. When clicked, BB instantly opens the References panel in the right sidebar focused on that specific image:

- `[🖼️ Открыть референс: Название](#reference:<reference-id>)`
- `[Посмотреть в панели референсов](bb://references/<reference-id>)`

