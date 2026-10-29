#!/usr/bin/env node
// Rebuild or check one example brand without touching the starter board.
//   node examples/use.mjs godavari-ferry            write that brand's preview
//   node examples/use.mjs godavari-ferry --check    lint, ramps, tokens, exports and board, exit 1 if stale
//   node examples/use.mjs godavari-ferry --serve    live board for that brand (its own port)
//
// The starter stays on `node design-build/board.mjs`. With the starter server
// already running, the example is the same origin at
// /examples/<brand>/design-build/preview/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rampOutputs } from '../design-build/ramps.mjs';
import { generate } from '../design-build/tokens-css.mjs';
import { build, staleFiles, liveRebuild } from '../design-build/board.mjs';
import { writeOutputs, exportSync, designMdErrors } from '../design-build/lib/designmd.mjs';
import { lint, format } from '../design-build/lint.mjs';
import { startLive } from '../design-build/lib/live.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function brandRoot(id) {
  if (!id || id.startsWith('-')) {
    console.error('Usage: node examples/use.mjs <brand> [--check | --serve] [--port N]');
    process.exit(2);
  }
  const root = path.join(repo, 'examples', id);
  if (!fs.existsSync(path.join(root, 'design.md'))) {
    console.error(`No example at examples/${id}/ (expected a design.md).`);
    process.exit(1);
  }
  return root;
}

function writeGenerated(root) {
  const outs = rampOutputs(root);
  let ramps = 0;
  for (const o of outs) {
    if (!fs.existsSync(o.abs) || fs.readFileSync(o.abs, 'utf8') !== o.text) {
      fs.mkdirSync(path.dirname(o.abs), { recursive: true });
      fs.writeFileSync(o.abs, o.text);
      ramps++;
    }
  }
  const dir = path.join(root, 'design-build/preview');
  fs.mkdirSync(dir, { recursive: true });
  const gen = generate(root);
  for (const [name, text] of [['tokens.css', gen.css], ['tokens.js', gen.js], ['tokens.mjs', gen.mjs]]) {
    fs.writeFileSync(path.join(dir, name), text);
  }
  writeOutputs(root);
  const b = build(root);
  fs.writeFileSync(path.join(dir, 'index.html'), b.html);
  fs.writeFileSync(path.join(dir, 'board.json'), b.json);
  fs.writeFileSync(path.join(dir, 'board.md'), b.md);
  fs.writeFileSync(path.join(dir, 'chrome.css'), b.css);
  return { ramps, logoProblems: b.model.logo.problems, coverage: b.model.coverage };
}

function check(root, id) {
  const outs = rampOutputs(root);
  const rampStale = outs.filter((o) => !fs.existsSync(o.abs) || fs.readFileSync(o.abs, 'utf8') !== o.text);
  const gen = generate(root);
  const dir = path.join(root, 'design-build/preview');
  const tokenStale = [['tokens.css', gen.css], ['tokens.js', gen.js], ['tokens.mjs', gen.mjs]]
    .filter(([name, text]) => !fs.existsSync(path.join(dir, name)) || fs.readFileSync(path.join(dir, name), 'utf8') !== text)
    .map(([name]) => `design-build/preview/${name}`);
  const sync = exportSync(root);
  const mdErr = designMdErrors(sync.generated.find(([name]) => name.endsWith('DESIGN.md'))[1]);
  const boardStale = staleFiles(root);
  const res = lint({ root });
  const text = format(res);
  if (text) console.log(text);
  const failed = rampStale.length || tokenStale.length || !sync.ok || mdErr.length || boardStale.length || res.findings.some((f) => f.severity === 'error');
  if (rampStale.length) console.error(`ramps out of date: ${rampStale.map((o) => o.rel).join(', ')}`);
  if (tokenStale.length) console.error(`tokens out of date: ${tokenStale.join(', ')}`);
  if (!sync.ok) console.error(`exports out of date: ${sync.stale.join(', ')}`);
  for (const e of mdErr) console.error(`DESIGN.md ${e.rule}: ${e.message}`);
  if (boardStale.length) console.error(`board out of date: ${boardStale.join(', ')}`);
  if (!failed) console.log(`examples/${id}: lint ${res.findings.filter((f) => f.severity === 'error').length} errors, ramps, tokens, exports and board up to date`);
  process.exit(failed ? 1 : 0);
}

const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith('-'));
const root = brandRoot(id);
if (argv.includes('--check')) check(root, id);
else if (argv.includes('--serve')) {
  const portFlag = argv.indexOf('--port');
  const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : 4173;
  writeGenerated(root);
  const live = await startLive(root, { port, watch: !argv.includes('--no-watch'), poll: argv.includes('--poll'), rebuild: liveRebuild, log: (m) => console.log(m) });
  console.log(`\n  ${id} board:  ${live.url}design-build/preview/\n`);
  console.log('  This server is the example. The starter board is a different folder: node design-build/board.mjs --serve\n');
  const stop = () => { live.close().then(() => process.exit(0)); setTimeout(() => process.exit(0), 1500).unref(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} else {
  const w = writeGenerated(root);
  const c = w.coverage;
  console.log(`wrote examples/${id}/design-build/preview/ (${Math.floor(c.placeholders.completion * 100)}% filled, ${c.placeholders.remaining} placeholders left${w.ramps ? `, ramps rewritten` : ''})`);
  for (const p of w.logoProblems) console.error('logo: ' + p);
  if (w.logoProblems.length) process.exit(1);
}
