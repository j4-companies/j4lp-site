#!/usr/bin/env node
// Injects/updates featured-listing strips on areas-*.html and agents/*.html
// based on listings.json. Idempotent: replaces content between
// <!-- AUTO-LISTINGS:START --> and <!-- AUTO-LISTINGS:END -->.
// On first run for a page, also strips any pre-existing manual featured-listing section.
//
// Matching rules (canonical: see memory feedback_listing_page_propagation_rule):
//   - areas-{slug}.html: matches when filename slug == listing city slug OR county slug
//     OR any slug in the optional listing.extraAreas array (for tracts that sit between
//     two towns and should feature on both town pages, e.g. a property tied to El Campo
//     that should also surface on the Louise page).
//   - agents/{slug}.html: matches when filename slug == any agent slug parsed from
//     listing.agent (split on "&" or ",")
//   - Listings flagged hideOnAreaPages are excluded from both
//
// Usage:
//   node inject-featured-listings.js            # apply changes
//   node inject-featured-listings.js --dry-run  # print plan, do not write

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const ROOT = __dirname;
const AGENTS_DIR = path.join(ROOT, 'agents');
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

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Parse "Sioux Smith & Harleigh Strack" → ["sioux-smith", "harleigh-strack"]
function listingAgentSlugs(l) {
  if (!l.agent) return [];
  return String(l.agent)
    .split(/\s*[&,]\s*/)
    .map(s => slug(s))
    .filter(Boolean);
}

