# Fix: `build-properties.js` was stale and silently reverted shipped work

## The problem

`build-properties.js` generates one HTML page per listing in `properties/` from
`listings.json`, and its own console output tells you to "run it, commit, push."
But the script had fallen behind the deployed site. Four site-wide changes had
been shipped by hand-editing the generated pages (or by other tools) **without
the script being updated to match**:

| Shipped change | Commit |
|---|---|
| Full TREC bar (license + Broker of Record) | `c769b02` |
| A2P compliance: phone-collecting forms removed, chat widget added | `1b03edc`, `88354ab` |
| Google Maps embeds + `hasMap` schema | `9742034` |
| Mailing address spelled out + maps directions link in footer | `e01260b` |

Plus an earlier voice-rule QC sweep (`e051e3c`) that stripped em-dashes from the
generated HTML, and a "gold purge" that set the brand to maroon/black/white only.

Because none of that was in the script, running `node build-properties.js`
**reverted all of it across every property page** (~73 lines per page).

## The root cause

The single source of truth (`build-properties.js` + `listings.json`) had drifted
from the deployed output. Every hand-edit to a generated page widened the gap.
Running the generator was unsafe. The fix is to make the generator reproduce the
shipped state, so running it is safe and the output is idempotent.

## What changed in `build-properties.js`

1. **Brand colors.** `--gold` / `--gold-light` are now `#ffffff`, and every
   `var(--gold)` reference is `var(--white)`. No tan. (J4 brand = maroon/black/white.)
2. **Em-dashes.** New `stripDashes()` runs over the whole rendered page,
   converting ` — ` to `, ` (voice rule). Hyphen-minus in compounds like
   "1,977-acre" is left alone.
3. **Maps.** New `buildMap()` emits the `<section class="map-embed">` Google Maps
   iframe (only when lat/lng present), and the schema now includes `hasMap`
   right after `"@type"`. Supports an optional `mapNote` per listing.
4. **A2P form.** The phone-collecting CML iframe in the sidebar is replaced by the
   `form-cta-block` (call / text / email).
5. **TREC bar.** Full version: license No., Broker of Record (Cuatro Strack,
   REALTOR®, #655595), full address, email, site.
6. **Footer.** Adds IABS + Consumer Protection Notice + Equal Housing links, and
   the Contact address is a Google Maps directions link.
7. **Chat widget.** LeadConnector loader added before `</body>`.
8. **Related listings.** Sold listings are now included (was filtered out), to
   match the deployed pages.
9. **Status banner.** The script no longer emits the sold / under-contract banner,
   because **no deployed page has one** (it had been removed). If you want it back,
   that is a one-line re-add — flag it and it goes in its own change.
10. **Data-driven sidebar label.** New optional `contactCardLabel` field; defaults
    to "Inquire About This Property." Set for hwy-60 so its "Sold, Ask About
    Similar Land" label is preserved instead of reverting.
11. **Ampersand escaping** in the visible property address (valid HTML).

## Acceptance: the 4 shipped changes are reproduced everywhere

Verified across all 11 generated pages:

- 0 tan gold colors, 0 leftover CML phone forms, 0 short TREC bars, 0 em-dashes
- 11/11 have: chat widget, full TREC bar, map-embed, `hasMap`, footer IABS link,
  footer maps directions link, `form-cta-block`

The build is **idempotent** — running `node build-properties.js` twice produces
byte-identical output. After this PR is merged, running the generator no longer
reverts anything.

## Residual diffs vs. the previously committed pages (and why)

Of the 10 pre-existing pages, **4 regenerate byte-identical**
(danevang-investment, el-campo-mid-century, horse-farm-property,
mexia-commercial-property). The other 6 differ, but **none of the differences are
reverts of the four shipped changes** — they are reconciliations of pages that
had been hand-edited or added without rebuilding (the same drift this fix
eliminates):

- **richmond-cotton-farm, hilago-ranch, east-bernard-homestead, j4-homestead**
  (related section only): now include **FM 1300 Farm Tract** in "You Might Also
  Like." FM 1300 was added to `listings.json` earlier without rebuilding the other
  pages, so they never picked it up. Regenerating correctly surfaces the new
  active ranch listing.
- **hwy-60-frontage**: (a) em-dashes → commas (voice rule — the committed page
  still had "SOLD —"); (b) title, keywords, hero alt text, and tag chips
  reconciled to `listings.json` (the committed page had hand-edits that had
  diverged from the source data); (c) FM 1300 added to related.
- **limo-station-victoria**: description and tagline reconciled to `listings.json`
  (the listing was re-priced to $450K without rebuilding), and the price-class
  whitespace normalized to match the rest of the site.

### fm-1300-farm-tract (the new page — expected to differ)

The committed fm-1300 page was hand-built, not script-generated (different
indentation, trailing newline, and a "Photos coming soon" placeholder even though
`images/listings/fm-1300-farm-tract/hero.jpg` exists). Regenerating is strictly
better: it renders the real hero photo, populates `og:image` and the schema
`image`, uses the full source address, and preserves the hand-added map-note
paragraph via the new `mapNote` field. Remaining differences are cosmetic
(whitespace, trailing newline) from the hand-built original.

## Note

This PR commits the regenerated pages so the repo is internally consistent with
`listings.json` and the build stays idempotent. Review the content deltas above —
especially hwy-60's title/tag changes — and say the word if any deployed wording
should be adjusted at the `listings.json` source instead.
