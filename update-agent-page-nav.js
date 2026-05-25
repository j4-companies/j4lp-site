#!/usr/bin/env node
// One-shot: bring agent page nav (HTML + CSS) in line with the rest of the site.
// Replaces the /* NAV */ CSS block and the topbar+nav+mobile-menu HTML block.
// Idempotent: detects already-updated pages by the presence of
// "dropdown-menu-counties" in the CSS.
//
// Usage:
//   node update-agent-page-nav.js            # apply
//   node update-agent-page-nav.js --dry-run

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const AGENTS_DIR = path.join(__dirname, 'agents');

const NAV_CSS = `/* NAV */
.nav { position: sticky; top: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid rgba(0,0,0,0.08); height: var(--nav-height); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; transition: box-shadow 0.3s; }
.nav.scrolled { box-shadow: 0 2px 20px rgba(0,0,0,0.12); }
.brand-name { font-family: 'Arvo', serif; font-size: 32px; font-weight: 700; color: var(--maroon); letter-spacing: 0.04em; }
.nav-links { display: flex; gap: 32px; align-items: center; }
.nav-links > li { position: relative; }
.nav-links > li > a { font-size: 15px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--black); padding: 8px 0; transition: color 0.2s; display: block; }
.nav-links > li > a:hover, .nav-links > li > a.active { color: var(--maroon); }
.nav-links > li > a::after { content: ''; display: block; height: 2px; background: var(--maroon); width: 0; transition: width 0.25s; margin-top: 2px; }
.nav-links > li > a:hover::after, .nav-links > li > a.active::after { width: 100%; }
.dropdown { position: relative; }
.dropdown-menu { display: none; position: absolute; top: 100%; left: 0; min-width: 220px; background: var(--white); border: 1px solid rgba(0,0,0,0.08); border-top: 3px solid var(--maroon); box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 100; }
.dropdown:hover .dropdown-menu { display: block; }
.dropdown-menu a { display: block; padding: 11px 18px; font-size: 15px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--black); border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s; }
.dropdown-menu a:hover { background: var(--off-white); color: var(--maroon); }
.dropdown-menu-counties { min-width: 260px; }
.dropdown-county-item { position: relative; }
.dropdown-county-item > .dropdown-county-link { display: block; padding: 11px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--black); border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s; }
.dropdown-county-item > .dropdown-county-link:hover { background: var(--off-white); color: var(--maroon); }
.dropdown-county-item:hover > .dropdown-submenu { display: block; }
.dropdown-submenu { display: none; position: absolute; top: -3px; left: 100%; min-width: 240px; background: var(--white); border: 1px solid rgba(0,0,0,0.08); border-top: 3px solid var(--maroon); box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 101; }
.dropdown-submenu a { display: block; padding: 11px 18px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--black); border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s; }
.dropdown-submenu a:hover { background: var(--off-white); color: var(--maroon); }
.dropdown-all-areas { display: block; padding: 11px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--maroon); background: var(--off-white); transition: background 0.15s, color 0.15s; }
.dropdown-all-areas:hover { background: var(--maroon); color: var(--white); }
.nav-cta { background: var(--maroon); color: var(--white) !important; margin-left: 32px; padding: 11px 22px; font-size: 15px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; transition: background 0.2s; }
.nav-cta:hover { background: var(--maroon-mid); }
.nav-cta::after { display: none !important; }
.nav-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }
.nav-hamburger span { display: block; width: 24px; height: 2px; background: var(--black); }
.mobile-menu { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--black); z-index: 2000; flex-direction: column; padding: 40px; overflow-y: auto; }
.mobile-menu.open { display: flex; }
.mobile-close { position: absolute; top: 24px; right: 32px; font-size: 28px; color: var(--white); cursor: pointer; background: none; border: none; }
.mobile-logo { font-family: 'Arvo', serif; font-size: 22px; font-weight: 700; color: var(--white); margin-bottom: 3rem; }
.mobile-logo span { color: var(--white); }
.mobile-links a { display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.75); padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.mobile-contact { margin-top: auto; padding-top: 2rem; font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.8; }
.mobile-contact a { color: var(--white); }
`;

