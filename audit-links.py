#!/usr/bin/env python3
"""
Link audit for the J4LP static site.

Walks every .html file, checks:
  - internal anchor hrefs (relative + absolute www.j4lp.com)
  - <img src=...>
  - <link href=...> for stylesheets/icons
  - <script src=...>
  - <form action=...>

Reports:
  - broken internal links (target file doesn't exist AND no matching _redirects rule)
  - missing image / script / stylesheet files
  - form action targets (so you can eyeball them before launch)
  - a count of external links per host (sanity check)

Run from repo root:  python3 audit-links.py
"""
from __future__ import annotations
import os, re, sys, html
from collections import defaultdict
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_HOSTS = {"j4lp.com", "www.j4lp.com", "j4lp.netlify.app"}

# --- collect every HTML file -------------------------------------------------
html_files: list[str] = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    # skip dotdirs and the images folder
    dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "node_modules"]
    for fn in filenames:
        if fn.endswith(".html"):
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            html_files.append(rel)
html_files.sort()

# --- parse _redirects --------------------------------------------------------
redirect_sources: set[str] = set()
redirects_path = os.path.join(ROOT, "_redirects")
if os.path.exists(redirects_path):
    with open(redirects_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 2:
                src = parts[0].rstrip("/").lower()
                if src.endswith("/*"):
                    redirect_sources.add(src)
                else:
                    redirect_sources.add(src)

def redirect_matches(path: str) -> bool:
    p = path.rstrip("/").lower() or "/"
    if p in redirect_sources:
        return True
    # splat match
    for src in redirect_sources:
        if src.endswith("/*"):
            prefix = src[:-2]
            if p.startswith(prefix):
                return True
    return False

# --- tag/attribute extraction ------------------------------------------------
# Match a whole element so we can inspect rel= and decide if this href is a
# real navigation link or just a hint (preconnect, dns-prefetch, etc.)
A_RE      = re.compile(r'<a\b[^>]*?href\s*=\s*(["\'])(.*?)\1[^>]*>', re.IGNORECASE | re.DOTALL)
IMG_RE    = re.compile(r'<img\b[^>]*?src\s*=\s*(["\'])(.*?)\1[^>]*>',   re.IGNORECASE | re.DOTALL)
SCRIPT_RE = re.compile(r'<script\b[^>]*?src\s*=\s*(["\'])(.*?)\1[^>]*>', re.IGNORECASE | re.DOTALL)
FORM_RE   = re.compile(r'<form\b[^>]*?action\s*=\s*(["\'])(.*?)\1[^>]*>', re.IGNORECASE | re.DOTALL)
IFRAME_RE = re.compile(r'<iframe\b[^>]*?src\s*=\s*(["\'])(.*?)\1[^>]*>',   re.IGNORECASE | re.DOTALL)
LINK_RE   = re.compile(r'<link\b([^>]*?)>',                              re.IGNORECASE | re.DOTALL)
META_OG_RE = re.compile(
    r'<meta\b[^>]*?property\s*=\s*(["\'])(og:url|og:image)\1[^>]*?content\s*=\s*(["\'])(.*?)\3[^>]*>',
    re.IGNORECASE | re.DOTALL,
)
REL_RE  = re.compile(r'\brel\s*=\s*(["\'])([^"\']+)\1', re.IGNORECASE)
HREF_RE = re.compile(r'\bhref\s*=\s*(["\'])(.*?)\1',    re.IGNORECASE)

# rel values that are NOT navigation (we don't audit these)
SKIP_REL = {"preconnect", "dns-prefetch", "preload", "modulepreload",
            "manifest", "mask-icon", "search", "pingback"}
# rel values that ARE worth checking as SEO-impacting URLs
SEO_REL = {"canonical", "alternate", "next", "prev"}

# --- audit -------------------------------------------------------------------
broken_nav: list[tuple[str, str]] = []          # (page, target)  — clickable <a href> broken
broken_seo: list[tuple[str, str, str]] = []     # (page, target, rel) — canonical/og broken
missing_assets: list[tuple[str, str, str]] = [] # (page, asset, kind)
form_actions: list[tuple[str, str]] = []        # (page, action)
iframe_srcs: list[tuple[str, str]] = []         # (page, src) — includes form embeds
external_hosts: dict[str, int] = defaultdict(int)
mailto_tel: dict[str, int] = defaultdict(int)

def file_exists(rel: str) -> bool:
    rel = rel.lstrip("/")
    full = os.path.join(ROOT, rel)
    return os.path.exists(full) and os.path.isfile(full)

def resolve_target(page: str, target: str) -> str:
    """Resolve an href/src against the page path. Returns repo-relative path
    or absolute URL untouched."""
    if target.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "#")):
        return target
    # absolute-from-root
    if target.startswith("/"):
        return target.lstrip("/")
    # relative
    page_dir = os.path.dirname(page)
    joined = os.path.normpath(os.path.join(page_dir, target))
    return joined

