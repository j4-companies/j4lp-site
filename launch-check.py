#!/usr/bin/env python3
"""Pre-deploy launch check for j4lp.com.

Run from the repo root:  python3 launch-check.py
Exits non-zero if any FAIL is found, so it can gate a deploy.

Each check exists because the corresponding failure has actually happened on
this site and went unnoticed, in one case for months. Silent breakage is the
failure mode these guard against.
"""
import glob, json, os, re, sys, html as htmlmod
from collections import Counter

FAILS, WARNS = [], []
def fail(c, m): FAILS.append((c, m))
def warn(c, m): WARNS.append((c, m))

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PAGES = sorted(glob.glob("*.html") + glob.glob("properties/*.html") + glob.glob("agents/*.html"))

def read(p):
    return open(p, encoding="utf-8").read()

def is_noindex(h):
    return re.search(r'<meta[^>]+name="robots"[^>]+content="[^"]*noindex', h, re.I) is not None

def body_of(h):
    return h[h.find("</style>"):] if "</style>" in h else h

def text(s):
    s = re.sub(r'<span class="faq-toggle">.*?</span>', "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", htmlmod.unescape(s)).strip().rstrip("+").strip()

# ---------------------------------------------------------------- 1. metadata
for p in PAGES:
    h = read(p)
    if is_noindex(h):
        continue
    t = re.search(r"<title>(.*?)</title>", h, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', h, re.S)
    # Measure what a search engine renders, not the source. "&amp;" is one
    # character to Google but five in the markup.
    if not t:
        fail("meta", f"{p}: no <title>")
    else:
        n = len(htmlmod.unescape(t.group(1)).strip())
        if n > 60:
            fail("meta", f"{p}: title {n} chars (max 60)")
    if not d:
        fail("meta", f"{p}: no meta description")
    else:
        n = len(htmlmod.unescape(d.group(1)).strip())
        if n > 155:
            fail("meta", f"{p}: description {n} chars (max 155)")
    n_h1 = len(re.findall(r"<h1[\s>]", h, re.I))
    if n_h1 != 1:
        fail("meta", f"{p}: {n_h1} <h1> tags (need exactly 1)")
    if not re.search(r'rel="canonical"', h):
        fail("meta", f"{p}: no canonical tag")

# ------------------------------------------------------------- 2. structured data
for p in PAGES:
    h = read(p)
    for i, b in enumerate(re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)):
        try:
            json.loads(b)
        except Exception as e:
            fail("schema", f"{p} block {i}: invalid JSON-LD ({str(e)[:60]})")

# FAQ schema must match what a visitor actually sees, or Google flags it.
for p in PAGES:
    h = read(p)
    visible = len(re.findall(r'class="faq-(?:question|q)"', body_of(h)))
    schema = 0
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            d = json.loads(b)
        except Exception:
            continue
        for node in (d if isinstance(d, list) else [d]):
            if isinstance(node, dict) and node.get("@type") == "FAQPage":
                schema += len(node.get("mainEntity", []))
    if visible and schema != visible:
        fail("faq", f"{p}: {visible} FAQs on page but {schema} in schema")

# ---------------------------------------------------- 3. canonical routing
# A canonical that 301s instead of serving 200 sends Google contradictory
# signals. This broke on 11 area pages and went unnoticed.
redirects = open("_redirects").read().splitlines() if os.path.exists("_redirects") else []
rules = {}
for line in redirects:
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split()
    if len(parts) >= 3:
        rules.setdefault(parts[0], []).append((parts[1], parts[2].rstrip("!")))

for p in PAGES:
    h = read(p)
    if is_noindex(h):
        continue
    m = re.search(r'rel="canonical" href="https://www\.j4lp\.com(/[^"]*)"', h)
    if not m:
        continue
    path = m.group(1)
    if path in ("/", "") or path.lstrip("/") == p:
        continue                       # served directly by the file itself
    if path.lstrip("/") + ".html" == p:
        continue                       # Netlify pretty-URL, serves the file
    for dest, code in rules.get(path, []):
        if code == "200":
            break
        if code.startswith("30"):
            fail("routing", f"{p}: canonical {path} is a {code} to {dest}, must be a 200 rewrite")
            break

# ------------------------------------------------------------ 4. sitemap
if os.path.exists("sitemap.xml"):
    sm = read("sitemap.xml")
    locs = re.findall(r"<loc>(.*?)</loc>", sm)
    if len(locs) != len(set(locs)):
        dupe = [u for u, n in Counter(locs).items() if n > 1]
        fail("sitemap", f"duplicate URLs: {dupe[:5]}")
    for p in PAGES:
        h = read(p)
        m = re.search(r'rel="canonical" href="(https://www\.j4lp\.com[^"]*)"', h)
        if not m:
            continue
        if is_noindex(h):
            if m.group(1) in locs:
                fail("sitemap", f"{p} is noindex but is listed in sitemap.xml")
        elif m.group(1) not in locs:
            warn("sitemap", f"{p} canonical not in sitemap.xml ({m.group(1)})")
else:
    fail("sitemap", "sitemap.xml missing")

# ------------------------------------------------- 5. voice + placeholders
for p in PAGES:
    h = read(p)
    # Comments are not reader-facing, so they don't count against voice rules.
    b = re.sub(r"<!--.*?-->", "", body_of(h), flags=re.S)
    if "—" in b:
        fail("voice", f"{p}: {b.count(chr(8212))} em dash(es) in page content")
    for marker in ("TODO", "PLACEHOLDER", "Lorem ipsum", "TBD", "XXX"):
        if marker in b:
            (fail if not is_noindex(h) else warn)("content", f"{p}: contains '{marker}'")

