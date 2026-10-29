# Example brands

Each folder here is a design system built only through the template intake (`design.md` front matter, `design/core.md`, tokens, logo, themes, and a generated board). The starter at the repository root stays the empty template. Rebuilding an example writes `examples/<brand>/design-build/preview/` and does not touch `design-build/preview/`.

Shared read-only pieces are symlinks back to the root: `components/`, `ui-inventory/`, `KICKSTART.md`, `README.md`, and the check config, inventory, chrome and schemas. Each example has its own `design.md`, `design/`, `tokens/`, `assets/` and `design-build/state.yaml`.

## Switch the board

Starter (this repository):

```sh
node design-build/board.mjs
node design-build/board.mjs --serve --watch
```

The server prints a URL, usually `http://localhost:4173/design-build/preview/`. It serves the whole repository, so an example already on disk is the same origin at `/examples/<brand>/design-build/preview/` after you have built it.

Examples:

```sh
node examples/use.mjs godavari-ferry
node examples/use.mjs godavari-ferry --check
node examples/use.mjs sodium-yard
node examples/use.mjs sodium-yard --check
node examples/use.mjs sodium-yard --serve
```

`--serve` starts a second server whose `/design-build/preview/` is the example, on the next free port if 4173 is taken. Pass `--port` to choose one.

`node examples/use.mjs <brand>` also writes that brand's `design-build/exports/` (DESIGN.md, Tailwind v4 and v3, Tokens Studio and Figma variables). The board badge reads Outputs synced when those files match the tokens. DESIGN.md describes the first theme. For Sodium Yard that is dark.

Presets for both brands are in [`seeds.yaml`](../seeds.yaml) at the repository root.

Godavari Ferry is not a real company. It is the light-first example: night water, red oxide and antique brass, Fraunces and Atkinson Hyperlegible, and a barrage mark of three piers and a waterline. The default theme is light.

Sodium Yard is not a real contractor. It is the dark-first example: sodium, cold steel and filament on a blue-grey yard, Bricolage Grotesque and Public Sans, and a lamp head on a pole. The default theme is dark. Light follows `prefers-color-scheme`.
