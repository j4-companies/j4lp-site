#!/usr/bin/env node
// Adds the rural property intake to the Selling navigation across static pages.
// Idempotent: pages that already contain the link are left unchanged.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const desktopBefore = '<li><a href="/selling">Selling</a></li>';
const desktopAfter = '<li class="dropdown"><a href="/selling">Selling</a><div class="dropdown-menu"><a href="/selling">Seller Services</a><a href="/property-intake/">Property Intake &amp; Valuation Request</a></div></li>';
const mobileBefore = '<a href="/selling">Selling</a>';
const mobileAfter = '<a href="/selling">Selling</a>\n    <a href="/property-intake/">Property Intake &amp; Valuation Request</a>';
let changed = 0;

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'property-intake' && entry.name !== 'resources') return htmlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

for (const filePath of htmlFiles(root)) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before.replace(desktopBefore, desktopAfter);
  after = after.replace(/(<div class="mobile-links">[\s\S]*?)<a href="\/selling">Selling<\/a>(?![\s\S]*?<a href="\/property-intake\/">Property Intake &amp; Valuation Request<\/a>[\s\S]*?<\/div>)/, `$1${mobileAfter}`);
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    changed += 1;
  }
}

console.log(`Added the property-intake navigation link to ${changed} HTML files.`);
