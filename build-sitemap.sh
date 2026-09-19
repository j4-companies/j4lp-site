#!/usr/bin/env bash
# Regenerate sitemap.xml from canonical URLs in every HTML page.
# Run from the repo root: bash build-sitemap.sh
# Falls back to a sensible URL guess if a page has no <link rel="canonical">.
#
# KNOWN GAP (found 2026-09-19, not yet fixed): this script's <url> blocks never
# include an <image:image> entry, and blog posts get 0.6 priority from the
# */blog* rule below. The J4-Exec-Dashboard blog publisher's own updateSitemap()
# appends each new post with an image entry AND priority 0.7. Running a full
# rebuild here would silently strip every blog post's image sitemap entry and
# downgrade its priority — do not run this as a full rebuild against a sitemap
# that already has dashboard-published posts in it until that gap is closed.
# This run fixed the /property-intake/-style silent-drop bug only; it did not
# touch the committed sitemap.xml.

set -euo pipefail
cd "$(dirname "$0")"

OUT=sitemap.xml
SITE=https://www.j4lp.com

# Priority + changefreq by section
prio_for() {
  case "$1" in
    "/")                       echo "1.0 weekly" ;;
    *areas-we-serve)           echo "0.9 monthly" ;;
    *areas-we-serve/*/*)       echo "0.7 monthly" ;;
    *areas-we-serve/*)         echo "0.8 monthly" ;;
    */properties.html)         echo "0.9 weekly" ;;
    */properties/*)            echo "0.8 weekly" ;;
    */agents/*)                echo "0.7 monthly" ;;
    */our-team)                echo "0.7 monthly" ;;
    */buying*|*/selling*|*/off-market*) echo "0.8 monthly" ;;
    */contact*|*/ecosystem*|*/resources*|*/blog*) echo "0.6 monthly" ;;
    *)                         echo "0.5 monthly" ;;
  esac
}

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'

  # Every .html file in the repo, not three hand-picked globs. The old
  # `*.html properties/*.html agents/*.html` list silently dropped any page
  # that lived in its own directory (property-intake/index.html, missing
  # from the sitemap since it shipped 2026-08-26 with no error or warning —
  # the exact silent-drift failure this rule exists to prevent) and would
  # do the same to the next one-off directory page nobody remembers to add
  # here by hand.
  while IFS= read -r -d '' rawf; do
    f="${rawf#./}"

    # Skip unpublished drafts. A page marked noindex either is not deployed or
    # is not ready to rank, so listing it hands Google a 404 or an unfinished
    # page. Mark a work-in-progress page with:
    #   <meta name="robots" content="noindex">
    # and it stays out of the sitemap until that line is removed.
    if grep -qiE '<meta[^>]+name="robots"[^>]+content="[^"]*noindex' "$f" 2>/dev/null; then
      echo "  skipped (noindex): $f" >&2
      continue
    fi

    # Pull canonical from the page (grep may fail if missing; that's fine)
    url=$(grep -m1 -oE 'rel="canonical" href="[^"]*"' "$f" 2>/dev/null | sed 's/rel="canonical" href="//;s/"$//' || true)

    # Fallbacks if a page is missing canonical
    if [ -z "$url" ]; then
      case "$f" in
        index.html)      url="$SITE/" ;;
        *)               url="$SITE/$f" ;;
      esac
    fi

    # Last real commit date, not file mtime. Every "fetch origin, branch fresh"
    # checkout (the standing rule for this repo) resets every file's mtime to the
    # checkout time, which used to rewrite every <lastmod> to today regardless of
    # whether the page actually changed. Falls back to mtime for an uncommitted file.
    lastmod=$(git log -1 --format=%cs -- "$f" 2>/dev/null)
    [ -n "$lastmod" ] || lastmod=$(date -r "$f" +%Y-%m-%d)

    read prio freq < <(prio_for "$url")

    echo "  <url>"
    echo "    <loc>$url</loc>"
    echo "    <lastmod>$lastmod</lastmod>"
    echo "    <changefreq>$freq</changefreq>"
    echo "    <priority>$prio</priority>"
    echo "  </url>"
  done < <(find . -name "*.html" -not -path "./.git/*" -print0)

  echo '</urlset>'
} > "$OUT"

count=$(grep -c '<url>' "$OUT")
echo "Wrote $OUT — $count URLs"

# Regression guard: every indexable page on disk must have made it in. A future one-off
# directory page (or a future exclusion added above) fails loud here instead of shipping
# a sitemap that is quietly missing a page again.
missing=0
while IFS= read -r -d '' rawf; do
  f="${rawf#./}"
  grep -qiE '<meta[^>]+name="robots"[^>]+content="[^"]*noindex' "$f" 2>/dev/null && continue
  url=$(grep -m1 -oE 'rel="canonical" href="[^"]*"' "$f" 2>/dev/null | sed 's/rel="canonical" href="//;s/"$//' || true)
  [ -z "$url" ] && { [ "$f" = "index.html" ] && url="$SITE/" || url="$SITE/$f"; }
  if ! grep -qF "<loc>$url</loc>" "$OUT"; then
    echo "MISSING FROM SITEMAP: $f ($url)" >&2
    missing=1
  fi
done < <(find . -name "*.html" -not -path "./.git/*" -print0)
[ "$missing" = "0" ] || { echo "build-sitemap.sh: refusing to leave a page out of the sitemap silently." >&2; exit 1; }