const NAV_HTML = `<div class="topbar">
  <span class="topbar-left">J4 Legacy Properties, LLC · El Campo, Texas · TREC Licensed Brokerage</span>
  <div class="topbar-right">
    <a href="mailto:info@j4lp.com">info@j4lp.com</a>
    <a href="tel:8335435263" class="topbar-phone">833-543-LAND</a>
  </div>
</div>
<nav class="nav" id="mainNav">
  <a href="../index.html" class="nav-logo"><img src="../images/brand/J4LP-Logo-Horizontal-Wide-Transparent.png" alt="J4 Legacy Properties" style="height:90px;width:auto;display:block;"></a>
  <ul class="nav-links">
    <li class="dropdown"><a href="../properties.html">Properties</a>
      <div class="dropdown-menu"><a href="../properties.html">All Listings</a><a href="../properties.html?tab=ranch">Ranch &amp; Farm Land</a><a href="../properties.html?tab=homes">El Campo Area Homes</a><a href="../properties.html?tab=1031">1031-Friendly Land</a><a href="../properties.html?tab=sold">Sold Listings</a></div>
    </li>
    <li class="dropdown"><a href="../buying.html">Buying</a>
      <div class="dropdown-menu"><a href="../buying-legacy.html">Legacy Builders</a><a href="../buying-community.html">Community Connectors</a><a href="../buying-1031.html">1031 Exchangers</a><a href="../off-market.html">Off-Market Access</a></div>
    </li>
    <li><a href="../selling.html">Selling</a></li>
    <li class="dropdown"><a href="../areas-we-serve.html">Areas We Serve</a>
      <div class="dropdown-menu dropdown-menu-counties"><div class="dropdown-county-item"><a href="../areas-austin-county.html" class="dropdown-county-link">Austin County</a><div class="dropdown-submenu"><a href="../areas-bellville.html">Bellville</a><a href="../areas-cat-spring.html">Cat Spring</a><a href="../areas-industry.html">Industry</a><a href="../areas-san-felipe.html">San Felipe</a><a href="../areas-sealy.html">Sealy</a><a href="../areas-wallis.html">Wallis</a></div></div><div class="dropdown-county-item"><a href="../areas-colorado-county.html" class="dropdown-county-link">Colorado County</a><div class="dropdown-submenu"><a href="../areas-altair-sheridan-rock-island.html">Altair, Sheridan &amp; Rock Island</a><a href="../areas-columbus.html">Columbus</a><a href="../areas-eagle-lake.html">Eagle Lake</a><a href="../areas-garwood.html">Garwood</a><a href="../areas-weimar.html">Weimar</a></div></div><div class="dropdown-county-item"><a href="../areas-fort-bend-county.html" class="dropdown-county-link">Fort Bend County</a><div class="dropdown-submenu"><a href="../areas-beasley.html">Beasley</a><a href="../areas-fairchilds-pleak.html">Fairchilds &amp; Pleak</a><a href="../areas-kendleton.html">Kendleton</a><a href="../areas-needville.html">Needville</a><a href="../areas-orchard.html">Orchard</a><a href="../areas-richmond.html">Richmond</a><a href="../areas-rosenberg.html">Rosenberg</a><a href="../areas-sugar-land.html">Sugar Land</a></div></div><div class="dropdown-county-item"><a href="../areas-freestone-county.html" class="dropdown-county-link">Freestone County</a><div class="dropdown-submenu"><a href="../areas-fairfield.html">Fairfield</a><a href="../areas-richland-chambers.html">Richland-Chambers</a><a href="../areas-teague.html">Teague</a><a href="../areas-wortham-streetman.html">Wortham &amp; Streetman</a></div></div><div class="dropdown-county-item"><a href="../areas-lavaca-county.html" class="dropdown-county-link">Lavaca County</a><div class="dropdown-submenu"><a href="../areas-hallettsville.html">Hallettsville</a><a href="../areas-moulton.html">Moulton</a><a href="../areas-shiner.html">Shiner</a><a href="../areas-yoakum.html">Yoakum</a></div></div><div class="dropdown-county-item"><a href="../areas-limestone-county.html" class="dropdown-county-link">Limestone County</a><div class="dropdown-submenu"><a href="../areas-groesbeck.html">Groesbeck</a><a href="../areas-lake-limestone.html">Lake Limestone</a><a href="../areas-mexia.html">Mexia</a><a href="../areas-thornton-tehuacana.html">Thornton &amp; Tehuacana</a></div></div><div class="dropdown-county-item"><a href="../areas-matagorda-county.html" class="dropdown-county-link">Matagorda County</a><div class="dropdown-submenu"><a href="../areas-bay-city.html">Bay City</a><a href="../areas-driftwood-shores.html">Driftwood Shores</a><a href="../areas-markham.html">Markham</a><a href="../areas-matagorda.html">Matagorda</a><a href="../areas-palacios.html">Palacios</a><a href="../areas-sargent.html">Sargent</a><a href="../areas-van-vleck.html">Van Vleck</a><a href="../areas-wadsworth.html">Wadsworth</a></div></div><div class="dropdown-county-item"><a href="../areas-navarro-county.html" class="dropdown-county-link">Navarro County</a><div class="dropdown-submenu"><a href="../areas-blooming-grove.html">Blooming Grove</a><a href="../areas-corsicana.html">Corsicana</a><a href="../areas-frost-rice.html">Frost &amp; Rice</a><a href="../areas-kerens.html">Kerens</a><a href="../areas-navarro-mills.html">Navarro Mills</a><a href="../areas-richland-chambers-navarro.html">Richland-Chambers (Navarro)</a></div></div><div class="dropdown-county-item"><a href="../areas-stephens-county.html" class="dropdown-county-link">Stephens County</a></div><div class="dropdown-county-item"><a href="../areas-victoria-county.html" class="dropdown-county-link">Victoria County</a><div class="dropdown-submenu"><a href="../areas-victoria.html">Victoria</a></div></div><div class="dropdown-county-item"><a href="../areas-wharton-county.html" class="dropdown-county-link">Wharton County</a><div class="dropdown-submenu"><a href="../areas-boling.html">Boling</a><a href="../areas-danevang.html">Danevang</a><a href="../areas-east-bernard.html">East Bernard</a><a href="../areas-el-campo.html">El Campo</a><a href="../areas-hungerford-iago.html">Hungerford &amp; Iago</a><a href="../areas-louise.html">Louise</a><a href="../areas-wharton.html">Wharton</a></div></div><a href="../areas-we-serve.html" class="dropdown-all-areas">All Areas</a></div>
    </li>
    <li class="dropdown"><a href="../our-team.html">Our Team</a>
      <div class="dropdown-menu"><a href="../our-team.html#j4heritage">J4 Heritage Group</a><a href="../our-team.html#join">Join Our Team</a></div>
    </li>
    <li><a href="../resources.html">Resources</a></li>
    <li><a href="../blog.html">Field Notes</a></li><li><a href="../ecosystem.html">J4 Ecosystem</a></li>
  </ul>
  <a href="../contact.html" class="btn nav-cta">Let's Connect</a>
  <div class="nav-hamburger" id="hamburger"><span></span><span></span><span></span></div>
</nav>
<div class="mobile-menu" id="mobileMenu">
  <button class="mobile-close" id="mobileClose">×</button>
  <div class="mobile-logo">J4 Legacy Properties</div>
  <div class="mobile-links">
    <a href="../properties.html">Properties</a><a href="../buying.html">Buying</a><a href="../selling.html">Selling</a>
    <a href="../areas-we-serve.html">Areas We Serve</a><a href="../our-team.html">Our Team</a><a href="../resources.html">Resources</a><a href="../contact.html">Contact</a>
  </div>
  <div class="mobile-contact"><a href="tel:8335435263">833-543-LAND</a><br><a href="mailto:info@j4lp.com">info@j4lp.com</a></div>
</div>`;

