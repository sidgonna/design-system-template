# Agent hooks (optional)

These run `lint.mjs` right after an AI agent edits a design file. The findings go back to the agent, so it fixes them in the same turn instead of at commit time. They are examples. Nothing here is switched on until you copy it in.

| Agent | Copy this | To | What the agent sees |
|---|---|---|---|
| Claude Code | `claude-settings.example.json` | `.claude/settings.json` (merge the `hooks` key if the file exists) | a `PostToolUse` hook on `Edit\|Write\|MultiEdit`. If lint finds errors, it exits 2 and Claude reads the list on stderr. |
| Cursor | `cursor-hooks.example.json` | `.cursor/hooks.json` (merge into `hooks`) | a `postToolUse` hook on `Write`. If lint finds errors, the list comes back as `additional_context`. |

Both call `after-edit.mjs`. It:

- reads the hook's JSON on stdin and does nothing unless the edited file is one the lint covers (the design docs, `tokens/tokens.json`, `inventory.json`, or code in `code_dirs`).
- regenerates `preview/tokens.css` and `tokens.js` when `tokens.json` changed.
- lists up to 15 errors, starting with the ones in the edited file. Each one comes with its fix.

Render + axe take about 10 seconds, so they don't run on every edit. They run in `.githooks/pre-commit` (enable it with `git config core.hooksPath .githooks`) and in CI (`design-build/ci/design-checks.yml`, once it is moved into `.github/workflows/`).

Test it by hand:

```sh
echo '{"tool_input":{"file_path":"design-build/preview/preview.css"}}' | node design-build/hooks/after-edit.mjs --format claude; echo "exit $?"
```

These hook files are protected (design.md §0.5). An agent must not edit or disable them to get a pass.
