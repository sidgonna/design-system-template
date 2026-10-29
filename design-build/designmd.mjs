#!/usr/bin/env node
// DESIGN.md, Tailwind and Figma outputs from tokens_file. Zero dependencies.
//   node design-build/designmd.mjs                         write design-build/exports/*
//   node design-build/designmd.mjs --check                 exit 1 if any output is stale, or DESIGN.md has Google lint errors
//   node design-build/designmd.mjs lint [file] [--format json]
//   node design-build/designmd.mjs import <file> [--out <tokens.json>]
// Warnings do not fail the command. A missing file or a bad flag exits 2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTPUT_RELS, outputFiles, lintDesignMd, importDesignMd, designMdErrors } from './lib/designmd.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(process.cwd(), p).split(path.sep).join('/') || p;

function summary(findings) {
  return {
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    infos: findings.filter((f) => f.severity === 'info').length,
  };
}

function printLint(findings, json) {
  const sum = summary(findings);
  if (json) {
    process.stdout.write(`${JSON.stringify({ findings, summary: sum }, null, 2)}\n`);
    return sum;
  }
  for (const f of findings) {
    const where = f.path ? ` ${f.path}` : '';
    console.log(`${f.severity} ${f.rule}${where}: ${f.message}`);
  }
  console.log(`${sum.errors} error(s), ${sum.warnings} warning(s), ${sum.infos} info`);
  return sum;
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  argv.splice(i, value !== undefined && !value.startsWith('-') ? 2 : 1);
  return value === undefined || value.startsWith('-') ? true : value;
}

const argv = process.argv.slice(2);
const json = flag(argv, '--format') === 'json' || argv.includes('--json');
const check = argv.includes('--check');
const cmd = argv.find((a) => !a.startsWith('-'));

if (cmd === 'lint') {
  const fileArg = argv.filter((a) => a !== 'lint' && !a.startsWith('-'))[0];
  const file = fileArg ? path.resolve(fileArg) : path.join(root, OUTPUT_RELS[0]);
  if (!fs.existsSync(file)) {
    console.error(`no such file: ${rel(file)}`);
    process.exit(2);
  }
  const sum = printLint(lintDesignMd(fs.readFileSync(file, 'utf8')).findings, json);
  process.exit(sum.errors ? 1 : 0);
}

if (cmd === 'import') {
  const fileArg = argv.filter((a) => a !== 'import' && !a.startsWith('-'))[0];
  const out = flag(argv, '--out');
  if (!fileArg || out === true) {
    console.error('Usage: node design-build/designmd.mjs import <file> [--out <tokens.json>]');
    process.exit(2);
  }
  const abs = path.resolve(fileArg);
  if (!fs.existsSync(abs)) {
    console.error(`no such file: ${rel(abs)}`);
    process.exit(2);
  }
  const imported = importDesignMd(fs.readFileSync(abs, 'utf8'));
  const text = imported.text.endsWith('\n') ? imported.text : `${imported.text}\n`;
  if (typeof out === 'string') {
    const dest = path.resolve(out);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text);
    console.log(`wrote ${rel(dest)} (${imported.kind})`);
  } else process.stdout.write(text);
  const errs = (imported.parsed?.findings || []).filter((f) => f.severity === 'error');
  process.exit(imported.kind === 'google' && errs.length ? 1 : 0);
}

if (cmd && cmd !== '--check') {
  console.error('Usage: node design-build/designmd.mjs [--check] | lint [file] [--format json] | import <file> [--out <tokens.json>]');
  process.exit(2);
}

let files;
try { files = outputFiles(root); }
catch (e) {
  console.error(`could not generate exports: ${e.message}`);
  process.exit(1);
}
const md = files.find(([name]) => name.endsWith('DESIGN.md'))[1];
const mdErrs = designMdErrors(md);
const stale = [];
for (const [name, text] of files) {
  const abs = path.join(root, name);
  if (!fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== text) stale.push(name);
}
if (check) {
  if (stale.length) console.error(`out of date: ${stale.join(', ')}; fix: node design-build/designmd.mjs`);
  for (const e of mdErrs) console.error(`DESIGN.md ${e.rule}: ${e.message}`);
  if (stale.length || mdErrs.length) process.exit(1);
  console.log('exports are up to date (DESIGN.md, Tailwind v4, Tailwind v3, Tokens Studio, Figma variables)');
  process.exit(0);
}
if (mdErrs.length) {
  for (const e of mdErrs) console.error(`DESIGN.md ${e.rule}: ${e.message}`);
  process.exit(1);
}
for (const [name, text] of files) {
  const abs = path.join(root, name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
  console.log(`wrote ${name}`);
}