function main() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => /\.html$/.test(f));
  const report = [];

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const before = html;

    // Skip already-updated pages (have dropdown-menu-counties)
    if (html.includes('dropdown-menu-counties')) {
      report.push({ file, status: 'already-updated' });
      continue;
    }

    // 1. Bump --nav-height from 80px to 100px to fit 90px image logo
    html = html.replace(/--nav-height:\s*80px;/, '--nav-height: 100px;');

    // 2. Replace the /* NAV */ CSS block (through to /* BREADCRUMB */)
    const cssRe = /\/\*\s*NAV\s*\*\/[\s\S]*?(?=\/\*\s*BREADCRUMB\s*\*\/)/;
    if (!cssRe.test(html)) {
      report.push({ file, status: 'css-marker-not-found' });
      continue;
    }
    html = html.replace(cssRe, NAV_CSS + '\n');

    // 3. Replace the HTML block: topbar + nav + mobile-menu
    //    Boundary: from <div class="topbar"> through end of the </div>
    //    that closes mobile-menu, just before <div class="breadcrumb-bar">
    const htmlRe = /<div class="topbar">[\s\S]*?<\/div>\s*(?=<div class="breadcrumb-bar">)/;
    if (!htmlRe.test(html)) {
      report.push({ file, status: 'html-marker-not-found' });
      continue;
    }
    html = html.replace(htmlRe, NAV_HTML + '\n\n');

    if (html === before) {
      report.push({ file, status: 'no-change' });
      continue;
    }
    if (!DRY) fs.writeFileSync(filePath, html, 'utf8');
    report.push({ file, status: 'updated' });
  }

  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Files scanned: ${report.length}`);
  for (const r of report) {
    console.log(`  ${r.status === 'updated' ? '✱' : ' '} ${r.file.padEnd(28)} ${r.status}`);
  }
  if (DRY) console.log('\nDry run only. Re-run without --dry-run to write changes.');
}

main();