def check_internal_target(val: str, page: str, kind: str) -> str | None:
    """Returns None if the target resolves, else a short reason string."""
    if not val:
        return None
    if val.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    bare = val.split("#", 1)[0].split("?", 1)[0]
    parsed = urlparse(bare)
    if parsed.scheme in ("http", "https"):
        if parsed.netloc.lower() not in SITE_HOSTS:
            return None  # external — caller handles tally
        path = parsed.path or "/"
    else:
        # relative or root-relative — resolve
        resolved = resolve_target(page, bare)
        path = "/" + resolved.lstrip("/")

    path_decoded = unquote(path)
    if path_decoded in ("", "/"):
        return None

    check = path_decoded.lstrip("/")
    if file_exists(check):
        return None
    if file_exists(check + ".html"):
        return None
    if file_exists(check.rstrip("/") + "/index.html"):
        return None
    if redirect_matches(path_decoded):
        return None
    return f"no file at {path_decoded} and no _redirects rule"

for page in html_files:
    full = os.path.join(ROOT, page)
    try:
        with open(full, encoding="utf-8", errors="replace") as f:
            text = f.read()
    except Exception as e:
        print(f"!! could not read {page}: {e}", file=sys.stderr)
        continue

    # 1. <a href> — real navigation
    for q, val in A_RE.findall(text):
        val = html.unescape(val).strip()
        if not val:
            continue
        if val.startswith("mailto:"):
            mailto_tel["mailto"] += 1
            continue
        if val.startswith("tel:"):
            mailto_tel["tel"] += 1
            continue
        if val.startswith(("javascript:", "#")):
            continue
        parsed = urlparse(val)
        if parsed.scheme in ("http", "https") and parsed.netloc.lower() not in SITE_HOSTS:
            external_hosts[parsed.netloc.lower()] += 1
            continue
        reason = check_internal_target(val, page, "a")
        if reason:
            broken_nav.append((page, val))

    # 2. <link rel=...> — split into asset (stylesheet/icon) vs SEO (canonical/alternate)
    for attrs in LINK_RE.findall(text):
        rel_m = REL_RE.search(attrs)
        href_m = HREF_RE.search(attrs)
        if not href_m:
            continue
        href = html.unescape(href_m.group(2)).strip()
        rels = set(rel_m.group(2).lower().split()) if rel_m else set()
        if rels & SKIP_REL:
            continue
        if rels & SEO_REL:
            # canonical, alternate, next, prev — SEO-impacting
            parsed = urlparse(href)
            if parsed.scheme in ("http", "https") and parsed.netloc.lower() not in SITE_HOSTS:
                external_hosts[parsed.netloc.lower()] += 1
                continue
            reason = check_internal_target(href, page, "link")
            if reason:
                broken_seo.append((page, href, ",".join(sorted(rels))))
            continue
        # stylesheet, icon, apple-touch-icon, etc. — treat as asset
        parsed = urlparse(href)
        if parsed.scheme in ("http", "https"):
            if parsed.netloc.lower() not in SITE_HOSTS:
                external_hosts[parsed.netloc.lower()] += 1
                continue
            path = parsed.path
        else:
            path = "/" + resolve_target(page, href.split("?")[0].split("#")[0]).lstrip("/")
        check = unquote(path).lstrip("/")
        if check and not file_exists(check):
            missing_assets.append((page, href, "link/" + (",".join(sorted(rels)) or "?")))

    # 3. <img src>
    for q, val in IMG_RE.findall(text):
        val = html.unescape(val).strip()
        if not val or val.startswith("data:"):
            continue
        parsed = urlparse(val)
        if parsed.scheme in ("http", "https"):
            if parsed.netloc.lower() not in SITE_HOSTS:
                external_hosts[parsed.netloc.lower()] += 1
                continue
            path = parsed.path
        else:
            path = "/" + resolve_target(page, val.split("?")[0].split("#")[0]).lstrip("/")
        check = unquote(path).lstrip("/")
        if check and not file_exists(check):
            missing_assets.append((page, val, "img"))

    # 4. <script src>
    for q, val in SCRIPT_RE.findall(text):
        val = html.unescape(val).strip()
        if not val:
            continue
        parsed = urlparse(val)
        if parsed.scheme in ("http", "https"):
            if parsed.netloc.lower() not in SITE_HOSTS:
                external_hosts[parsed.netloc.lower()] += 1
                continue
            path = parsed.path
        else:
            path = "/" + resolve_target(page, val.split("?")[0].split("#")[0]).lstrip("/")
        check = unquote(path).lstrip("/")
        if check and not file_exists(check):
            missing_assets.append((page, val, "script"))

    # 5. <form action>
    for q, val in FORM_RE.findall(text):
        val = html.unescape(val).strip()
        form_actions.append((page, val))

    # 5b. <iframe src> — CML form embeds + map embeds live here
    for q, val in IFRAME_RE.findall(text):
        val = html.unescape(val).strip()
        if val:
            iframe_srcs.append((page, val))

    # 6. <meta property="og:url" content=...> and og:image
    for m in META_OG_RE.finditer(text):
        prop = m.group(2).lower()
        val = html.unescape(m.group(4)).strip()
        if not val:
            continue
        if prop == "og:url":
            reason = check_internal_target(val, page, "meta")
            if reason:
                broken_seo.append((page, val, "og:url"))
        else:  # og:image
            parsed = urlparse(val)
            if parsed.scheme in ("http", "https") and parsed.netloc.lower() in SITE_HOSTS:
                check = unquote(parsed.path).lstrip("/")
                if check and not file_exists(check):
                    missing_assets.append((page, val, "og:image"))