# Homepage Featured Properties is labeled "Current Listings." A sold listing
# here is a promotion error even when the property page itself is accurate.
if os.path.exists("index.html") and os.path.exists("listings.json"):
    home = read("index.html")
    featured = re.search(
        r"<!-- FEATURED LISTINGS -->(.*?)<!-- OFF-MARKET STRIP -->",
        home,
        re.S,
    )
    with open("listings.json", encoding="utf-8") as f:
        listing_data = json.load(f)
    statuses = {
        item.get("slug"): str(item.get("status", "")).lower()
        for item in listing_data.get("listings", [])
    }
    if not featured:
        fail("featured", "index.html: Featured Properties section not found")
    else:
        slugs = re.findall(r'href="/properties/([^"/?#]+)', featured.group(1))
        for slug in slugs:
            status = statuses.get(slug)
            if status == "sold":
                fail("featured", f"index.html: sold listing '{slug}' appears in Featured Properties")
            elif status is None:
                fail("featured", f"index.html: featured listing '{slug}' is missing from listings.json")

# ------------------------------------------------------- 6. NAP + licensure
NAP = {
    "brokerage": "J4 Legacy Properties, LLC",
    "license": "9011917",
    "broker": "655595",
    "phone": "833-543-LAND",
}
for p in PAGES:
    h = read(p)
    for k, v in NAP.items():
        if v not in h:
            fail("nap", f"{p}: missing {k} ({v}) in the TREC/footer block")

# The office address must be written exactly as Google's Business Profile has it.
# NAP consistency is literal: "3063 SH 71 S" and "3063 State Hwy 71" are the same
# place to a human and two different strings to a search engine, and a mismatch
# between the site and the GBP is what splits local ranking signal. Google's
# record (CID 9892196149404181987) reads "3063 State Hwy 71", so that is canonical.
# A2P compliance: the GHL/LeadConnector chat widget must never sit on a page
# that collects a phone number. Carriers treat the combination as an unvetted
# SMS opt-in path and it puts the messaging registration at risk. Today no page
# violates this, which is exactly when to add the check: the failure mode is
# someone adding a phone field to a page that already has the widget, months
# from now, with nothing watching.
for p in PAGES:
    h = read(p)
    has_widget = "leadconnectorhq" in h or "communitymarketleader.com/widget" in h
    has_phone = bool(re.search(r'type=["\']tel["\']|name=["\']phone["\']', h, re.I))
    if has_widget and has_phone:
        fail("a2p", f"{p}: GHL/CML widget on a page that collects a phone number "
                    f"(A2P violation, see the AEO playbook compliance guardrails)")

OFFICE_CANON = "3063 State Hwy 71"
OFFICE_BAD = ["3063 SH 71 S", "3063 SH 71S", "3063 State Highway 71 S", "3063 S SH 71"]
for p in PAGES:
    h = read(p)
    for bad in OFFICE_BAD:
        if bad in h:
            fail("nap", f"{p}: office address written as '{bad}'; "
                        f"must match the Google Business Profile exactly ('{OFFICE_CANON}')")
    if "Equal Housing" not in h:
        fail("nap", f"{p}: missing Equal Housing Opportunity statement")

# The BUSINESS address must be identical everywhere, since Google merges these
# into a single entity. A listing's own address is a different thing and is
# skipped, so only RealEstateAgent / LocalBusiness / Organization nodes count.
BIZ_TYPES = {"RealEstateAgent", "LocalBusiness", "Organization", "RealEstateOrganization"}

def business_addresses(node, found):
    if isinstance(node, list):
        for n in node:
            business_addresses(n, found)
    elif isinstance(node, dict):
        t = node.get("@type")
        types = set(t if isinstance(t, list) else [t])
        if types & BIZ_TYPES:
            a = node.get("address")
            for a in (a if isinstance(a, list) else [a]):
                if isinstance(a, dict) and a.get("streetAddress"):
                    found.add(a["streetAddress"])
        for v in node.values():
            business_addresses(v, found)
    return found

addr = {}
for p in PAGES:
    found = set()
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', read(p), re.S):
        try:
            business_addresses(json.loads(b), found)
        except Exception:
            continue
    for a in found:
        addr.setdefault(a, []).append(p)
if len(addr) > 1:
    detail = "; ".join(f"{a!r} on {len(v)} page(s)" for a, v in sorted(addr.items(), key=lambda x: -len(x[1])))
    fail("nap", f"conflicting business streetAddress in schema: {detail}")

# ------------------------------------------------------------ 7. images
for p in PAGES:
    for tag in re.findall(r"<img\b[^>]*>", read(p), re.S):
        if not re.search(r'\balt\s*=', tag):
            fail("images", f"{p}: <img> with no alt attribute")
            break

# ---------------------------------------------------------------- report
print(f"Checked {len(PAGES)} pages.\n")
for label, items in (("FAIL", FAILS), ("WARN", WARNS)):
    if not items:
        continue
    print(f"{label} ({len(items)})")
    by_cat = {}
    for c, m in items:
        by_cat.setdefault(c, []).append(m)
    for c, msgs in sorted(by_cat.items()):
        print(f"  [{c}] {len(msgs)}")
        for m in msgs[:12]:
            print(f"      {m}")
        if len(msgs) > 12:
            print(f"      ... and {len(msgs)-12} more")
    print()

if FAILS:
    print(f"LAUNCH CHECK FAILED, {len(FAILS)} blocking issue(s).")
    sys.exit(1)
print("LAUNCH CHECK PASSED" + (f", {len(WARNS)} warning(s)." if WARNS else " clean."))
