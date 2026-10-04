# bb-plugin-references

Панель визуальных референсов и мудбордов проекта в BB IDE с автоматическим открытием агентом.

## Главные возможности

- 🖼️ **Визуальный мудборд в правой панели треда:** Вкладка `References` (`app.slots.threadPanelAction`) с адаптивной сеткой карточек (Grid/Masonry), превью, тегами и заметками.
- ⚡ **Автоматическое открытие агентом («Килер-фича»):** Когда AI-агент собирает референсы (`bb references add ... --open`), панель референсов открывается автоматически в окне BB IDE без единого клика.
- 📁 **Проектная изоляция (Per-Project):** Референсы привязаны к конкретному `projectId` и хранятся в `~/.bb/references/<projectId>.json`.
- 🔒 **Поддержка любых источников:** Веб-ссылки (`https://...`, Dribbble, Unsplash, Figma) и локальные файлы проекта (`docs/references/*.png`), безопасно отдаваемые через локальный HTTP-эндпоинт плагина с защитой от path traversal.
- 🔍 **Фильтрация и поиск:** Быстрый текстовый поиск по названию, тегам и заметкам, а также фильтрация кликом по чипсам тегов.
- 🔎 **Lightbox / Zoom:** Увеличение картинки на весь экран с масштабированием (50%–300%), просмотром заметок и копированием путей.
- 🛠️ **CLI и Agent Tool:** Поддержка CLI `bb references ...` и нативных тулов для агентов `references_add` и `references_list`.

## Установка

```bash
cd ~/Projects/bb-plugin-references
bb plugin install .
```

## Использование CLI

```bash
# Добавить референс и автоматически открыть панель в BB IDE:
bb references add "https://images.unsplash.com/photo-..." --title "Dark Dashboard UI" --tags "ui,dark-mode,dashboard" --open

# Добавить локальный файл из проекта:
bb references add "docs/references/hero.png" --title "Hero Section" --tags "landing,hero" --open

# Список референсов проекта:
bb references list

# Фильтрация по тегу:
bb references list --tag ui

# Поиск по названию/заметкам:
bb references list --search "dashboard"

# Открыть панель референсов вручную:
bb references open

# Удалить референс:
bb references remove <id>

# Список тегов проекта:
bb references tags
```

## Для AI-агентов

Плагин регистрирует скилл `skills/references/SKILL.md` и нативные инструменты:
- `references_add({ urlOrPath, title, tags, notes, open: true })`
- `references_list({ tag, query })`

Когда пользователь просит: *«Собери референсы для экрана авторизации»*, агент собирает ссылки/картинки и вызывает `bb references add ... --open`. Пользователь сразу видит результат прямо в боковой панели.

## Тестирование и Сборка

```bash
# Запуск unit & e2e тестов:
npm test

# Сборка плагина:
npm run build
```