# --- report ------------------------------------------------------------------
def section(title: str):
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)

section(f"SUMMARY  ({len(html_files)} HTML files audited)")
print(f"  broken <a href> nav links     : {len(broken_nav)}")
print(f"  broken canonical/og SEO links : {len(broken_seo)}")
print(f"  missing assets                : {len(missing_assets)}")
print(f"  unique form action targets    : {len(set(a for _, a in form_actions))}")
print(f"  unique external hosts         : {len(external_hosts)}")
print(f"  mailto links                  : {mailto_tel.get('mailto', 0)}")
print(f"  tel links                     : {mailto_tel.get('tel', 0)}")

section("BROKEN <a href> NAV LINKS (clickable, user impact)")
if not broken_nav:
    print("  (none)")
else:
    by_target: dict[str, list[str]] = defaultdict(list)
    for page, target in broken_nav:
        by_target[target].append(page)
    for target in sorted(by_target):
        pages = by_target[target]
        print(f"  → {target}")
        for p in sorted(set(pages))[:5]:
            print(f"      from {p}")
        if len(set(pages)) > 5:
            print(f"      ...and {len(set(pages)) - 5} more pages")

section("BROKEN CANONICAL / og:url (SEO impact, search engines follow these)")
if not broken_seo:
    print("  (none)")
else:
    by_target: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for page, target, rel in broken_seo:
        by_target[target].append((page, rel))
    for target in sorted(by_target):
        entries = by_target[target]
        print(f"  → {target}")
        for p, rel in entries[:3]:
            print(f"      from {p} (rel={rel})")
        if len(entries) > 3:
            print(f"      ...and {len(entries) - 3} more pages")

section("MISSING ASSETS (img/css/js/font/pdf files not on disk)")
if not missing_assets:
    print("  (none)")
else:
    by_asset: dict[str, list[str]] = defaultdict(list)
    for page, asset, tag in missing_assets:
        by_asset[asset].append(page)
    for asset in sorted(by_asset):
        pages = by_asset[asset]
        print(f"  → {asset}")
        for p in sorted(set(pages))[:3]:
            print(f"      from {p}")
        if len(set(pages)) > 3:
            print(f"      ...and {len(set(pages)) - 3} more pages")

section("FORM ACTION TARGETS (native <form>)")
if not form_actions:
    print("  (none — forms on this site are embedded as iframes; see next section)")
else:
    seen = set()
    for page, action in form_actions:
        if action in seen:
            continue
        seen.add(action)
        print(f"  {action}")
        print(f"      e.g. on {page}")

section("IFRAME EMBEDS (CML form embeds, Google Maps, etc. — verify these resolve)")
by_src: dict[str, list[str]] = defaultdict(list)
for page, src in iframe_srcs:
    by_src[src].append(page)
for src in sorted(by_src):
    pages = sorted(set(by_src[src]))
    print(f"  {src}")
    print(f"      on {len(pages)} page(s): {pages[0]}" + (
        f" (+ {len(pages)-1} more)" if len(pages) > 1 else ""))

section("EXTERNAL HOSTS (sanity check — anything unexpected?)")
for host, n in sorted(external_hosts.items(), key=lambda x: -x[1]):
    print(f"  {n:>4}  {host}")

print()
print("done.")
