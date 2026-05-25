#!/usr/bin/env node
// One-shot nav dropdown sweep: adds Richmond/Victoria/Danevang links to the
// Areas-We-Serve dropdown across every page that still has the old version.
// Idempotent — re-running on already-updated pages is a no-op.

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const ROOT = __dirname;

const PATCHES = [
  {
    name: 'Fort Bend submenu: insert Richmond',
    find: '<a href="areas-orchard.html">Orchard</a><a href="areas-rosenberg.html">Rosenberg</a>',
    replace: '<a href="areas-orchard.html">Orchard</a><a href="areas-richmond.html">Richmond</a><a href="areas-rosenberg.html">Rosenberg</a>',
  },
  {
    name: 'Wharton submenu: insert Danevang',
    find: '<div class="dropdown-submenu"><a href="areas-boling.html">Boling</a><a href="areas-east-bernard.html">East Bernard</a>',
    replace: '<div class="dropdown-submenu"><a href="areas-boling.html">Boling</a><a href="areas-danevang.html">Danevang</a><a href="areas-east-bernard.html">East Bernard</a>',
  },
  {
    name: 'Victoria County submenu: add Victoria',
    find: '<div class="dropdown-county-item"><a href="areas-victoria-county.html" class="dropdown-county-link">Victoria County</a></div>',
    replace: '<div class="dropdown-county-item"><a href="areas-victoria-county.html" class="dropdown-county-link">Victoria County</a><div class="dropdown-submenu"><a href="areas-victoria.html">Victoria</a></div></div>',
  },
];

function main() {
  const files = fs.readdirSync(ROOT).filter(f => /\.html$/.test(f));
  const report = [];

  for (const file of files) {
    const filePath = path.join(ROOT, file);
    const before = fs.readFileSync(filePath, 'utf8');
    let after = before;
    const applied = [];

    for (const p of PATCHES) {
      if (after.includes(p.find)) {
        after = after.split(p.find).join(p.replace);
        applied.push(p.name);
      }
    }

    if (before !== after) {
      if (!DRY) fs.writeFileSync(filePath, after, 'utf8');
      report.push({ file, applied });
    }
  }

  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Files scanned: ${files.length}`);
  console.log(`Files patched: ${report.length}\n`);
  for (const r of report) {
    console.log(` ✱ ${r.file.padEnd(42)} (${r.applied.length} patch${r.applied.length === 1 ? '' : 'es'})`);
  }
  if (DRY) console.log('\nDry run only. Re-run without --dry-run to write changes.');
}

main();
