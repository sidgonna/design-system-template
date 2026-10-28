// Terrazzo config for `npm run tokens:check` (validates tokens/tokens.json against the DTCG format).
// Protected file (design.md §0.5): do not loosen these rules without the user's approval.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@terrazzo/cli';
import { loadContext } from './lib/context.mjs';

// The themes come from design.md front matter `themes:` (core.md §4.4), the same list lint.mjs checks.
// With one theme there is no second mode to require; lint's `themes` rule still checks the modes match the list.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { themes } = loadContext(root);

export default defineConfig({
  tokens: ['../tokens/tokens.json'],
  outDir: './.terrazzo/',
  plugins: [],
  lint: {
    rules: {
      // Every themed color role must define every theme, so no theme is ever half-done.
      ...(themes.length > 1 ? {
        'core/required-modes': ['error', {
          matches: [{ match: ['color.brand.*', 'color.accent', 'color.surface.*', 'color.text.*', 'color.semantic.*', 'color.focus', 'color.on.*', 'color.container.*', 'color.on-container.*', 'color.border.*'], modes: themes }],
        }],
      } : {}),
      'core/consistent-naming': ['error', { format: 'kebab-case' }],
      // WCAG 2 contrast for the §4 pairings is checked by lint.mjs in every theme and brand
      // (Terrazzo's a11y/min-contrast reads $value only, i.e. the default theme).
    },
  },
});