function buildStrip(l, pathPrefix) {
  const acreage = fmtAcres(l.acreage);
  const acresPart = acreage ? ` — ${acreage}± acres` : '';
  const status = (l.status || '').toLowerCase();
  const statusBadge = status === 'contract' ? ' · Under Contract'
                    : status === 'sold'     ? ' · SOLD'
                    : '';
  const label = `J4LP Featured Listing · ${l.county || l.city}${statusBadge}`;
  const tagline = (l.tagline || l.description || '').replace(/\s+/g, ' ').trim();
  const tagShort = tagline.length > 260 ? tagline.slice(0, 257).replace(/[\s,]+\S*$/, '') + '...' : tagline;
  const href = `${pathPrefix}properties/${l.slug}.html`;
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

function buildBlock(listings, ctx) {
  const { pageLabel, pathPrefix = '', pageType = 'area', agentDisplayName = '' } = ctx;
  if (!listings.length) {
    return `${MARK_START}\n<!-- No active listings match ${pageLabel}. Auto-generated, do not edit by hand. -->\n${MARK_END}`;
  }
  // Section label + heading copy: vary by page type.
  let label, headingOne, headingMany, sub;
  if (pageType === 'agent') {
    label = listings.length > 1 ? "Current Listings" : "Current Listing";
    headingOne = `Currently listed by ${agentDisplayName}.`;
    headingMany = `${listings.length} active J4LP listings by ${agentDisplayName}.`;
    sub = `Active, under-contract, and recently sold J4 Legacy Properties listings tied to this agent.`;
  } else {
    label = listings.length > 1 ? "J4LP On the Market Now" : "J4LP On the Market";
    headingOne = "Listed by J4LP in this area.";
    headingMany = `${listings.length} J4LP listings in this area.`;
    sub = "Active, under-contract, and recently sold J4 Legacy Properties listings tied to this area.";
  }
  const header = `<!-- FEATURED LISTINGS · auto-generated from listings.json by inject-featured-listings.js — do not edit by hand -->
<section style="background:var(--white); padding:48px 80px 0;">
  <div style="font-size:10px; font-weight:700; letter-spacing:0.25em; text-transform:uppercase; color:var(--maroon); margin-bottom:12px;">${escapeHtml(label)}</div>
  <h2 class="arvo" style="font-family:'Arvo',serif; font-size:clamp(22px,2.5vw,30px); color:var(--black); margin-bottom:8px;">${escapeHtml(listings.length === 1 ? headingOne : headingMany)}</h2>
  <p style="font-family:'Lora',serif; font-style:italic; font-size:15px; color:var(--dark-gray); max-width:620px; margin-bottom:16px;">${escapeHtml(sub)}</p>`;
  const strips = listings.map(l => buildStrip(l, pathPrefix)).join('\n');
  const footer = `\n</section>`;
  return `${MARK_START}\n${header}\n${strips}${footer}\n${MARK_END}`;
}

function stripOldFeaturedSection(html) {
  const re = /<!--\s*FEATURED LISTINGS?[\s\S]*?<\/section>\s*/i;
  return html.replace(re, '');
}

function ensureBlock(html, block, insertBefore) {
  // Strip any existing AUTO-LISTINGS block (with leading whitespace and trailing
  // newlines) so the script can re-place it at the currently preferred location.
  // Also strip any pre-marker manual featured-listings section.
  let cleaned = html;
  if (cleaned.includes(MARK_START) && cleaned.includes(MARK_END)) {
    const re = new RegExp(`\\s*${MARK_START}[\\s\\S]*?${MARK_END}\\s*`);
    cleaned = cleaned.replace(re, '\n\n');
  }
  cleaned = stripOldFeaturedSection(cleaned);

  for (const marker of insertBefore) {
    if (marker instanceof RegExp ? marker.test(cleaned) : cleaned.includes(marker)) {
      const re = marker instanceof RegExp ? marker : new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const match = cleaned.match(re);
      if (match) {
        return cleaned.replace(re, `${block}\n\n${match[0]}`);
      }
    }
  }
  // Fall back: insert before footer
  return cleaned.replace(/<footer/, `${block}\n\n<footer`);
}

// Display name for an agent slug, by looking up any listing's `agent` field.
function agentDisplayNameFor(slugWanted, listings) {
  for (const l of listings) {
    const parts = String(l.agent || '').split(/\s*[&,]\s*/);
    for (const p of parts) {
      if (slug(p) === slugWanted) return p.trim();
    }
  }
  // Fallback: title-case the slug
  return slugWanted.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
}

function processFile(filePath, displayName, matched, ctx, report) {
  const before = fs.readFileSync(filePath, 'utf8');
  const hasMarkers = before.includes(MARK_START) && before.includes(MARK_END);
  const hasManualBlock = /<!--\s*FEATURED LISTINGS?\b/i.test(before);

  if (!matched.length && !hasMarkers && !hasManualBlock) {
    report.push({ file: displayName, matched: [], changed: false, skipped: true });
    return;
  }
  const block = buildBlock(matched, ctx);
  const after = ensureBlock(before, block, ctx.insertBefore || []);
  const changed = before !== after;
  if (changed && !DRY) fs.writeFileSync(filePath, after, 'utf8');
  report.push({ file: displayName, matched: matched.map(l => l.name), changed });
}

function main() {
  const listings = JSON.parse(fs.readFileSync(path.join(ROOT, 'listings.json'), 'utf8')).listings
    .filter(l => ['active', 'contract', 'sold'].includes(String(l.status || '').toLowerCase()))
    .filter(l => !l.hideOnAreaPages);

  // Sort order: active first, contract middle, sold last (recently-sold = social proof, not lead).
  const STATUS_RANK = { active: 0, contract: 1, sold: 2 };
  listings.sort((a, b) => {
    const ra = STATUS_RANK[String(a.status || '').toLowerCase()] ?? 9;
    const rb = STATUS_RANK[String(b.status || '').toLowerCase()] ?? 9;
    if (ra !== rb) return ra - rb;
    return (Number(b.acreage) || 0) - (Number(a.acreage) || 0);
  });

  const report = [];

  // ---- Area pages ----
  const areaFiles = fs.readdirSync(ROOT)
    .filter(f => /^areas-.+\.html$/.test(f) && f !== 'areas-we-serve.html');
  for (const file of areaFiles) {
    const fileSlug = file.replace(/^areas-/, '').replace(/\.html$/, '');
    const matched = listings.filter(l => {
      const extra = (Array.isArray(l.extraAreas) ? l.extraAreas : []).map(slug);
      return fileSlug === slug(l.city) || fileSlug === slug(l.county) || extra.includes(fileSlug);
    });
    processFile(
      path.join(ROOT, file),
      file,
      matched,
      {
        pageLabel: fileSlug,
        pathPrefix: '',
        pageType: 'area',
        // Prefer placement near the TOP of the page (right after stats, before
        // descriptive intro). Fallback ladder for older / different layouts.
        insertBefore: [
          /<!--\s*INTRO\s*-->/i,
          /<!--\s*LOCAL COLOR\s*-->/i,
          /<!--\s*LISTINGS CTA\s*-->/i,
        ],
      },
      report
    );
  }

  // ---- Agent pages ----
  if (fs.existsSync(AGENTS_DIR)) {
    const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => /\.html$/.test(f));
    for (const file of agentFiles) {
      const fileSlug = file.replace(/\.html$/, '');
      const matched = listings.filter(l => listingAgentSlugs(l).includes(fileSlug));
      const displayName = agentDisplayNameFor(fileSlug, listings);
      processFile(
        path.join(AGENTS_DIR, file),
        `agents/${file}`,
        matched,
        {
          pageLabel: fileSlug,
          pathPrefix: '../',
          pageType: 'agent',
          agentDisplayName: displayName,
          insertBefore: [/<section\s+class="agent-cta"/i, /<footer/i],
        },
        report
      );
    }
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
