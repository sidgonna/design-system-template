// Where things are. Two roots:
//   design-system root  the folder that holds design.md, design/, tokens/ and design-build/. Found from this
//                       file's own location, so the scripts work from any working directory.
//   project root        the app the design system serves. Supported layout: the template copied into a
//                       `design-system/` folder at the app root, with no .git of its own. Detected as the git
//                       top level, else the nearest folder above design-system/ with a package.json; override
//                       with --root <dir>. When the template repo is itself the root (template development
//                       and its own CI), both roots are the same folder and there is no app code.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

export function gitTop(dir) {
  try { return real(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()); } catch { return null; }
}

/** { project, ds, how, warnings[] } */
export function findProject(dsRoot = DS_ROOT, override = null) {
  const ds = real(dsRoot);
  const warnings = [];
  if (override) {
    const project = real(override);
    if (!exists(project)) throw new Error(`--root ${override}: no such folder`);
    if (path.relative(project, ds).startsWith('..')) warnings.push(`--root ${override} does not contain the design system (${ds}); app paths and hints may be wrong`);
    return { project, ds, how: '--root', warnings };
  }
  const top = gitTop(ds);
  if (top && top !== ds) return { project: top, ds, how: 'git', warnings };
  if (top === ds) {
    const parent = path.dirname(ds);
    if (exists(path.join(parent, 'package.json')) && !exists(path.join(ds, 'package.json')))
      warnings.push(`${path.basename(ds)}/ has its own .git, so it is treated as the project and the app in ${parent} is NOT checked. If you copied the template into an app, run: rm -rf ${path.basename(ds)}/.git (or pass --root ${parent})`);
    return { project: ds, ds, how: 'template', warnings };
  }
  for (let d = path.dirname(ds); ; d = path.dirname(d)) {
    if (exists(path.join(d, 'package.json'))) return { project: d, ds, how: 'package.json', warnings };
    if (d === path.dirname(d)) break;
  }
  return { project: ds, ds, how: 'template', warnings };
}

/** Folder of the design system relative to the project root, with a trailing slash ('' when they are the same). */
export const dsPrefix = (p) => { const r = path.relative(p.project, p.ds).split(path.sep).join('/'); return r ? r + '/' : ''; };

/** Rewrite `node design-build/…` and `npm --prefix design-build …` in a hint so it runs from the project root. */
export function fixHint(p, s) {
  const pre = dsPrefix(p);
  if (!pre || typeof s !== 'string') return s;
  return s.replace(/(^|[\s`'"(])((?:node|npx|npm --prefix|npm run --prefix) )?design-build\//g, (m, a, b) => `${a}${b || ''}${pre}design-build/`)
    .replace(/(--prefix )design-build(?=[\s`'"]|$)/g, `$1${pre}design-build`);
}

/** design-build/project.json: per-project settings. Not protected; written in KICKSTART Step 2 with the user's approval. */
export function projectConfig(ds) {
  const file = path.join(ds, 'design-build/project.json');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  return { file, code_dirs: Array.isArray(cfg.code_dirs) ? cfg.code_dirs : null, exclude: Array.isArray(cfg.exclude) ? cfg.exclude : [], app_url: cfg.app_url || null, raw: cfg };
}

export const APP_CODE_DIRS = ['src', 'app', 'pages', 'components', 'styles'];
export const APP_EXCLUDE = ['node_modules', 'dist', 'build', '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.vercel', '.turbo', '.cache', 'out', 'coverage', 'storybook-static', '.git'];

/** App code to lint: { targets: [abs dir or file], how, exclude: [abs] }. Never includes the design system's own folder. */
export function appCodeTargets(p, cfg = projectConfig(p.ds)) {
  if (p.project === p.ds) return { targets: [], how: 'none (the template is the project root)', exclude: [] };
  const exclude = [p.ds, ...cfg.exclude.map((e) => path.resolve(p.project, e))];
  if (cfg.code_dirs) return { targets: cfg.code_dirs.map((d) => path.resolve(p.project, d)).filter(exists), how: `design-build/project.json code_dirs: ${cfg.code_dirs.join(', ') || '(none)'}`, exclude };
  const targets = APP_CODE_DIRS.map((d) => path.join(p.project, d)).filter((d) => exists(d) && fs.statSync(d).isDirectory());
  const shallow = (dir, exts) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && exts.includes(path.extname(e.name).toLowerCase())).map((e) => path.join(dir, e.name)); } catch { return []; } };
  targets.push(...shallow(p.project, ['.html', '.css', '.scss']), ...shallow(path.join(p.project, 'public'), ['.html']));
  return { targets, how: `auto-detected: ${targets.map((t) => path.relative(p.project, t)).join(', ') || '(no app code found)'}`, exclude };
}

/** Is this absolute path app code that lint.mjs checks (inside an app target, not excluded, a code extension)? */
export function isAppCode(p, abs, exts, cfg = projectConfig(p.ds)) {
  const { targets, exclude } = appCodeTargets(p, cfg);
  const inside = (dir) => abs === dir || abs.startsWith(dir + path.sep);
  if (!exts.includes(path.extname(abs).toLowerCase()) || /\.d\.ts$|\.min\.(js|css)$/.test(abs)) return false;
  if (exclude.some(inside)) return false;
  if (path.relative(p.project, abs).split(path.sep).some((s) => APP_EXCLUDE.includes(s))) return false;
  return targets.some(inside);
}
