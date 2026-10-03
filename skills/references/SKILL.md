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

# Add local project image:
bb references add "docs/references/hero.png" --title "Hero Section" --tags "landing,hero" --open

# List project references:
bb references list

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
- `references_add({ urlOrPath, title, tags, notes, open: true })`
- `references_list({ tag, query })`
