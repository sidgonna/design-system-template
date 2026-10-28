// Terrazzo config for `npm run tokens:check` (validates tokens/tokens.json against the DTCG format).
// Protected file (design.md §0.5): do not loosen these rules without the user's approval.
import { defineConfig } from '@terrazzo/cli';

export default defineConfig({
  tokens: ['../tokens/tokens.json'],
  outDir: './.terrazzo/',
  plugins: [],
  lint: {
    rules: {
      // Every themed color must define both modes, so dark mode is never half-done.
      'core/required-modes': ['error', {
        matches: [{ match: ['color.brand.*', 'color.accent', 'color.surface.*', 'color.text.*', 'color.semantic.*', 'color.focus'], modes: ['light', 'dark'] }],
      }],
      'core/consistent-naming': ['error', { format: 'kebab-case' }],
      // WCAG 2 contrast for the §4 pairings is checked by lint.mjs in light AND dark mode
      // (Terrazzo's a11y/min-contrast reads $value only, i.e. light mode).
    },
  },
});
