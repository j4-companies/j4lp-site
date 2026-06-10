#!/usr/bin/env bash
# Notify search engines (Bing, DuckDuckGo, Yandex, etc.) of new/updated pages via IndexNow.
# Google does not use IndexNow — it discovers via sitemap.xml + GSC Request Indexing.
# Run from the repo root after deploy: bash ping-indexnow.sh /blog-some-post.html [/another-page.html ...]
# With no arguments, pings every URL in sitemap.xml (full resubmit).

set -euo pipefail
cd "$(dirname "$0")"

# Netlify's primary domain is the apex (www.j4lp.com 301s to j4lp.com),
# so pings must use apex URLs — IndexNow rejects URLs that redirect.
SITE=https://j4lp.com
HOST=j4lp.com
KEY=90e49cb5a61c1bcc958917b6c5b3b711
ENDPOINT=https://api.indexnow.org/indexnow

# Collect URLs: from args, or from sitemap.xml if none given
urls=()
if [ "$#" -gt 0 ]; then
  for p in "$@"; do
    case "$p" in
      http*) urls+=("$p") ;;
      /*)    urls+=("${SITE}${p}") ;;
      *)     urls+=("${SITE}/${p}") ;;
    esac
  done
else
  # BSD sed has no \? in basic regex — use -E. Sitemap lists www URLs; rewrite to apex.
  while IFS= read -r u; do
    urls+=("$u")
  done < <(grep -o '<loc>[^<]*</loc>' sitemap.xml | sed -E 's/<\/?loc>//g' | sed 's|https://www\.j4lp\.com|https://j4lp.com|')
fi

if [ "${#urls[@]}" -eq 0 ]; then
  echo "No URLs to ping." >&2
  exit 1
fi

# Build JSON payload
url_json=$(printf '"%s",' "${urls[@]}")
url_json="[${url_json%,}]"

payload=$(cat <<EOF
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "${SITE}/${KEY}.txt",
  "urlList": ${url_json}
}
EOF
)

status=$(curl -s -o /tmp/indexnow-response.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$payload")

if [ "$status" = "200" ] || [ "$status" = "202" ]; then
  echo "IndexNow accepted ${#urls[@]} URL(s) (HTTP $status)."
else
  echo "IndexNow ping failed (HTTP $status):" >&2
  cat /tmp/indexnow-response.txt >&2
  exit 1
fi
