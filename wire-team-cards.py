#!/usr/bin/env python3
"""Wire the team cards on our-team.html to link to individual agent bio pages."""
import re

# slug, first name (used in 'Contact X' overlay), display name on card
AGENTS = [
    ("cuatro-strack", "cuatro", "Cuatro Strack"),
    ("stephanie-strack", "stephanie", "Stephanie Strack"),
    ("harleigh-strack", "harleigh", "Harleigh Strack"),
    ("mason-abshire", "mason", "Mason Abshire"),
    ("kayla-strack", "kayla", "Kayla Strack"),
    ("rozanna-roach", "rozanna", "Rozanna Roach"),
    ("julia-velazquez", "julia", "Julia Velazquez"),
    ("sioux-smith", "sioux", "Sioux Smith"),
    ("alexa-emmons", "alexa", "Alexa Emmons"),
]

path = "our-team.html"
with open(path, "r") as f:
    html = f.read()

for slug, first, name in AGENTS:
    # 1) Photo hover overlay: "Contact {Name}" → "Read {Name}'s Bio"
    old_overlay = f'<div class="team-photo-contact"><a href="contact.html?agent={first}">Contact {name.split()[0]}</a></div>'
    new_overlay = f'<div class="team-photo-contact"><a href="agents/{slug}.html">Read {name.split()[0]}\'s Bio</a></div>'
    if old_overlay in html:
        html = html.replace(old_overlay, new_overlay)
        print(f"overlay: wired {name}")
    else:
        print(f"overlay: NO MATCH for {name}")

    # 2) Wrap agent name H3 in a link
    old_h3 = f'<h3 class="arvo">{name}</h3>'
    new_h3 = f'<h3 class="arvo"><a href="agents/{slug}.html" style="color:inherit;border-bottom:none">{name}</a></h3>'
    if old_h3 in html:
        html = html.replace(old_h3, new_h3, 1)
        print(f"h3: linked {name}")
    else:
        print(f"h3: NO MATCH for {name}")

# 3) Add "Read Full Bio" link after each .team-contact block (inside .team-body)
# Pattern: insert before the closing </div></div> of the team-body
# Simpler: add a "Read Full Bio →" link inside team-contact, after TREC license link
# Use regex to inject after the TREC license-search link for each agent
for slug, first, name in AGENTS:
    pattern = re.compile(
        r'(<a href="https://www\.trec\.texas\.gov/agency/license-holder-search"[^>]*>TREC #\d+</a>)\s*(</div>\s*</div>\s*</div>)',
        re.MULTILINE
    )
    # We can't easily target a specific agent with a generic pattern. Instead, use a placement marker:
    # Append "Read Full Bio →" link right after the TREC link, scoped per-agent by searching from the
    # agent's comment marker forward.
    # We'll do this in a second pass below.

# Second pass: for each agent, find their comment marker and inject a bio link after the closest TREC link
for slug, first, name in AGENTS:
    marker = f"<!-- {name} -->"
    idx = html.find(marker)
    if idx == -1:
        # Try last-name only or alt spelling
        alt = f"<!-- {name.split()[0]} {name.split()[1]} -->"
        idx = html.find(alt)
    if idx == -1:
        print(f"comment: NO MATCH for {name}")
        continue
    # From that index, find the next TREC #XXXXXX</a> and insert bio link right after it
    trec_match = re.search(r'TREC #\d+</a>', html[idx:])
    if not trec_match:
        print(f"trec: NO MATCH after {name}")
        continue
    insert_pos = idx + trec_match.end()
    bio_link = f'\n          <a href="agents/{slug}.html" style="color:var(--maroon);font-weight:700;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin-top:6px;display:inline-block;border-bottom:1px solid var(--maroon)">Read Full Bio →</a>'
    # Avoid double-insertion if already wired
    snippet_check = f'href="agents/{slug}.html"'
    # The overlay link uses the same slug, so check more specifically for the body link
    if 'Read Full Bio' in html[insert_pos:insert_pos + 400]:
        print(f"bio link: already present for {name}")
        continue
    html = html[:insert_pos] + bio_link + html[insert_pos:]
    print(f"bio link: injected for {name}")

with open(path, "w") as f:
    f.write(html)
print("done")
