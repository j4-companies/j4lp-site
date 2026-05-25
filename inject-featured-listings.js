#!/usr/bin/env node
// Injects/updates featured-listing strips on every areas-*.html page based on listings.json.
// Idempotent: replaces content between <!-- AUTO-LISTINGS:START --> and <!-- AUTO-LISTINGS:END -->.
// On first run for a page, also strips any pre-existing manual featured-listing section.
//
// Usage:
//   node inject-featured-listings.js            # apply changes
//   node inject-featured-listings.js --dry-run  # print plan, do not write

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const ROOT = __dirname;
const MARK_START = '<!-- AUTO-LISTINGS:START -->';
const MARK_END = '<!-- AUTO-LISTINGS:END -->';

function slug(s) {
  return String(s).toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fmtAcres(a) {
  if (a == null) return '';
  const n = Number(a);
  if (!isFinite(n) || n === 0) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function priceLine(l) {
  if (l.priceContact || !l.price) return 'Pricing on request';
  return l.priceDisplay || `$${Number(l.price).toLocaleString('en-US')}`;
}

function buildStrip(l) {
  const acreage = fmtAcres(l.acreage);
  const acresPart = acreage ? ` — ${acreage}± acres` : '';
  const status = (l.status || '').toLowerCase();
  const statusBadge = status === 'contract' ? ' · Under Contract' : '';
  const label = `J4LP Featured Listing · ${l.county || l.city}${statusBadge}`;
  const tagline = (l.tagline || l.description || '').replace(/\s+/g, ' ').trim();
  const tagShort = tagline.length > 260 ? tagline.slice(0, 257).replace(/[\s,]+\S*$/, '') + '...' : tagline;
  const href = `properties/${l.slug}.html`;
  return `  <div style="background:var(--maroon); color:var(--white); padding:32px 40px; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; margin-top:16px;">
    <div>
      <span style="font-size:10px; font-weight:700; letter-spacing:0.25em; text-transform:uppercase; color:rgba(255,255,255,0.7); margin-bottom:6px; display:block;">${escapeHtml(label)}</span>
      <h3 class="arvo" style="font-family:'Arvo',serif; font-size:22px; color:var(--white); margin-bottom:6px;">${escapeHtml(l.name)}${escapeHtml(acresPart)}</h3>
      <p style="font-size:13px; color:rgba(255,255,255,0.85); max-width:600px; line-height:1.7; margin:0;">${escapeHtml(tagShort)}</p>
      <p style="font-size:12px; color:rgba(255,255,255,0.6); margin-top:8px; letter-spacing:0.05em;">${escapeHtml(priceLine(l))}${l.address ? ' · ' + escapeHtml(l.address) : ''}</p>
    </div>
    <a href="${href}" style="display:inline-block; background:var(--white); color:var(--maroon); font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; padding:14px 28px; flex-shrink:0;">View ${escapeHtml(l.name)}</a>
  </div>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBlock(listings, pageLabel) {
  if (!listings.length) {
    return `${MARK_START}\n<!-- No active listings match ${pageLabel}. Auto-generated, do not edit by hand. -->\n${MARK_END}`;
  }
  const header = `<!-- FEATURED LISTINGS · auto-generated from listings.json by inject-featured-listings.js — do not edit by hand -->
<section style="background:var(--white); padding:48px 80px 0;">
  <div class="section-label">J4LP On the Market${listings.length > 1 ? ' Now' : ''}</div>
  <h2 class="arvo" style="font-family:'Arvo',serif; font-size:clamp(22px,2.5vw,30px); color:var(--black); margin-bottom:8px;">${listings.length === 1 ? "Listed by J4LP in this area." : `${listings.length} J4LP listings in this area.`}</h2>
  <p style="font-family:'Lora',serif; font-style:italic; font-size:15px; color:var(--dark-gray); max-width:620px; margin-bottom:16px;">Active and under-contract J4 Legacy Properties listings tied to this area.</p>`;
  const strips = listings.map(buildStrip).join('\n');
  const footer = `\n</section>`;
  return `${MARK_START}\n${header}\n${strips}${footer}\n${MARK_END}`;
}

// Find a single existing manual featured-listing section to remove on first run.
// Matches `<!-- FEATURED LISTING(S) ... -->` through the next `</section>`.
function stripOldFeaturedSection(html) {
  const re = /<!--\s*FEATURED LISTINGS?[\s\S]*?<\/section>\s*/i;
  return html.replace(re, '');
}

function ensureBlock(html, block) {
  if (html.includes(MARK_START) && html.includes(MARK_END)) {
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
    return html.replace(re, block);
  }
  // First-run: remove any old manual featured-listing block, then inject before LISTINGS CTA.
  let cleaned = stripOldFeaturedSection(html);
  const ctaMarker = /<!--\s*LISTINGS CTA\s*-->/i;
  if (ctaMarker.test(cleaned)) {
    return cleaned.replace(ctaMarker, `${block}\n\n<!-- LISTINGS CTA -->`);
  }
  // Fall back: insert before footer
  return cleaned.replace(/<footer/, `${block}\n\n<footer`);
}

function main() {
  const listings = JSON.parse(fs.readFileSync(path.join(ROOT, 'listings.json'), 'utf8')).listings
    .filter(l => ['active', 'contract'].includes(String(l.status || '').toLowerCase()))
    .filter(l => !l.hideOnAreaPages);

  // Sort: active before contract, then larger acreage first
  listings.sort((a, b) => {
    const sa = a.status === 'contract' ? 1 : 0;
    const sb = b.status === 'contract' ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return (Number(b.acreage) || 0) - (Number(a.acreage) || 0);
  });

  const files = fs.readdirSync(ROOT).filter(f => /^areas-.+\.html$/.test(f) && f !== 'areas-we-serve.html');

  const report = [];
  for (const file of files) {
    const fileSlug = file.replace(/^areas-/, '').replace(/\.html$/, '');
    const matched = listings.filter(l => {
      const citySlug = slug(l.city);
      const countySlug = slug(l.county);
      return fileSlug === citySlug || fileSlug === countySlug;
    });

    const filePath = path.join(ROOT, file);
    const before = fs.readFileSync(filePath, 'utf8');

    const hasMarkers = before.includes(MARK_START) && before.includes(MARK_END);
    const hasManualBlock = /<!--\s*FEATURED LISTINGS?\b/i.test(before);

    // Skip pages with no matches AND no prior content to manage.
    if (!matched.length && !hasMarkers && !hasManualBlock) {
      report.push({ file, fileSlug, matched: [], changed: false, skipped: true });
      continue;
    }

    const block = buildBlock(matched, fileSlug);
    const after = ensureBlock(before, block);

    const changed = before !== after;
    if (changed) {
      if (!DRY) fs.writeFileSync(filePath, after, 'utf8');
    }
    report.push({ file, fileSlug, matched: matched.map(l => l.name), changed });
  }

  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Pages scanned: ${report.length}`);
  console.log(`Pages skipped (no match + no prior block): ${report.filter(r => r.skipped).length}`);
  console.log(`Pages changed:  ${report.filter(r => r.changed).length}`);
  console.log(`Pages with at least one listing match: ${report.filter(r => r.matched.length).length}\n`);

  for (const r of report) {
    if (r.skipped) continue;
    const mark = r.changed ? '✱' : ' ';
    const listings = r.matched.length ? r.matched.join(', ') : '(no match — old block cleared)';
    console.log(` ${mark} ${r.file.padEnd(42)} ${listings}`);
  }
  if (DRY) console.log('\nDry run only. Re-run without --dry-run to write changes.');
}

main();
