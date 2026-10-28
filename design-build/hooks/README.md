# Hooks

Commands below are for the supported layout: the template copied into `design-system/` at your app's root (README → Quick start). Run them from the app root. In the template repo itself, drop the `design-system/` prefix.

## Git pre-commit hook (install once per clone)

```sh
node design-system/design-build/install-hooks.mjs
```

This writes `.git/hooks/pre-commit` (or into `core.hooksPath` if you set one). The hook runs `hooks/pre-commit.mjs`, which:

1. regenerates `preview/tokens.css`, `tokens.js` and `tokens.mjs` when `tokens/tokens.json` is staged, and stages them.
2. runs `lint.mjs` on the design files **and the app code** (`src/`, `app/`, `pages/`, `components/`, `styles/`, top-level `*.html`/`*.css`, `public/*.html`, or `code_dirs` in `design-build/project.json`). A hard-coded color in app code blocks the commit. If the user approved a baseline (`lint.mjs --baseline`), the commit is blocked only when a rule's count goes up.
3. runs `render.mjs` + axe when something visual is staged: the design preview when design files changed, and the app's dev server (`app_url` in `project.json`) when app code changed and the server is running. If the server is not running it warns and skips; Phase 6 still needs a render on the dev URL (design.md §16).

If `design-system/` is deleted or moved, the hook fails loudly instead of passing silently. If a `pre-commit` hook already exists (husky, lefthook, your own), the installer leaves it alone and prints the one line to add to it.

## Agent hooks (optional)

These run `lint.mjs` right after an AI agent edits a design file or app code. The findings go back to the agent, so it fixes them in the same turn instead of at commit time. They are examples. Nothing here is switched on until you copy it in.

| Agent | Copy this | To | What the agent sees |
|---|---|---|---|
| Claude Code | `claude-settings.example.json` | `.claude/settings.json` at the app root (merge the `hooks` key if the file exists) | a `PostToolUse` hook on `Edit\|Write\|MultiEdit`. If lint finds errors, it exits 2 and Claude reads the list on stderr. |
| Cursor | `cursor-hooks.example.json` | `.cursor/hooks.json` at the app root (merge into `hooks`) | a `postToolUse` hook on `Write`. If lint finds errors, the list comes back as `additional_context`. |

The examples use `design-system/design-build/hooks/after-edit.mjs`. In the template repo itself, use `design-build/hooks/after-edit.mjs`.

Both call `after-edit.mjs`. It:

- reads the hook's JSON on stdin and does nothing unless the edited file is one the lint covers (the design docs, `tokens/tokens.json`, `inventory.json`, `project.json`, the design system's pages, or app code).
- regenerates `preview/tokens.css`, `tokens.js` and `tokens.mjs` when `tokens.json` changed.
- lists up to 15 errors, starting with the ones in the edited file. Each one comes with its fix. With a baseline, it lists the rules over the baseline plus the errors in the edited file.

Render + axe take about 10 seconds, so they don't run on every edit. They run in the pre-commit hook and in CI (`design-build/ci/app-design-checks.example.yml` for your app, `.github/workflows/design-checks.yml` for the template).

Test it by hand from the app root:

```sh
echo '{"tool_input":{"file_path":"src/App.css"}}' | node design-system/design-build/hooks/after-edit.mjs --format claude; echo "exit $?"
```

These hook files are protected (design.md §0.5). An agent must not edit, remove or disable them, or commit with `--no-verify`, to get a pass.
