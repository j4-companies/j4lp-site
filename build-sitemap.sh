#!/usr/bin/env bash
# Regenerate sitemap.xml from canonical URLs in every HTML page.
# Run from the repo root: bash build-sitemap.sh
# Falls back to a sensible URL guess if a page has no <link rel="canonical">.

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
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

  for f in *.html properties/*.html agents/*.html; do
    [ -f "$f" ] || continue

    # Pull canonical from the page (grep may fail if missing; that's fine)
    url=$(grep -m1 -oE 'rel="canonical" href="[^"]*"' "$f" 2>/dev/null | sed 's/rel="canonical" href="//;s/"$//' || true)

    # Fallbacks if a page is missing canonical
    if [ -z "$url" ]; then
      case "$f" in
        index.html)      url="$SITE/" ;;
        *)               url="$SITE/$f" ;;
      esac
    fi

    # Use file mtime as lastmod (YYYY-MM-DD)
    lastmod=$(date -r "$f" +%Y-%m-%d)

    read prio freq < <(prio_for "$url")

    echo "  <url>"
    echo "    <loc>$url</loc>"
    echo "    <lastmod>$lastmod</lastmod>"
    echo "    <changefreq>$freq</changefreq>"
    echo "    <priority>$prio</priority>"
    echo "  </url>"
  done

  echo '</urlset>'
} > "$OUT"

count=$(grep -c '<url>' "$OUT")
echo "Wrote $OUT — $count URLs"
