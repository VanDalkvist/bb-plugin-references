# bb-plugin-references

Visual references and moodboard panel for BB IDE projects.

## Features

- 🖼️ **Visual Moodboard in Thread Panel:** Dedicated `References` panel (`app.slots.threadPanelAction`) with responsive grid, OpenGraph link cards, tags, and design notes.
- 💬 **Inline Chat Directives:** Render interactive reference previews (`::reference{id="..."}`) and mini-galleries directly within chat messages without forcing panel popups.
- 📁 **Per-Project Isolation:** References are scoped to the active project (`projectId`) with a global all-projects overview.
- 🔒 **Any Source Supported:** Seamlessly handles web URLs (Figma, Dribbble, Unsplash, repositories) and local project images, served securely via an authenticated plugin HTTP endpoint with path-traversal protection.
- 📌 **Aesthetic Anchors:** Pin key stylistic references to the working set so they stay visible at the top of the feed and can be filtered in one click.
- 🔍 **Search & Tag Filtering:** Instant search across titles, domains, notes, and tags with interactive filter chips.
- 🔎 **Full-Screen Lightbox:** Detailed inspection with zoom (50%–300%), prompt provenance display, and one-click copy.
- 🛠️ **CLI and Agent Tools:** Native CLI commands (`bb references ...`) and tools (`references_add`, `references_list`, `references_pin`).

## Installation

```bash
bb plugin install github:VanDalkvist/bb-plugin-references
```

Or clone locally and install:

```bash
git clone https://github.com/VanDalkvist/bb-plugin-references.git
cd bb-plugin-references
bb plugin install .
```

## CLI Usage

```bash
# Add a web reference:
bb references add "https://images.unsplash.com/photo-..." --title "Dark Dashboard UI" --tags "ui,dark-mode,dashboard"

# Add a local image file:
bb references add "assets/hero.png" --title "Hero Section" --tags "landing,hero"

# List project references:
bb references list

# Pin a reference as active aesthetic anchor:
bb references pin <id>

# List only pinned anchor references:
bb references list --pinned

# Filter references by tag:
bb references list --tag ui

# Search by title, domain, or notes:
bb references list --search "dashboard"

# Open the panel explicitly:
bb references open

# Remove a reference:
bb references remove <id>

# List project tags with counts:
bb references tags
```

## For AI Agents

The plugin registers the `skills/references/SKILL.md` skill and native tools:
- `references_add({ urlOrPath, title, tags, notes, prompt, pinned })`
- `references_pin({ id, pinned })`
- `references_list({ tag, query })`

When the user asks: *"Find inspiration for the login screen"*, the agent collects links or local images and invokes `references_add` with `open: true`. The user instantly sees the gallery open on the right side of the thread.

## Development & Testing

```bash
# Run unit and integration tests:
npm test

# Build the plugin:
npm run build
```
